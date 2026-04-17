import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const bills = await db.bills.findMany
      ? await db.bill.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            guest: { select: { id: true, firstName: true, lastName: true } },
            reservation: { select: { confirmationCode: true } },
            payments: { orderBy: { createdAt: 'desc' } },
          },
        })
      : await db.bill.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            guest: { select: { id: true, firstName: true, lastName: true } },
            reservation: { select: { confirmationCode: true } },
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
        reservation: true,
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

    const bill = await db.bill.update({
      where: { id },
      data,
      include: {
        guest: true,
        reservation: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

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

    // Delete associated payments first
    await db.payment.deleteMany({ where: { billId: id } });
    await db.bill.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete bill error:', error);
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 });
  }
}
