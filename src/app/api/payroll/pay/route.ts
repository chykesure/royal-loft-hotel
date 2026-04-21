import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.session.findFirst({
      where: { token },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await db.session.delete({ where: { id: session.id } });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { payrollId, paymentMethod } = body;

    if (!payrollId || !paymentMethod) {
      return NextResponse.json(
        { error: 'payrollId and paymentMethod are required' },
        { status: 400 }
      );
    }

    const validMethods = ['cash', 'pos', 'bank_transfer', 'opay', 'palmpay', 'moniepoint'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      );
    }

    const payroll = await db.payrollRecord.findUnique({
      where: { id: payrollId },
      include: {
        staff: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json(
        { error: 'Payroll record not found' },
        { status: 404 }
      );
    }

    if (payroll.status === 'paid') {
      return NextResponse.json(
        { error: 'This payroll has already been paid' },
        { status: 400 }
      );
    }

    const staffName = (payroll as any).staff?.user?.name || 'Unknown Staff';

    // Step 1: Update payroll status to paid
    const updated = await db.payrollRecord.update({
      where: { id: payrollId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        processedBy: session.user.id,
      },
      include: {
        staff: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    // Step 2: Try to create expense record (optional — don't fail payment if it breaks)
    try {
      await db.expense.create({
        data: {
          date: new Date(),
          category: 'salaries',
          description: `Salary payment - ${staffName} (${paymentMethod})`,
          amount: Number(payroll.netPay) || 0,
          vendor: paymentMethod === 'bank_transfer'
            ? (payroll as any).staff?.bankName || 'Bank Transfer'
            : paymentMethod,
          reference: payrollId,
          createdBy: session.user.id,
        },
      });
    } catch (expenseErr) {
      console.warn('Could not create expense record (non-critical):', expenseErr);
    }

    return NextResponse.json({ payroll: updated });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Pay salary error:', errMsg);
    return NextResponse.json(
      { error: `Failed to process salary payment: ${errMsg}` },
      { status: 500 }
    );
  }
}