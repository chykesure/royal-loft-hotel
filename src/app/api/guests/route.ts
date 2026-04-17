import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const guests = await db.guest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { reservations: true, feedbacks: true },
        },
      },
    });

    return NextResponse.json(guests);
  } catch (error: unknown) {
    console.error('Guests error:', error);
    return NextResponse.json({ error: 'Failed to load guests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, address, city, state, country, idType, idNumber, gender, nationality, company, vip, preferences } = body;

    if (!firstName || !lastName || !phone) {
      return NextResponse.json({ error: 'First name, last name, and phone are required' }, { status: 400 });
    }

    const guest = await db.guest.create({
      data: {
        firstName, lastName, email, phone, address, city, state,
        country: country || 'Nigeria', idType, idNumber, gender, nationality,
        company, vip: vip || false, preferences: preferences ? JSON.stringify(preferences) : undefined,
      },
    });

    return NextResponse.json(guest, { status: 201 });
  } catch (error: unknown) {
    console.error('Create guest error:', error);
    return NextResponse.json({ error: 'Failed to create guest' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Guest ID is required' }, { status: 400 });
    }

    if (data.preferences && typeof data.preferences === 'object') {
      data.preferences = JSON.stringify(data.preferences);
    }

    const guest = await db.guest.update({
      where: { id },
      data,
      include: {
        _count: { select: { reservations: true, feedbacks: true } },
      },
    });

    return NextResponse.json(guest);
  } catch (error: unknown) {
    console.error('Update guest error:', error);
    return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Guest ID is required' }, { status: 400 });
    }

    const guest = await db.guest.findUnique({ where: { id } });
    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Check for active reservations
    const activeReservations = await db.reservation.count({
      where: { guestId: id, status: { in: ['confirmed', 'checked_in', 'pending'] } },
    });
    if (activeReservations > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${activeReservations} active reservation(s) exist for this guest` },
        { status: 400 }
      );
    }

    // Delete associated bills (with their payments), feedbacks, and reservations
    const bills = await db.bill.findMany({ where: { guestId: id } });
    for (const bill of bills) {
      await db.payment.deleteMany({ where: { billId: bill.id } });
    }
    await db.bill.deleteMany({ where: { guestId: id } });

    await db.guestFeedback.deleteMany({ where: { guestId: id } });
    await db.reservation.deleteMany({ where: { guestId: id } });
    await db.guest.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete guest error:', error);
    return NextResponse.json({ error: 'Failed to delete guest' }, { status: 500 });
  }
}
