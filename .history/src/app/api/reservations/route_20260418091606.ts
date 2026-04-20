import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateConfirmationCode } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const guest = searchParams.get('guest');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (guest) {
      where.OR = [
        { guest: { firstName: { contains: guest } } },
        { guest: { lastName: { contains: guest } } },
        { confirmationCode: { contains: guest } },
      ];
    }

    const reservations = await db.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        room: { select: { id: true, roomNumber: true, roomType: { select: { name: true, baseRate: true } } } },
        bill: { select: { id: true, status: true, totalAmount: true, paidAmount: true } },
      },
    });

    return NextResponse.json(reservations);
  } catch (error: unknown) {
    console.error('Reservations error:', error);
    return NextResponse.json({ error: 'Failed to load reservations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
        const body = await request.json();
    const { guestId, roomId, checkIn, checkOut, adults, children, source, specialRequests, notes, totalAmount: overrideTotal } = body;
    if (!guestId || !roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: 'Guest, room, and dates are required' }, { status: 400 });
    }

    const room = await db.room.findUnique({
      where: { id: roomId },
      include: { roomType: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 });
    }

    const roomRate = room.roomType.baseRate;
    const totalAmount = roomRate * nights;

    const reservation = await db.reservation.create({
      data: {
        confirmationCode: generateConfirmationCode(),
        guestId,
        roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        status: 'confirmed',
        source: source || 'walk_in',
        adults: adults || 1,
        children: children || 0,
        specialRequests,
        notes,
        roomRate,
        totalAmount,
      },
      include: {
        guest: true,
        room: { include: { roomType: true } },
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: unknown) {
    console.error('Create reservation error:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, cancelReason, specialRequests, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (specialRequests !== undefined) updateData.specialRequests = specialRequests;
    if (notes !== undefined) updateData.notes = notes;

    if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = cancelReason;
    }
    if (status === 'checked_in') {
      updateData.checkedInAt = new Date();
    }
    if (status === 'checked_out') {
      updateData.checkedOutAt = new Date();
    }

    const reservation = await db.reservation.update({
      where: { id },
      data: updateData,
      include: {
        guest: true,
        room: { include: { roomType: true } },
      },
    });

    // Update room status based on reservation
    if (status === 'checked_in') {
      await db.room.update({ where: { id: reservation.roomId }, data: { status: 'occupied' } });
    } else if (status === 'checked_out') {
      await db.room.update({ where: { id: reservation.roomId }, data: { status: 'housekeeping' } });
    } else if (status === 'cancelled' || status === 'no_show') {
      const hasOtherActiveRes = await db.reservation.count({
        where: { roomId: reservation.roomId, status: { in: ['confirmed', 'checked_in'] }, id: { not: id } },
      });
      if (hasOtherActiveRes === 0) {
        await db.room.update({ where: { id: reservation.roomId }, data: { status: 'available' } });
      }
    }

    return NextResponse.json(reservation);
  } catch (error: unknown) {
    console.error('Update reservation error:', error);
    return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
    }

    const reservation = await db.reservation.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Delete associated payments and bill first
    const bill = await db.bill.findUnique({ where: { reservationId: id } });
    if (bill) {
      await db.payment.deleteMany({ where: { billId: bill.id } });
      await db.bill.delete({ where: { id: bill.id } });
    }

    await db.reservation.delete({ where: { id } });

    // Free up the room if no other active reservations
    const hasOtherActiveRes = await db.reservation.count({
      where: { roomId: reservation.roomId, status: { in: ['confirmed', 'checked_in'] } },
    });
    if (hasOtherActiveRes === 0) {
      await db.room.update({ where: { id: reservation.roomId }, data: { status: 'available' } });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete reservation error:', error);
    return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 });
  }
}
