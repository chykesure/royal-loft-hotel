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
    `INSERT\\s+INTO\\s+\\\`${escaped}\\\`[^V]*VALUES\\s*([^;]+);`,
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

function parseRowFields(row: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];

    if (inString) {
      current += ch;
      if (ch === stringChar) {
        if (row[i + 1] === stringChar) {
          current += ch;
          i++;
        } else {
          inString = false;
        }
      }
    } else if (ch === "'" || ch === '"') {
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

function cleanStr(val: string): string {
  if (!val) return '';
  val = val.trim();
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1);
  }
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

    // ── Build lookup maps ──
    const roomTypePrices: Record<number, number> = {};
    for (const row of roomTypeRows) {
      const id = cleanInt(row[0]);
      const price = cleanNum(row[2]);
      roomTypePrices[id] = price;
    }

    const dbRooms = await db.room.findMany({ include: { roomType: true } });
    const roomNumberToDbId: Record<string, string> = {};
    for (const rm of dbRooms) {
      roomNumberToDbId[rm.roomNumber] = rm.id;
    }

    const customerMap: Record<number, { name: string; phone: string; email: string; address: string }> = {};
    for (const row of customerRows) {
      const id = cleanInt(row[0]);
      customerMap[id] = { name: cleanStr(row[1]), phone: cleanStr(row[2]), email: cleanStr(row[3]), address: cleanStr(row[6]) };
    }

    // ── Import bookings ──
    let imported = 0;
    let skipped = 0;
    let guestsCreated = 0;
    let guestsMatched = 0;
    const errors: string[] = [];

    const phoneToGuestId: Map<string, string> = new Map();
    const existingGuests = await db.guest.findMany({ select: { id: true, phone: true } });
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

    // ── Process in batches of 20 with transactions ──
    const BATCH_SIZE = 20;

    for (let batchStart = 0; batchStart < bookingRows.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, bookingRows.length);

      const guestIncrements: Map<string, { stays: number; spent: number }> = new Map();
      const batchOps: Array<{
        guestId: string; dbRoomId: string; checkIn: Date; checkOut: Date;
        netPaid: number; roomRate: number; totalPrice: number; discount: number;
        paymentStatus: number; bookingNum: number;
      }> = [];

      // Phase 1: Validate and prepare
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

          const oldRoom = roomRows.find(r => cleanInt(r[0]) === oldRoomId);
          if (!oldRoom) { skipped++; errors.push(`Booking ${i + 1}: Room ID ${oldRoomId} not found`); continue; }
          const oldRoomNo = cleanStr(oldRoom[2]);
          const dbRoomId = roomNumberToDbId[oldRoomNo];
          if (!dbRoomId) { skipped++; errors.push(`Booking ${i + 1}: Room ${oldRoomNo} not in DB`); continue; }

          const checkIn = parseFlexDate(checkInStr);
          const checkOut = parseFlexDate(checkOutStr);
          if (!checkIn || !checkOut) { skipped++; errors.push(`Booking ${i + 1}: Invalid dates`); continue; }

          const netPaid = totalPrice - discount;
          if (netPaid <= 0) { skipped++; errors.push(`Booking ${i + 1}: Zero net amount`); continue; }

          const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
          const roomRate = Math.round((netPaid / nights) * 100) / 100;

          const oldCustomer = customerMap[oldCustomerId];
          if (!oldCustomer) { skipped++; errors.push(`Booking ${i + 1}: Customer ${oldCustomerId} not found`); continue; }

          const phone = oldCustomer.phone.replace(/[^0-9]/g, '');
          if (phone.length < 5) { skipped++; errors.push(`Booking ${i + 1}: Invalid phone`); continue; }

          let guestId = phoneToGuestId.get(phone);

          if (!guestId) {
            const nameParts = oldCustomer.name.trim().split(/\s+/);
            const newGuest = await db.guest.create({
              data: {
                firstName: nameParts[0] || 'Unknown',
                lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
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
            const prev = guestIncrements.get(guestId) || { stays: 0, spent: 0 };
            guestIncrements.set(guestId, { stays: prev.stays + 1, spent: prev.spent + netPaid });
            guestsMatched++;
          }

          batchOps.push({ guestId, dbRoomId, checkIn, checkOut, netPaid, roomRate, totalPrice, discount, paymentStatus, bookingNum: cleanInt(row[0]) });
        } catch (err: unknown) {
          skipped++;
          errors.push(`Booking ${i + 1}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }

      // Phase 2: Execute in a single transaction
      if (batchOps.length > 0) {
        await db.$transaction(async (tx) => {
          for (const [gId, inc] of guestIncrements) {
            await tx.guest.update({
              where: { id: gId },
              data: { totalStays: { increment: inc.stays }, totalSpent: { increment: inc.spent } },
            });
          }

          for (const op of batchOps) {
            const reservation = await tx.reservation.create({
              data: {
                confirmationCode: newCode(),
                guestId: op.guestId, roomId: op.dbRoomId,
                checkIn: op.checkIn, checkOut: op.checkOut,
                status: 'checked_out', source: 'imported', adults: 1,
                roomRate: op.roomRate, totalAmount: op.netPaid, paidAmount: op.netPaid,
                notes: `Imported from legacy system (Booking #${op.bookingNum})`,
                checkedOutAt: op.checkOut,
              },
            });

            const bill = await tx.bill.create({
              data: {
                reservationId: reservation.id, guestId: op.guestId,
                roomCharges: op.totalPrice, discountAmount: op.discount,
                totalAmount: op.netPaid, paidAmount: op.netPaid, balanceAmount: 0,
                status: op.paymentStatus === 1 ? 'paid' : 'open',
                paymentMethod: 'cash', paidAt: op.paymentStatus === 1 ? op.checkOut : null,
              },
            });

            await tx.payment.create({
              data: { billId: bill.id, amount: op.netPaid, paymentMethod: 'cash', notes: `Legacy import - Booking #${op.bookingNum}` },
            });

            imported++;
          }
        }, { timeout: 120000 });
      }

      console.log(`Import progress: ${batchEnd}/${bookingRows.length}`);
    }

    const totalRevenue = bookingRows.reduce((sum, row) => sum + cleanNum(row[6]) - cleanNum(row[7]), 0);

    return NextResponse.json({
      success: true, imported, skipped, total: bookingRows.length,
      guestsCreated, guestsMatched,
      summary: { totalRevenue, bookingCount: imported },
      errors: errors.slice(0, 20),
    });
  } catch (error: unknown) {
    console.error('SQL Import error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to import SQL' }, { status: 500 });
  }
}