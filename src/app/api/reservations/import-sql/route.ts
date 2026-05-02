import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { generateConfirmationCode } from '@/lib/auth';

// ── Auth helper (same pattern as expenses/import-csv) ──
async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

// ── Parse SQL INSERT VALUES into array of string arrays ──
function parseInsertRows(sql: string, tableName: string): string[][] {
  const rows: string[][] = [];
  const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `INSERT\\s+INTO\\s+(?:\\\`${escaped}\\\`|\\b${escaped}\\b)[^V]*VALUES\\s*([^;]+);`,
    'gi'
  );

  const match = sql.match(regex);
  if (!match) return rows;

  for (const insertBlock of match) {
    const valuesStr = insertBlock.substring(insertBlock.toUpperCase().indexOf('VALUES') + 6);
    const rowStrings = splitValueRows(valuesStr);
    for (const rowStr of rowStrings) {
      const cleaned = rowStr.replace(/^\s*\(/, '').replace(/\)\s*$/, '').trim();
      if (!cleaned) continue;
      const fields = parseRowFields(cleaned);
      rows.push(fields);
    }
  }
  return rows;
}

// Split value rows by '),(' handling quoted strings
function splitValueRows(str: string): string[] {
  const rows: string[] = [];
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let current = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      current += ch;
      if (ch === stringChar && str[i - 1] !== '\\') {
        inString = false;
      }
    } else if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
      if (depth === 0) {
        rows.push(current.trim());
        current = '';
      }
    } else if (ch === ',' && depth === 0) {
      continue;
    } else {
      current += ch;
    }
  }

  if (current.trim()) rows.push(current.trim());
  return rows;
}

// Parse individual fields within a row — closing quote NOT added to value
function parseRowFields(row: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];

    if (inString) {
      if (ch === stringChar) {
        if (row[i + 1] === stringChar) {
          current += ch;
          i++;
        } else {
          inString = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === "'" || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ── Date parser: auto-detect DD-MM-YYYY vs YYYY-MM-DD ──
function parseFlexDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const s = dateStr.trim().replace(/\s+/g, ' ');

  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(s + 'T12:00:00');
    if (!isNaN(d.getTime())) return d;
  }

  const dmyMatch = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(`${year}-${month}-${day}T12:00:00`);
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  return null;
}

// Clean a SQL string value (remove surrounding quotes, unescape)
function cleanStr(val: string): string {
  if (!val) return '';
  val = val.trim();
  let prev = '';
  while (prev !== val) {
    prev = val;
    if ((val.startsWith("'") && val.endsWith("'")) ||
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith('`') && val.endsWith('`'))) {
      val = val.slice(1, -1).trim();
    }
  }
  val = val.replace(/^['"`]+/, '').replace(/['"`]+$/, '');
  val = val.replace(/\\'/g, "'").replace(/''/g, "'");
  val = val.replace(/\\"/g, '"').replace(/""/g, '"');
  val = val.replace(/\\n/g, '').replace(/\n/g, '').trim();
  return val;
}

function cleanNum(val: string): number {
  if (!val || val === 'NULL' || val === 'null') return 0;
  return parseFloat(val.replace(/'/g, '')) || 0;
}

function cleanInt(val: string): number {
  if (!val || val === 'NULL' || val === 'null') return 0;
  return parseInt(val.replace(/'/g, ''), 10) || 0;
}

// Helper: send a JSON line over the stream
function sendEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// ── POST: Import reservations from SQL file (developer only) ──
// Uses Server-Sent Events (SSE) so the frontend gets real-time progress
// and never times out waiting for the final response.
export async function POST(request: NextRequest) {
  let user: { id: string; name: string; role: string } | null = null;
  let sqlText = '';
  let validationError = '';

  try {
    user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'developer') {
      return NextResponse.json({ error: 'Access denied. Developer role required.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('sqlFile') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No SQL file provided' }, { status: 400 });
    }
    if (!file.name.endsWith('.sql')) {
      return NextResponse.json({ error: 'Only SQL files are accepted' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
    }
    sqlText = await file.text();
  } catch (error: unknown) {
    validationError = error instanceof Error ? error.message : 'Request parsing failed';
  }

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 500 });
  }

  // ── Start SSE streaming ──
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const roomTypeRows = parseInsertRows(sqlText, 'room_type');
        const roomRows = parseInsertRows(sqlText, 'room');
        const customerRows = parseInsertRows(sqlText, 'customer');
        const bookingRows = parseInsertRows(sqlText, 'booking');

        if (bookingRows.length === 0) {
          sendEvent(controller, { type: 'error', error: 'No booking records found in the SQL file.' });
          controller.close();
          return;
        }
        if (customerRows.length === 0) {
          sendEvent(controller, { type: 'error', error: 'No customer records found in the SQL file.' });
          controller.close();
          return;
        }

        sendEvent(controller, { type: 'progress', phase: 'parsing', message: `Parsed ${bookingRows.length} bookings, ${customerRows.length} customers, ${roomRows.length} rooms` });

        // ── Step 1: Build room type info from legacy SQL ──
        const legacyRoomTypes: Record<number, { name: string; price: number; maxPerson: number }> = {};
        for (const row of roomTypeRows) {
          const id = cleanInt(row[0]);
          const name = cleanStr(row[1]);
          const price = cleanNum(row[2]);
          const maxPerson = cleanInt(row[3]);
          if (id && name) legacyRoomTypes[id] = { name, price, maxPerson };
        }

        // ── Step 2: Ensure room types exist in DB ──
        sendEvent(controller, { type: 'progress', phase: 'room_types', message: 'Checking room types...' });
        const dbRoomTypes = await db.roomType.findMany();
        const roomTypeNameToId: Record<string, string> = {};
        for (const rt of dbRoomTypes) {
          roomTypeNameToId[rt.name.toLowerCase()] = rt.id;
        }

        let roomTypesCreated = 0;
        for (const [legacyId, lt] of Object.entries(legacyRoomTypes)) {
          const key = lt.name.toLowerCase();
          if (!roomTypeNameToId[key]) {
            const created = await db.roomType.create({
              data: {
                name: lt.name,
                baseRate: lt.price,
                maxOccupancy: lt.maxPerson || 2,
                description: `Imported from legacy system (type #${legacyId})`,
                isActive: true,
              },
            });
            roomTypeNameToId[key] = created.id;
            roomTypesCreated++;
          }
        }

        // ── Step 3: Build legacy room map ──
        const legacyRooms: Record<number, { roomNo: string; typeId: number; deleted: boolean }> = {};
        for (const row of roomRows) {
          const id = cleanInt(row[0]);
          const typeId = cleanInt(row[1]);
          const roomNo = cleanStr(row[2]);
          const deleted = cleanInt(row[6]) === 1;
          if (!id || !roomNo) continue;
          if (!deleted || !legacyRooms[id]) {
            legacyRooms[id] = { roomNo, typeId, deleted };
          }
        }

        // ── Step 4: Ensure rooms exist in DB ──
        sendEvent(controller, { type: 'progress', phase: 'rooms', message: 'Checking rooms...' });
        const dbRooms = await db.room.findMany({ include: { roomType: true } });
        const roomNumberToDbId: Record<string, string> = {};
        const roomNumberToRate: Record<string, number> = {};
        for (const rm of dbRooms) {
          roomNumberToDbId[rm.roomNumber] = rm.id;
          roomNumberToRate[rm.roomNumber] = rm.roomType.baseRate;
        }

        let roomsCreated = 0;
        for (const [legacyId, lr] of Object.entries(legacyRooms)) {
          if (lr.deleted) continue;
          if (roomNumberToDbId[lr.roomNo]) continue;
          const lt = legacyRoomTypes[lr.typeId];
          const typeId = lt ? roomTypeNameToId[lt.name.toLowerCase()] : null;
          if (!typeId) continue;
          const created = await db.room.create({
            data: {
              roomNumber: lr.roomNo,
              floor: 1,
              roomTypeId: typeId,
              status: 'available',
              notes: 'Imported from legacy system',
            },
          });
          roomNumberToDbId[lr.roomNo] = created.id;
          roomNumberToRate[lr.roomNo] = lt.price;
          roomsCreated++;
        }

        sendEvent(controller, { type: 'progress', phase: 'setup_done', message: `Setup complete: ${roomTypesCreated} room types, ${roomsCreated} rooms created. Starting bookings...` });

        // ── Step 5: Build customer lookup ──
        const customerMap: Record<number, { name: string; phone: string; email: string; address: string }> = {};
        for (const row of customerRows) {
          const id = cleanInt(row[0]);
          const name = cleanStr(row[1]);
          const phone = cleanStr(row[2]);
          const email = cleanStr(row[3]);
          const address = cleanStr(row[6]);
          if (id) customerMap[id] = { name, phone, email, address };
        }

        // ── Step 6: Import bookings (no transactions — safe for pgbouncer) ──
        let imported = 0;
        let skipped = 0;
        let duplicates = 0;
        let guestsCreated = 0;
        let guestsMatched = 0;
        const errors: string[] = [];

        const phoneToGuestId: Map<string, string> = new Map();
        const existingGuests = await db.guest.findMany({
          select: { id: true, phone: true },
        });
        for (const g of existingGuests) {
          phoneToGuestId.set(g.phone, g.id);
        }

        const existingImported = await db.reservation.findMany({
          where: { source: 'imported' },
          select: { notes: true },
        });
        const importedBookingNums = new Set<string>();
        for (const r of existingImported) {
          const match = r.notes?.match(/Booking #(\d+)/);
          if (match) importedBookingNums.add(match[1]);
        }

        const usedCodes = new Set<string>();
        function newCode() {
          let code = generateConfirmationCode();
          let attempts = 0;
          while (usedCodes.has(code) && attempts < 50) {
            code = generateConfirmationCode();
            attempts++;
          }
          usedCodes.add(code);
          return code;
        }

        for (let i = 0; i < bookingRows.length; i++) {
          const row = bookingRows[i];
          try {
            const oldCustomerId = cleanInt(row[1]);
            const oldRoomId = cleanInt(row[2]);
            const checkInStr = cleanStr(row[4]);
            const checkOutStr = cleanStr(row[5]);
            const totalPrice = cleanNum(row[6]);
            const discount = cleanNum(row[7]);
            const paymentStatus = cleanInt(row[9]);
            const bookingNum = cleanInt(row[0]);

            if (importedBookingNums.has(String(bookingNum))) {
              duplicates++;
              continue;
            }

            const legacyRoom = legacyRooms[oldRoomId];
            if (!legacyRoom || legacyRoom.deleted) {
              skipped++;
              errors.push(`Booking ${i + 1}: Room ID ${oldRoomId} not found or deleted`);
              continue;
            }

            const dbRoomId = roomNumberToDbId[legacyRoom.roomNo];
            if (!dbRoomId) {
              skipped++;
              errors.push(`Booking ${i + 1}: Room ${legacyRoom.roomNo} not in DB`);
              continue;
            }

            const checkIn = parseFlexDate(checkInStr);
            const checkOut = parseFlexDate(checkOutStr);
            if (!checkIn || !checkOut) {
              skipped++;
              errors.push(`Booking ${i + 1}: Invalid dates (${checkInStr} / ${checkOutStr})`);
              continue;
            }

            const netPaid = totalPrice - discount;
            if (netPaid <= 0) {
              skipped++;
              errors.push(`Booking ${i + 1}: Zero net amount`);
              continue;
            }

            const nightsMs = checkOut.getTime() - checkIn.getTime();
            const nights = Math.max(1, Math.ceil(nightsMs / (1000 * 60 * 60 * 24)));
            const roomRate = Math.round((netPaid / nights) * 100) / 100;

            const oldCustomer = customerMap[oldCustomerId];
            if (!oldCustomer) {
              skipped++;
              errors.push(`Booking ${i + 1}: Customer ${oldCustomerId} not found`);
              continue;
            }

            const phone = oldCustomer.phone.replace(/[^0-9]/g, '');
            if (phone.length < 5) {
              skipped++;
              errors.push(`Booking ${i + 1}: Invalid phone`);
              continue;
            }

            let guestId = phoneToGuestId.get(phone);

            if (!guestId) {
              const nameParts = oldCustomer.name.trim().split(/\s+/);
              const firstName = nameParts[0] || 'Unknown';
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

              const newGuest = await db.guest.create({
                data: {
                  firstName,
                  lastName,
                  phone,
                  email: oldCustomer.email && !['default@gmail.com', 'default@gmail'].includes(oldCustomer.email) ? oldCustomer.email : null,
                  address: oldCustomer.address && !['NOT ASSIGN', 'NOT ASSIGN '].includes(oldCustomer.address) ? oldCustomer.address : null,
                  totalStays: 1,
                  totalSpent: netPaid,
                  country: 'Nigeria',
                },
              });
              guestId = newGuest.id;
              phoneToGuestId.set(phone, guestId);
              guestsCreated++;
            } else {
              await db.guest.update({
                where: { id: guestId },
                data: {
                  totalStays: { increment: 1 },
                  totalSpent: { increment: netPaid },
                },
              });
              guestsMatched++;
            }

            const code = newCode();
            const reservation = await db.reservation.create({
              data: {
                confirmationCode: code,
                guestId,
                roomId: dbRoomId,
                checkIn,
                checkOut,
                status: 'checked_out',
                source: 'imported',
                adults: 1,
                roomRate,
                totalAmount: netPaid,
                paidAmount: netPaid,
                notes: `Imported from legacy system (Booking #${bookingNum})`,
                checkedOutAt: checkOut,
              },
            });

            const bill = await db.bill.create({
              data: {
                reservationId: reservation.id,
                guestId,
                roomCharges: totalPrice,
                discountAmount: discount,
                totalAmount: netPaid,
                paidAmount: netPaid,
                balanceAmount: 0,
                status: paymentStatus === 1 ? 'paid' : 'open',
                paymentMethod: 'cash',
                paidAt: paymentStatus === 1 ? checkOut : null,
              },
            });

            await db.payment.create({
              data: {
                billId: bill.id,
                amount: netPaid,
                paymentMethod: 'cash',
                notes: `Legacy import - Booking #${bookingNum}`,
              },
            });

            imported++;
            importedBookingNums.add(String(bookingNum));

            if (imported % 10 === 0) {
              sendEvent(controller, { type: 'progress', phase: 'importing', imported, skipped, total: bookingRows.length, message: `${imported}/${bookingRows.length} imported...` });
            }
          } catch (err: unknown) {
            skipped++;
            const msg = err instanceof Error ? err.message : 'Unknown error';
            errors.push(`Booking ${i + 1}: ${msg}`);
          }
        }

        const totalRevenue = bookingRows.reduce((sum, row) => {
          return sum + cleanNum(row[6]) - cleanNum(row[7]);
        }, 0);

        sendEvent(controller, {
          type: 'done',
          success: true,
          imported,
          skipped,
          duplicates,
          total: bookingRows.length,
          guestsCreated,
          guestsMatched,
          roomTypesCreated,
          roomsCreated,
          summary: { totalRevenue, bookingCount: imported },
          errors: errors.slice(0, 20),
        });

        controller.close();
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to import SQL';
        sendEvent(controller, { type: 'error', error: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}