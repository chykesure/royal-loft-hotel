import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/payroll/pay
// Body: { payrollId: string, paymentMethod: string }
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

    const updated = await db.payrollRecord.update({
      where: { id: payrollId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        processedBy: session.userId,
      },
      include: {
        staff: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    const staffName = (updated as any).staff?.user?.name || 'Unknown Staff';
    await db.expense.create({
      data: {
        date: new Date(),
        category: 'salaries',
        description: `Salary payment - ${staffName} (${paymentMethod})`,
        amount: payroll.netPay,
        vendor: paymentMethod === 'bank_transfer' ? (payroll as any).staff?.bankName || 'Bank Transfer' : paymentMethod,
        reference: payrollId,
        createdBy: session.userId,
      },
    });

    return NextResponse.json({ payroll: updated });
  } catch (error: unknown) {
    console.error('Pay salary error:', error);
    return NextResponse.json(
      { error: 'Failed to process salary payment' },
      { status: 500 }
    );
  }
}