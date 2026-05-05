import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateConfirmationCode } from '@/lib/auth';

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start, end };
}

function getTodayISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const { start, end } = getTodayRange();

    // Summary (no action)
    if (!action) {
      const todayArrivals = await db.reservation.count({
        where: {
          checkIn: { gte: start, lt: end },
          status: { in: ['confirmed', 'checked_in'] },
        },
      });

      const todayDepartures = await db.reservation.count({
        where: {
          checkOut: { gte: start, lt: end },
          status: 'checked_in',
        },
      });

      const overdueCheckouts = await db.reservation.count({
        where: {
          checkOut: { lt: start },
          status: 'checked_in',
        },
      });

      return NextResponse.json({
        todayArrivals,
        todayDepartures,
        overdueCheckouts,
      });
    }

    // Check-in list
    if (action === 'checkin') {
      const arrivals = await db.reservation.findMany({
        where: {
          checkIn: { gte: start, lt: end },
          status: 'confirmed',
        },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              idType: true,
              idNumber: true,
            },
          },
          room: {
            select: {
              id: true,
              roomNumber: true,
              floor: true,
              roomType: {
                select: { id: true, name: true, baseRate: true },
              },
            },
          },
        },
        orderBy: { checkIn: 'asc' },
      });

      return NextResponse.json(arrivals);
    }

    // Check-out list
    if (action === 'checkout') {
      const departures = await db.reservation.findMany({
        where: {
          checkOut: { gte: start, lt: end },
          status: 'checked_in',
        },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              idType: true,
              idNumber: true,
            },
          },
          room: {
            select: {
              id: true,
              roomNumber: true,
              floor: true,
              roomType: {
                select: { id: true, name: true, baseRate: true },
              },
            },
          },
          bill: {
            select: {
              id: true,
              roomCharges: true,
              foodCharges: true,
              barCharges: true,
              spaCharges: true,
              laundryCharges: true,
              otherCharges: true,
              taxAmount: true,
              discountAmount: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              status: true,
              paymentMethod: true,
            },
          },
        },
        orderBy: { checkOut: 'asc' },
      });

      return NextResponse.json(departures);
    }

    // Available rooms grouped by room type
    if (action === 'available-rooms') {
      const availableRooms = await db.room.findMany({
        where: { status: 'available' },
        include: {
          roomType: {
            select: { id: true, name: true, baseRate: true },
          },
        },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      });

      // Group by room type
      const grouped = availableRooms.reduce<Record<string, { roomType: { id: string; name: string; baseRate: number }; rooms: { id: string; roomNumber: string; floor: number }[] }>>((acc, room) => {
        const typeId = room.roomType.id;
        if (!acc[typeId]) {
          acc[typeId] = {
            roomType: room.roomType,
            rooms: [],
          };
        }
        acc[typeId].rooms.push({
          id: room.id,
          roomNumber: room.roomNumber,
          floor: room.floor,
        });
        return acc;
      }, {});

      return NextResponse.json(Object.values(grouped));
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Front desk GET error:', error);
    return NextResponse.json({ error: 'Failed to load front desk data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // ─── Robust body parsing for Next.js 16 ───
    let body: any;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        // If request.json() fails, try reading as raw text
        const rawText = await request.text();
        try {
          body = JSON.parse(rawText);
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON body. Please send valid JSON with Content-Type: application/json' },
            { status: 400 }
          );
        }
      }
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // Handle form data (for future file uploads etc.)
      try {
        const formData = await request.formData();
        body = Object.fromEntries(formData.entries());
      } catch {
        const rawText = await request.text();
        try {
          body = JSON.parse(rawText);
        } catch {
          return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
        }
      }
    } else {
      // No recognized content-type — try raw text as last resort (Next.js 16 quirk)
      const rawText = await request.text();
      if (!rawText.trim()) {
        return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
      }
      try {
        body = JSON.parse(rawText);
      } catch {
        return NextResponse.json(
          { error: 'Invalid request body. Expected JSON with Content-Type: application/json' },
          { status: 400 }
        );
      }
    }

    const { action } = body;

    // ─── CHECK-IN ──────────────────────────────────────────────
    if (action === 'checkin') {
      const { reservationId, idType, idNumber, specialRequests } = body;

      if (!reservationId) {
        return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
      }

      const reservation = await db.reservation.findUnique({
        where: { id: reservationId },
        include: { guest: true, room: true },
      });

      if (!reservation) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }

      if (reservation.status !== 'confirmed') {
        return NextResponse.json({ error: `Cannot check in: reservation status is "${reservation.status}"` }, { status: 400 });
      }

      // Update guest ID info if provided
      if (idType && idNumber) {
        await db.guest.update({
          where: { id: reservation.guestId },
          data: { idType, idNumber },
        });
      }

      // Update reservation
      const updatedReservation = await db.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'checked_in',
          checkedInAt: new Date(),
          specialRequests: specialRequests || reservation.specialRequests,
        },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, phone: true } },
          room: { select: { id: true, roomNumber: true, roomType: { select: { name: true } } } },
        },
      });

      // Update room status
      await db.room.update({
        where: { id: reservation.roomId },
        data: { status: 'occupied' },
      });

      // Create Bill if not exists
      const existingBill = await db.bill.findUnique({
        where: { reservationId },
      });

      if (!existingBill) {
        await db.bill.create({
          data: {
            reservationId,
            guestId: reservation.guestId,
            roomCharges: reservation.totalAmount,
            totalAmount: reservation.totalAmount,
            balanceAmount: reservation.totalAmount - reservation.paidAmount,
            paidAmount: reservation.paidAmount,
            status: reservation.paidAmount > 0 ? 'partially_paid' : 'open',
          },
        });
      }

      return NextResponse.json(updatedReservation);
    }

    // ─── CHECK-OUT ─────────────────────────────────────────────
    if (action === 'checkout') {
      const { reservationId, paymentMethod, paymentAmount } = body;

      if (!reservationId) {
        return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
      }

      const reservation = await db.reservation.findUnique({
        where: { id: reservationId },
        include: { guest: true, room: true, bill: true },
      });

      if (!reservation) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }

      if (reservation.status !== 'checked_in') {
        return NextResponse.json({ error: `Cannot check out: reservation status is "${reservation.status}"` }, { status: 400 });
      }

      // Update reservation
      const updatedReservation = await db.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'checked_out',
          checkedOutAt: new Date(),
        },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true } },
          room: { select: { id: true, roomNumber: true } },
        },
      });

      // Update room status to available
      await db.room.update({
        where: { id: reservation.roomId },
        data: { status: 'available' },
      });

      // Process payment if amount > 0
      if (paymentAmount && parseFloat(String(paymentAmount)) > 0) {
        const amount = parseFloat(String(paymentAmount));

        let bill = reservation.bill;
        if (!bill) {
          // Create bill first
          bill = await db.bill.create({
            data: {
              reservationId,
              guestId: reservation.guestId,
              roomCharges: reservation.totalAmount,
              totalAmount: reservation.totalAmount,
              balanceAmount: reservation.totalAmount - reservation.paidAmount,
              paidAmount: reservation.paidAmount,
              status: 'open',
            },
          });
        }

        // Create payment record
        await db.payment.create({
          data: {
            billId: bill.id,
            amount,
            paymentMethod: paymentMethod || 'cash',
          },
        });

        // Update bill
        const newPaidAmount = bill.paidAmount + amount;
        const newBalance = bill.totalAmount - newPaidAmount;

        await db.bill.update({
          where: { id: bill.id },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: Math.max(0, newBalance),
            status: newBalance <= 0 ? 'paid' : 'partially_paid',
            paymentMethod: paymentMethod || bill.paymentMethod,
          },
        });

        // Also update reservation paid amount
        await db.reservation.update({
          where: { id: reservationId },
          data: { paidAmount: reservation.paidAmount + amount },
        });
      }

      // Update guest stats
      await db.guest.update({
        where: { id: reservation.guestId },
        data: {
          totalStays: { increment: 1 },
          totalSpent: { increment: reservation.totalAmount },
        },
      });

      return NextResponse.json(updatedReservation);
    }

    // ─── WALK-IN ───────────────────────────────────────────────
    if (action === 'walkin') {
      const { firstName, lastName, phone, email, roomTypeId, checkOut, adults, idType, idNumber } = body;

      if (!firstName || !lastName || !phone || !roomTypeId || !checkOut) {
        return NextResponse.json({ error: 'First name, last name, phone, room type, and check-out date are required' }, { status: 400 });
      }

      const checkOutDate = new Date(String(checkOut));
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (checkOutDate <= todayStart) {
        return NextResponse.json({ error: 'Check-out date must be in the future' }, { status: 400 });
      }

      // Find available room of the specified type
      const availableRoom = await db.room.findFirst({
        where: {
          roomTypeId: String(roomTypeId),
          status: 'available',
        },
        include: { roomType: true },
      });

      if (!availableRoom) {
        return NextResponse.json({ error: 'No available rooms of this type' }, { status: 400 });
      }

      // Calculate nights
      const checkInDate = new Date();
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

      if (nights <= 0) {
        return NextResponse.json({ error: 'Check-out must be at least 1 night from now' }, { status: 400 });
      }

      const roomRate = availableRoom.roomType.baseRate;
      const totalAmount = roomRate * nights;

      // Create or find guest
      let guest = await db.guest.findFirst({
        where: { phone: String(phone) },
      });

      if (guest) {
        guest = await db.guest.update({
          where: { id: guest.id },
          data: {
            firstName: String(firstName),
            lastName: String(lastName),
            email: email ? String(email) : undefined,
            idType: idType ? String(idType) : undefined,
            idNumber: idNumber ? String(idNumber) : undefined,
          },
        });
      } else {
        guest = await db.guest.create({
          data: {
            firstName: String(firstName),
            lastName: String(lastName),
            phone: String(phone),
            email: email ? String(email) : undefined,
            idType: idType ? String(idType) : undefined,
            idNumber: idNumber ? String(idNumber) : undefined,
          },
        });
      }

      // Create reservation
      const reservation = await db.reservation.create({
        data: {
          confirmationCode: generateConfirmationCode(),
          guestId: guest.id,
          roomId: availableRoom.id,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          status: 'checked_in',
          source: 'walk_in',
          adults: adults ? parseInt(String(adults)) : 1,
          children: 0,
          roomRate,
          totalAmount,
          paidAmount: 0,
          checkedInAt: new Date(),
        },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, phone: true } },
          room: { select: { id: true, roomNumber: true, floor: true, roomType: { select: { name: true, baseRate: true } } } },
        },
      });

      // Update room status
      await db.room.update({
        where: { id: availableRoom.id },
        data: { status: 'occupied' },
      });

      // Create Bill
      await db.bill.create({
        data: {
          reservationId: reservation.id,
          guestId: guest.id,
          roomCharges: totalAmount,
          totalAmount,
          balanceAmount: totalAmount,
          paidAmount: 0,
          status: 'open',
        },
      });

      return NextResponse.json(reservation, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Front desk POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to process front desk operation: ${message}` }, { status: 500 });
  }
}