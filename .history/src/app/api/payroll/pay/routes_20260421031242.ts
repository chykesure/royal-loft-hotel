import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// POST /api/payroll/pay
// Body: { payrollId: string, paymentMethod: string }
export async function POST(request: NextRequest) {
  try {
    // Auth using cookies() from next/headers (Next.js 16 compatible)
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
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

    // Get payroll record
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

    // Use Prisma transaction to ensure both operations succeed or fail together
    const updated = await db.$transaction(async (tx) => {
      // Update payroll status
      const paid = await tx.payrollRecord.update({
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

      // Create expense record for accounting
      const staffName = (paid as any).staff?.user?.name || 'Unknown Staff';
      await tx.expense.create({
        data: {
          date: new Date(),
          category: 'salaries',
          description: `Salary payment - ${staffName} (${paymentMethod})`,
          amount: Number(payroll.netPay) || 0,
          vendor: paymentMethod === 'bank_transfer' ? (payroll as any).staff?.bankName || 'Bank Transfer' : paymentMethod,
          reference: payrollId,
          createdBy: session.user.id,
        },
      });

      return paid;
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