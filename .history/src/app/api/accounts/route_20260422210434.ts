import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.session.findFirst({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await db.session.delete({ where: { id: session.id } });
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let monthlyRevenue = 0;
    const revenueByCategory = [
      { category: 'Room Charges', amount: 0 },
      { category: 'Food & Beverage', amount: 0 },
      { category: 'Bar & Lounge', amount: 0 },
      { category: 'Spa & Services', amount: 0 },
      { category: 'Laundry', amount: 0 },
      { category: 'Other Services', amount: 0 },
    ];
    let outstandingAmount = 0;
    let totalExpenses = 0;
    let monthlyPayroll = 0;
    const recentTransactions: Array<{
      id: string;
      date: Date;
      description: string;
      amount: number;
      type: 'income' | 'expense';
      method: string | null;
      category: string;
    }> = [];

    // ── Monthly Revenue from Bills ──
    try {
      const monthlyBills = await db.bill.findMany({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        select: {
          totalAmount: true,
          roomCharges: true,
          foodCharges: true,
          barCharges: true,
          spaCharges: true,
          laundryCharges: true,
          otherCharges: true,
        },
      } as any);

      monthlyRevenue = monthlyBills.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
      revenueByCategory[0].amount = monthlyBills.reduce((sum: number, b: any) => sum + (b.roomCharges || 0), 0);
      revenueByCategory[1].amount = monthlyBills.reduce((sum: number, b: any) => sum + (b.foodCharges || 0), 0);
      revenueByCategory[2].amount = monthlyBills.reduce((sum: number, b: any) => sum + (b.barCharges || 0), 0);
      revenueByCategory[3].amount = monthlyBills.reduce((sum: number, b: any) => sum + (b.spaCharges || 0), 0);
      revenueByCategory[4].amount = monthlyBills.reduce((sum: number, b: any) => sum + (b.laundryCharges || 0), 0);
      revenueByCategory[5].amount = monthlyBills.reduce((sum: number, b: any) => sum + (b.otherCharges || 0), 0);
    } catch (err) {
      console.error('[ACCOUNTS] Bill query failed:', err);
    }

    // ── Outstanding Bills ──
    try {
      const outstandingBills = await db.bill.findMany({
        where: {
          status: { in: ['open', 'partially_paid'] },
        },
        select: {
          balanceAmount: true,
        },
      } as any);

      outstandingAmount = outstandingBills.reduce((sum: number, b: any) => sum + (b.balanceAmount || 0), 0);
    } catch (err) {
      console.error('[ACCOUNTS] Outstanding bills query failed:', err);
    }

    // ── Total Expenses ──
    try {
      const monthlyExpenses = await db.expense.findMany({
        where: {
          date: { gte: monthStart, lte: monthEnd },
        },
        select: {
          amount: true,
        },
      } as any);

      totalExpenses = monthlyExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    } catch (err) {
      console.error('[ACCOUNTS] Expense query failed:', err);
    }

    // ── Monthly Payroll ──
    try {
      const payrollRecords = await db.payrollRecord.findMany({
        where: { period: currentPeriod },
        select: { netPay: true },
      });

      monthlyPayroll = payrollRecords.reduce((sum: number, p: any) => sum + (p.netPay || 0), 0);
    } catch (err) {
      console.error('[ACCOUNTS] Payroll query failed:', err);
    }

    // ── Net Profit ──
    const netProfit = monthlyRevenue - totalExpenses - monthlyPayroll;

    // ── Recent Transactions ──
    try {
      const recentPayments = await db.payment.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          bill: {
            include: {
              guest: { select: { firstName: true, lastName: true } },
            },
          },
        },
      } as any);

      for (const p of recentPayments) {
        recentTransactions.push({
          id: p.id,
          date: p.createdAt,
          description: (p as any).bill?.guest
            ? `Payment - ${(p as any).bill.guest.firstName} ${(p as any).bill.guest.lastName}`
            : `Payment${(p as any).notes ? ` - ${(p as any).notes}` : ''}`,
          amount: (p as any).amount || 0,
          type: 'income' as const,
          method: (p as any).paymentMethod ? (p as any).paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : null,
          category: 'payment',
        });
      }
    } catch (err) {
      console.error('[ACCOUNTS] Payments query failed:', err);
    }

    try {
      const recentExpenseRecords = await db.expense.findMany({
        take: 20,
        orderBy: { date: 'desc' },
      } as any);

      for (const e of recentExpenseRecords) {
        recentTransactions.push({
          id: (e as any).id,
          date: (e as any).date,
          description: (e as any).description || (e as any).category,
          amount: (e as any).amount || 0,
          type: 'expense' as const,
          method: (e as any).reference || (e as any).vendor || null,
          category: (e as any).category,
        });
      }
    } catch (err) {
      console.error('[ACCOUNTS] Recent expenses query failed:', err);
    }

    // Sort transactions by date desc, take 20
    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      monthlyRevenue,
      outstandingBills: outstandingAmount,
      totalExpenses,
      monthlyPayroll,
      netProfit,
      revenueByCategory,
      recentTransactions: recentTransactions.slice(0, 20),
    });
  } catch (error: unknown) {
    console.error('Accounts error:', error);
    return NextResponse.json({ error: 'Failed to load accounts data' }, { status: 500 });
  }
}