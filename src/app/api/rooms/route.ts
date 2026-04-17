import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    if (section === 'room-types') {
      const roomTypes = await db.roomType.findMany({ orderBy: { sortOrder: 'asc' } });
      return NextResponse.json(roomTypes);
    }

    if (section === 'floors') {
      const rooms = await db.room.findMany({ select: { floor: true } });
      const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
      return NextResponse.json(floors);
    }

    const rooms = await db.room.findMany({
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    const roomTypes = await db.roomType.findMany({ orderBy: { sortOrder: 'asc' } });

    const statusCounts = {
      available: await db.room.count({ where: { status: 'available' } }),
      occupied: await db.room.count({ where: { status: 'occupied' } }),
      housekeeping: await db.room.count({ where: { status: 'housekeeping' } }),
      maintenance: await db.room.count({ where: { status: 'maintenance' } }),
      reserved: await db.room.count({ where: { status: 'reserved' } }),
      out_of_service: await db.room.count({ where: { status: 'out_of_service' } }),
    };

    const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);

    return NextResponse.json({ rooms, roomTypes, statusCounts, floors });
  } catch (error: unknown) {
    console.error('Rooms error:', error);
    return NextResponse.json({ error: 'Failed to load rooms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Create Room Type
    if (action === 'create-room-type') {
      const { name, baseRate, maxOccupancy, description, amenities } = body;
      if (!name || !baseRate || !maxOccupancy) {
        return NextResponse.json({ error: 'Name, base rate, and max occupancy are required' }, { status: 400 });
      }
      const roomType = await db.roomType.create({
        data: {
          name,
          baseRate: parseFloat(baseRate),
          maxOccupancy: parseInt(maxOccupancy),
          description: description || null,
          amenities: amenities ? JSON.stringify(amenities) : null,
        },
      });
      return NextResponse.json(roomType, { status: 201 });
    }

    // Create Room
    const { roomNumber, floor, roomTypeId, status, notes } = body;

    if (!roomNumber || !floor || !roomTypeId) {
      return NextResponse.json({ error: 'Room number, floor, and room type are required' }, { status: 400 });
    }

    const existing = await db.room.findUnique({ where: { roomNumber } });
    if (existing) {
      return NextResponse.json({ error: 'Room number already exists' }, { status: 409 });
    }

    const room = await db.room.create({
      data: { roomNumber, floor, roomTypeId, status: status || 'available', notes },
      include: { roomType: true },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error: unknown) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Update Room Type
    if (action === 'update-room-type') {
      const { id, name, baseRate, maxOccupancy, description, amenities } = body;
      if (!id) {
        return NextResponse.json({ error: 'Room type ID is required' }, { status: 400 });
      }
      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (baseRate !== undefined) data.baseRate = parseFloat(baseRate);
      if (maxOccupancy !== undefined) data.maxOccupancy = parseInt(maxOccupancy);
      if (description !== undefined) data.description = description;
      if (amenities !== undefined) data.amenities = amenities ? JSON.stringify(amenities) : null;

      const roomType = await db.roomType.update({
        where: { id },
        data,
      });
      return NextResponse.json(roomType);
    }

    // Update Room
    const { id, roomNumber, floor, roomTypeId, status, notes, currentCondition } = body;

    if (!id) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const room = await db.room.update({
      where: { id },
      data: { roomNumber, floor, roomTypeId, status, notes, currentCondition },
      include: { roomType: true },
    });

    return NextResponse.json(room);
  } catch (error: unknown) {
    console.error('Update room error:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (action === 'delete-room') {
      if (!id) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
      }
      // Check if room has active reservations
      const activeReservations = await db.reservation.count({
        where: { roomId: id, status: { in: ['confirmed', 'checked_in'] } },
      });
      if (activeReservations > 0) {
        return NextResponse.json(
          { error: `Cannot delete: ${activeReservations} active reservation(s) exist for this room` },
          { status: 400 }
        );
      }
      await db.room.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete-room-type') {
      if (!id) {
        return NextResponse.json({ error: 'Room type ID is required' }, { status: 400 });
      }
      const roomsUsing = await db.room.count({ where: { roomTypeId: id } });
      if (roomsUsing > 0) {
        return NextResponse.json(
          { error: `Cannot delete: ${roomsUsing} room(s) use this type` },
          { status: 400 }
        );
      }
      await db.roomType.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
