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

// Parse individual fields — closing quote NOT added to value
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
          // Escaped quote: '' in SQL — keep ONE quote as literal
          current += ch;
          i++;
        } else {
          // Closing quote delimiter — do NOT add to value
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

// ── POST: Import reservations from SQL file (developer only) ──
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate();
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

    const sqlText = await file.text();

    // ── Parse tables from SQL ──
    const roomTypeRows = parseInsertRows(sqlText, 'room_type');
    const roomRows = parseInsertRows(sqlText, 'room');
    const customerRows = parseInsertRows(sqlText, 'customer');
    const bookingRows = parseInsertRows(sqlText, 'booking');

    if (bookingRows.length === 0) {
      return NextResponse.json({ error: 'No booking records found in the SQL file.' }, { status: 400 });
    }

    if (customerRows.length === 0) {
      return NextResponse.json({ error: 'No customer records found in the SQL file.' }, { status: 400 });
    }

    console.log(`Parsed: ${roomTypeRows.length} room_types, ${roomRows.length} rooms, ${customerRows.length} customers, ${bookingRows.length} bookings`);

    // ── Step 1: Build room type info from legacy SQL ──
    // room_type: (room_type_id, room_type_name, price, max_person)
    const legacyRoomTypes: Record<number, { name: string; price: number; maxPerson: number }> = {};
    for (const row of roomTypeRows) {
      const id = cleanInt(row[0]);
      const name = cleanStr(row[1]);
      const price = cleanNum(row[2]);
      const maxPerson = cleanInt(row[3]);
      if (id && name) legacyRoomTypes[id] = { name, price, maxPerson };
    }

    // ── Step 2: Ensure room types exist in DB (create if missing) ──
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
        console.log(`Created room type: ${lt.name} (₦${lt.price})`);
      }
    }

    // ── Step 3: Build legacy room map (skip deleted) ──
    // room: (room_id, room_type_id, room_no, status, check_in_status, check_out_status, deleteStatus)
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

    // ── Step 4: Ensure rooms exist in DB (create if missing) ──
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

      if (!typeId) {
        console.log(`Skipping room ${lr.roomNo}: no matching room type for legacy type #${lr.typeId}`);
        continue;
      }

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
      console.log(`Created room: ${lr.roomNo} (type: ${lt?.name})`);
    }

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

    // ── Step 6: Import bookings ──
    let imported = 0;
    let skipped = 0;
    let guestsCreated = 0;
    let guestsMatched = 0;
    const errors: string[] = [];

    // Track guest dedup by phone
    const phoneToGuestId: Map<string, string> = new Map();

    // Pre-load existing guests for dedup
    const existingGuests = await db.guest.findMany({
      select: { id: true, phone: true },
    });
    for (const g of existingGuests) {
      phoneToGuestId.set(g.phone, g.id);
    }

    // Track confirmation codes to avoid collisions
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

    // ── Process bookings in batches ──
    const BATCH_SIZE = 20;
    let processedCount = 0;

    for (let batchStart = 0; batchStart < bookingRows.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, bookingRows.length);

      // guestId → { stays: number, spent: number }
      const guestIncrements: Map<string, { stays: number; spent: number }> = new Map();

      const batchOps: Array<{
        guestId: string;
        dbRoomId: string;
        checkIn: Date;
        checkOut: Date;
        netPaid: number;
        roomRate: number;
        totalPrice: number;
        discount: number;
        paymentStatus: number;
        bookingNum: number;
        isNewGuest: boolean;
      }> = [];

      // Phase 1: Validate and prepare all bookings in this batch
      for (let i = batchStart; i < batchEnd; i++) {
        const row = bookingRows[i];
        try {
          const oldCustomerId = cleanInt(row[1]);
          const oldRoomId = cleanInt(row[2]);
          const checkInStr = cleanStr(row[4]);
          const checkOutStr = cleanStr(row[5]);
          const totalPrice = cleanNum(row[6]);
          const discount = cleanNum(row[7]);
          const paymentStatus = cleanInt(row[9]);

          // Find room from legacy data
          const legacyRoom = legacyRooms[oldRoomId];
          if (!legacyRoom || legacyRoom.deleted) {
            skipped++;
            errors.push(`Booking ${i + 1}: Room ID ${oldRoomId} not found or deleted`);
            continue;
          }

          // Find room in DB
          const dbRoomId = roomNumberToDbId[legacyRoom.roomNo];
          if (!dbRoomId) {
            skipped++;
            errors.push(`Booking ${i + 1}: Room ${legacyRoom.roomNo} could not be created in DB`);
            continue;
          }

          // Parse dates
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
            errors.push(`Booking ${i + 1}: Zero net amount (total: ${totalPrice}, discount: ${discount})`);
            continue;
          }

          const nightsMs = checkOut.getTime() - checkIn.getTime();
          const nights = Math.max(1, Math.ceil(nightsMs / (1000 * 60 * 60 * 24)));
          const roomRate = Math.round((netPaid / nights) * 100) / 100;

          // Find customer
          const oldCustomer = customerMap[oldCustomerId];
          if (!oldCustomer) {
            skipped++;
            errors.push(`Booking ${i + 1}: Customer ${oldCustomerId} not found`);
            continue;
          }

          // Clean phone: extract digits only
          const phone = oldCustomer.phone.replace(/[^0-9]/g, '');
          if (phone.length < 5) {
            skipped++;
            errors.push(`Booking ${i + 1}: Invalid phone ${phone}`);
            continue;
          }

          // Find or create guest
          let guestId = phoneToGuestId.get(phone);
          let isNewGuest = false;

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
            isNewGuest = true;
          } else {
            const prev = guestIncrements.get(guestId) || { stays: 0, spent: 0 };
            guestIncrements.set(guestId, { stays: prev.stays + 1, spent: prev.spent + netPaid });
            guestsMatched++;
          }

          batchOps.push({
            guestId, dbRoomId, checkIn, checkOut,
            netPaid, roomRate, totalPrice, discount,
            paymentStatus, bookingNum: cleanInt(row[0]),
            isNewGuest,
          });
        } catch (err: unknown) {
          skipped++;
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Booking ${i + 1}: ${msg}`);
        }
      }

      // Phase 2: Execute all DB writes in a single transaction for this batch
      if (batchOps.length > 0) {
        await db.$transaction(async (tx) => {
          // Batch update existing guest totals
          for (const [gId, inc] of guestIncrements) {
            await tx.guest.update({
              where: { id: gId },
              data: {
                totalStays: { increment: inc.stays },
                totalSpent: { increment: inc.spent },
              },
            });
          }

          // Create reservations + bills + payments
          for (const op of batchOps) {
            const code = newCode();

            const reservation = await tx.reservation.create({
              data: {
                confirmationCode: code,
                guestId: op.guestId,
                roomId: op.dbRoomId,
                checkIn: op.checkIn,
                checkOut: op.checkOut,
                status: 'checked_out',
                source: 'imported',
                adults: 1,
                roomRate: op.roomRate,
                totalAmount: op.netPaid,
                paidAmount: op.netPaid,
                notes: `Imported from legacy system (Booking #${op.bookingNum})`,
                checkedOutAt: op.checkOut,
              },
            });

            const bill = await tx.bill.create({
              data: {
                reservationId: reservation.id,
                guestId: op.guestId,
                roomCharges: op.totalPrice,
                discountAmount: op.discount,
                totalAmount: op.netPaid,
                paidAmount: op.netPaid,
                balanceAmount: 0,
                status: op.paymentStatus === 1 ? 'paid' : 'open',
                paymentMethod: 'cash',
                paidAt: op.paymentStatus === 1 ? op.checkOut : null,
              },
            });

            await tx.payment.create({
              data: {
                billId: bill.id,
                amount: op.netPaid,
                paymentMethod: 'cash',
                notes: `Legacy import - Booking #${op.bookingNum}`,
              },
            });

            imported++;
          }
        }, { timeout: 120000 });
      }

      processedCount = batchEnd;
      console.log(`Import progress: ${processedCount}/${bookingRows.length} processed, ${imported} imported`);
    }

    const totalRevenue = bookingRows.reduce((sum, row) => {
      return sum + cleanNum(row[6]) - cleanNum(row[7]);
    }, 0);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: bookingRows.length,
      guestsCreated,
      guestsMatched,
      roomTypesCreated,
      roomsCreated,
      summary: {
        totalRevenue,
        bookingCount: imported,
      },
      errors: errors.slice(0, 20),
    });
  } catch (error: unknown) {
    console.error('SQL Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import SQL' },
      { status: 500 }
    );
  }
}