import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await db.session.delete({ where: { id: session.id } });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (!['super_admin', 'developer', 'manager'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const results: Record<string, number> = {};

    // 1. Delete all Payments (all are seed-generated)
    const paymentCount = await db.payment.count();
    await db.payment.deleteMany({});
    results.paymentsDeleted = paymentCount;

    // 2. Delete all Bills (all are seed-generated)
    const billCount = await db.bill.count();
    await db.bill.deleteMany({});
    results.billsDeleted = billCount;

    // 3. Delete seed-generated Expenses only
    const allExpenses = await db.expense.findMany({
      select: { id: true, total: true, kitchen: true, hotel: true, beverages: true },
    } as any);

    let seedExpenseIds: string[] = [];
    let csvExpenseIds: string[] = [];

    for (const exp of allExpenses) {
      const e = exp as any;
      if (e.kitchen === null && e.hotel === null && e.beverages === null) {
        seedExpenseIds.push(exp.id);
      } else {
        csvExpenseIds.push(exp.id);
      }
    }

    if (seedExpenseIds.length > 0) {
      for (let i = 0; i < seedExpenseIds.length; i += 100) {
        const batch = seedExpenseIds.slice(i, i + 100);
        await db.expense.deleteMany({ where: { id: { in: batch } } });
      }
    }

    results.seedExpensesDeleted = seedExpenseIds.length;
    results.csvExpensesKept = csvExpenseIds.length;

    return NextResponse.json({
      success: true,
      message: 'Dummy data cleaned up successfully',
      ...results,
    });
  } catch (error: unknown) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Failed to cleanup dummy data' }, { status: 500 });
  }
}