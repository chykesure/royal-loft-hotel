import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await db.session.findFirst({
      where: { token: sessionToken },
      include: { staff: { include: { user: true } } }
    });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payrollId, paymentMethod } = await request.json();

    if (!payrollId || !paymentMethod) {
      return NextResponse.json(
        { error: 'Payroll ID and payment method are required' },
        { status: 400 }
      );
    }

    // Find the payroll record
    const record = await db.payrollRecord.findUnique({
      where: { id: payrollId }
    });

    if (!record) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    if (record.status === 'paid') {
      return NextResponse.json({ error: 'This payroll has already been paid' }, { status: 400 });
    }

    // Update record to paid
    const updated = await db.payrollRecord.update({
      where: { id: payrollId },
      data: {
        status: 'paid',
        paymentMethod,
        paidAt: new Date()
      },
      include: { staff: true }
    });

    return NextResponse.json({
      success: true,
      record: updated,
      message: `Payment of ₦${Number(updated.netPay).toLocaleString()} recorded for ${updated.staff?.name || 'Staff'} via ${paymentMethod}`
    });
  } catch (error: any) {
    console.error('Pay payroll error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}