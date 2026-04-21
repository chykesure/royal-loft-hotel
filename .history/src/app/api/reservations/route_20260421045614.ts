import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateConfirmationCode, generateGroupCode } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const guest = searchParams.get('guest');
    const groupCode = searchParams.get('groupCode');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (groupCode) where.groupCode = groupCode;
    if (guest) {
      where.OR = [
        { guest: { firstName: { contains: guest } } },
        { guest: { lastName: { contains: guest } } },
        { confirmationCode: { contains: guest } },
        { groupCode: { contains: guest } },
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

    // ── MULTI-ROOM BOOKING: roomIds array provided ──
    if (body.roomIds && Array.isArray(body.roomIds) && body.roomIds.length > 0) {
      const { guestId, roomIds, checkIn, checkOut, adults, children, source, specialRequests, notes } = body;

      if (!guestId || !checkIn || !checkOut) {
        return NextResponse.json({ error: 'Guest, rooms, and dates are required' }, { status: 400 });
      }

      if (roomIds.length < 2) {
        return NextResponse.json({ error: 'Select at least 2 rooms for multi-room booking' }, { status: 400 });
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

      if (nights <= 0) {
        return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 });
      }

      // Validate all rooms exist
      const rooms = await db.room.findMany({
        where: { id: { in: roomIds } },
        include: { roomType: true },
      });

      if (rooms.length !== roomIds.length) {
        return NextResponse.json({ error: 'One or more rooms not found' }, { status: 404 });
      }

      const groupCode = generateGroupCode();
      const createdReservations: Array<{ totalAmount: number }> = [];

      for (const room of rooms) {
        const roomRate = room.roomType.baseRate;
        const totalAmount = roomRate * nights;

        const reservation = await db.reservation.create({
          data: {
            confirmationCode: generateConfirmationCode(),
            guestId,
            roomId: room.id,
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
            groupCode,
          },
          include: {
            guest: true,
            room: { include: { roomType: true } },
          },
        });

        createdReservations.push(reservation);
      }

      const grandTotal = createdReservations.reduce((sum: number, r: { totalAmount: number }) => sum + r.totalAmount, 0);

      return NextResponse.json({
        message: `Multi-room booking created with ${createdReservations.length} rooms`,
        groupCode,
        reservations: createdReservations,
        grandTotal,
      }, { status: 201 });
    }

    // ── SINGLE-ROOM BOOKING: roomId string provided (backward compatible) ──
    const { guestId, roomId, checkIn, checkOut, adults, children, source, specialRequests, notes } = body;

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
    const { id, groupCode, status, cancelReason, specialRequests, notes } = body;

    // ── GROUP ACTION: Update all reservations with same groupCode ──
    if (groupCode && !id) {
      if (!status) {
        return NextResponse.json({ error: 'Status is required for group action' }, { status: 400 });
      }

      const groupReservations = await db.reservation.findMany({
        where: { groupCode, status: { not: 'cancelled' } },
        include: { room: true },
      });

      if (groupReservations.length === 0) {
        return NextResponse.json({ error: 'No active reservations found in this group' }, { status: 404 });
      }

      const updateData: Record<string, unknown> = { status };
      if (status === 'cancelled') {
        updateData.cancelledAt = new Date();
        updateData.cancelReason = cancelReason || 'Group action';
      }
      if (status === 'checked_in') {
        updateData.checkedInAt = new Date();
      }
      if (status === 'checked_out') {
        updateData.checkedOutAt = new Date();
      }

      await db.reservation.updateMany({
        where: { groupCode, status: { not: 'cancelled' } },
        data: updateData,
      });

      // Update room statuses for all rooms in the group
      const roomIds = groupReservations.map((r: { roomId: string }) => r.roomId);
      if (status === 'checked_in') {
        await db.room.updateMany({ where: { id: { in: roomIds } }, data: { status: 'occupied' } });
      } else if (status === 'checked_out') {
        await db.room.updateMany({ where: { id: { in: roomIds } }, data: { status: 'housekeeping' } });
      } else if (status === 'cancelled' || status === 'no_show') {
        for (const roomId of roomIds) {
          const hasOtherActive = await db.reservation.count({
            where: { roomId, status: { in: ['confirmed', 'checked_in'] } },
          });
          if (hasOtherActive === 0) {
            await db.room.update({ where: { id: roomId }, data: { status: 'available' } });
          }
        }
      }

      const updatedReservations = await db.reservation.findMany({
        where: { groupCode },
        include: {
          guest: true,
          room: { include: { roomType: true } },
        },
      });

      return NextResponse.json({
        message: `Group action: ${groupReservations.length} reservations updated to ${status}`,
        reservations: updatedReservations,
      });
    }

    // ── SINGLE RESERVATION UPDATE (backward compatible) ──
    if (!id) {
      return NextResponse.json({ error: 'Reservation ID or group code is required' }, { status: 400 });
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
    const { id, groupCode } = body;

    // ── GROUP DELETE: Delete all reservations with same groupCode ──
    if (groupCode && !id) {
      const groupReservations = await db.reservation.findMany({
        where: { groupCode },
        include: { room: true },
      });

      if (groupReservations.length === 0) {
        return NextResponse.json({ error: 'No reservations found in this group' }, { status: 404 });
      }

      for (const res of groupReservations) {
        const bill = await db.bill.findUnique({ where: { reservationId: res.id } });
        if (bill) {
          await db.payment.deleteMany({ where: { billId: bill.id } });
          await db.bill.delete({ where: { id: bill.id } });
        }
      }

      await db.reservation.deleteMany({ where: { groupCode } });

      const roomIds = groupReservations.map((r: { roomId: string }) => r.roomId);
      for (const roomId of roomIds) {
        const hasOtherActive = await db.reservation.count({
          where: { roomId, status: { in: ['confirmed', 'checked_in'] } },
        });
        if (hasOtherActive === 0) {
          await db.room.update({ where: { id: roomId }, data: { status: 'available' } });
        }
      }

      return NextResponse.json({ success: true, deletedCount: groupReservations.length });
    }

    // ── SINGLE DELETE (backward compatible) ──
    if (!id) {
      return NextResponse.json({ error: 'Reservation ID or group code is required' }, { status: 400 });
    }

    const reservation = await db.reservation.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const bill = await db.bill.findUnique({ where: { reservationId: id } });
    if (bill) {
      await db.payment.deleteMany({ where: { billId: bill.id } });
      await db.bill.delete({ where: { id: bill.id } });
    }

    await db.reservation.delete({ where: { id } });

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