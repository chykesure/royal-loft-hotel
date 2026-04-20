import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { guest: { firstName: { contains: search } } },
        { guest: { lastName: { contains: search } } },
        { reservation: { confirmationCode: { contains: search } } },
      ];
    }

    const bills = await db.bill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, phone: true } },
        reservation: {
          select: {
            confirmationCode: true,
            checkIn: true,
            checkOut: true,
            room: { select: { roomNumber: true, roomType: { select: { name: true } } } },
          },
        },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json(bills);
  } catch (error: unknown) {
    console.error('Bills error:', error);
    return NextResponse.json({ error: 'Failed to load bills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guestId, reservationId, roomCharges, foodCharges, barCharges, spaCharges, laundryCharges, otherCharges, taxAmount, discountAmount } = body;

    if (!guestId) {
      return NextResponse.json({ error: 'Guest is required' }, { status: 400 });
    }

    const totalAmount = (roomCharges || 0) + (foodCharges || 0) + (barCharges || 0) + (spaCharges || 0) + (laundryCharges || 0) + (otherCharges || 0) + (taxAmount || 0) - (discountAmount || 0);

    const bill = await db.bill.create({
      data: {
        guestId,
        reservationId,
        roomCharges: roomCharges || 0,
        foodCharges: foodCharges || 0,
        barCharges: barCharges || 0,
        spaCharges: spaCharges || 0,
        laundryCharges: laundryCharges || 0,
        otherCharges: otherCharges || 0,
        taxAmount: taxAmount || 0,
        discountAmount: discountAmount || 0,
        totalAmount,
        balanceAmount: totalAmount,
        status: 'open',
      },
      include: {
        guest: true,
        reservation: { include: { room: { include: { roomType: true } } } },
      },
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error: unknown) {
    console.error('Create bill error:', error);
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    // If totalAmount or balanceAmount is being updated, ensure consistency
    if (data.totalAmount !== undefined) {
      const existing = await db.bill.findUnique({ where: { id } });
      if (existing) {
        data.paidAmount = existing.paidAmount;
        data.balanceAmount = (data.totalAmount || 0) - (existing.paidAmount || 0);
      }
    }

    const bill = await db.bill.update({
      where: { id },
      data,
      include: {
        guest: true,
        reservation: { include: { room: { include: { roomType: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    // Auto-update bill status based on payments
    if (bill.paidAmount > 0 && bill.paidAmount < bill.totalAmount) {
      await db.bill.update({ where: { id }, data: { status: 'partially_paid' } });
    } else if (bill.paidAmount >= bill.totalAmount) {
      await db.bill.update({ where: { id }, data: { status: 'paid', paidAt: new Date() } });
    } else {
      await db.bill.update({ where: { id }, data: { status: 'open' } });
    }

    return NextResponse.json(bill);
  } catch (error: unknown) {
    console.error('Update bill error:', error);
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    const bill = await db.bill.findUnique({ where: { id } });
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    await db.payment.deleteMany({ where: { billId: id } });
    await db.bill.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete bill error:', error);
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 });
  }
}