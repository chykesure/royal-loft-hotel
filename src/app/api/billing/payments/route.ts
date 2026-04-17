import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billId, amount, paymentMethod, paymentRef, notes } = body;

    if (!billId || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Bill, amount, and payment method are required' }, { status: 400 });
    }

    const bill = await db.bill.findUnique({ where: { id: billId } });
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const payment = await db.payment.create({
      data: { billId, amount, paymentMethod, paymentRef, notes },
    });

    const newPaidAmount = bill.paidAmount + amount;
    const newBalance = bill.totalAmount - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

    await db.bill.update({
      where: { id: billId },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: Math.max(0, newBalance),
        status: newStatus,
        paidAt: newBalance <= 0 ? new Date() : undefined,
        paymentMethod,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: unknown) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
