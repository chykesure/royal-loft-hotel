import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billId, amount, paymentMethod, paymentRef, notes } = body;

    if (!billId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Bill ID and valid amount are required' }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    // Verify bill exists
    const bill = await db.bill.findUnique({ where: { id: billId } });
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Create the payment record
    const payment = await db.payment.create({
      data: {
        billId,
        amount: parseFloat(amount),
        paymentMethod,
        paymentRef: paymentRef || null,
        notes: notes || null,
      },
    });

    // Update bill totals
    const newPaidAmount = (bill.paidAmount || 0) + parseFloat(amount);
    const newBalance = bill.totalAmount - newPaidAmount;

    let newStatus = 'open';
    if (newPaidAmount > 0 && newPaidAmount < bill.totalAmount) {
      newStatus = 'partially_paid';
    } else if (newPaidAmount >= bill.totalAmount) {
      newStatus = 'paid';
    }

    await db.bill.update({
      where: { id: billId },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: Math.max(0, newBalance),
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : bill.paidAt,
        paymentMethod: newStatus === 'paid' ? paymentMethod : bill.paymentMethod,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: unknown) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}