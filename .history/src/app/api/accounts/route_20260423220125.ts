import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Auth check
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
      if (session) {
        await db.session.delete({ where: { id: session.id } });
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get month range from query params or default to current month
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    let monthStart: Date;
    let monthEnd: Date;

    if (fromParam && toParam) {
      monthStart = new Date(fromParam);
      monthEnd = new Date(toParam);
    } else {
      const now = new Date();
      monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const currentPeriod = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

    // Previous month for trend comparison
    const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    const prevMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0, 23, 59, 59, 999);
    const prevPeriod = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, '0')}`;

    // --- Current Month Revenue ---
    const monthlyBills = await db.bill.findMany({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      select: {
        totalAmount: true, roomCharges: true, foodCharges: true,
        barCharges: true, spaCharges: true, laundryCharges: true, otherCharges: true,
      },
    } as any);

    const monthlyRevenue = monthlyBills.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);

    // Revenue by Category
    const roomRevenue = monthlyBills.reduce((sum: number, b: any) => sum + (b.roomCharges || 0), 0);
    const foodRevenue = monthlyBills.reduce((sum: number, b: any) => sum + (b.foodCharges || 0), 0);
    const barRevenue = monthlyBills.reduce((sum: number, b: any) => sum + (b.barCharges || 0), 0);
    const spaRevenue = monthlyBills.reduce((sum: number, b: any) => sum + (b.spaCharges || 0), 0);
    const laundryRevenue = monthlyBills.reduce((sum: number, b: any) => sum + (b.laundryCharges || 0), 0);
    const otherRevenue = monthlyBills.reduce((sum: number, b: any) => sum + (b.otherCharges || 0), 0);

    const totalCatRevenue = roomRevenue + foodRevenue + barRevenue + spaRevenue + laundryRevenue + otherRevenue;

    const revenueByCategory = [
      {
        name: 'Room Charges',
        amount: roomRevenue,
        percentage: totalCatRevenue > 0 ? Math.round((roomRevenue / totalCatRevenue) * 100) : 0,
        color: 'bg-emerald-500',
      },
      {
        name: 'Food & Beverage',
        amount: foodRevenue,
        percentage: totalCatRevenue > 0 ? Math.round((foodRevenue / totalCatRevenue) * 100) : 0,
        color: 'bg-blue-500',
      },
      {
        name: 'Bar & Lounge',
        amount: barRevenue,
        percentage: totalCatRevenue > 0 ? Math.round((barRevenue / totalCatRevenue) * 100) : 0,
        color: 'bg-purple-500',
      },
      {
        name: 'Spa & Services',
        amount: spaRevenue,
        percentage: totalCatRevenue > 0 ? Math.round((spaRevenue / totalCatRevenue) * 100) : 0,
        color: 'bg-pink-500',
      },
      {
        name: 'Laundry',
        amount: laundryRevenue,
        percentage: totalCatRevenue > 0 ? Math.round((laundryRevenue / totalCatRevenue) * 100) : 0,
        color: 'bg-orange-500',
      },
      {
        name: 'Other Services',
        amount: otherRevenue,
        percentage: totalCatRevenue > 0 ? Math.round((otherRevenue / totalCatRevenue) * 100) : 0,
        color: 'bg-gray-500',
      },
    ];

    // --- Outstanding Bills ---
    const outstandingBillRecords = await db.bill.findMany({
      where: { status: { in: ['open', 'partially_paid'] } },
      select: { balanceAmount: true },
    } as any);

    const outstandingTotal = outstandingBillRecords.reduce((sum: number, b: any) => sum + (b.balanceAmount || 0), 0);

    const outstandingBills: { count: number; total: number } = {
  count: outstandingBillRecords.length,
  total: outstandingTotal,
};

    // --- Total Expenses (use expenseDate column) ---
    const monthlyExpenses = await db.expense.findMany({
      where: { expenseDate: { gte: monthStart, lte: monthEnd } },
      select: { amount: true },
    } as any);

    const totalExpenses = monthlyExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    // --- Monthly Payroll ---
    let monthlyPayroll = 0;
    try {
      const payrollRecords = await db.payrollRecord.findMany({
        where: { period: currentPeriod },
        select: { netPay: true },
      } as any);
      monthlyPayroll = payrollRecords.reduce((sum: number, p: any) => sum + (p.netPay || 0), 0);
    } catch {
      // PayrollRecord table may not exist yet
    }

    // --- Net Profit ---
    const netProfit = monthlyRevenue - totalExpenses - monthlyPayroll;

    // --- Trends (compare to previous month) ---
    let trends = { revenue: 0, profit: 0 };

    try {
      const prevBills = await db.bill.findMany({
        where: { createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
        select: { totalAmount: true },
      } as any);
      const prevRevenue = prevBills.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);

      const prevExpenses = await db.expense.findMany({
        where: { expenseDate: { gte: prevMonthStart, lte: prevMonthEnd } },
        select: { amount: true },
      } as any);
      const prevExpenseTotal = prevExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      let prevPayroll = 0;
      try {
        const prevPayrollRecords = await db.payrollRecord.findMany({
          where: { period: prevPeriod },
          select: { netPay: true },
        } as any);
        prevPayroll = prevPayrollRecords.reduce((sum: number, p: any) => sum + (p.netPay || 0), 0);
      } catch { /* ignore */ }

      const prevProfit = prevRevenue - prevExpenseTotal - prevPayroll;

      if (prevRevenue > 0) {
        trends.revenue = Math.round(((monthlyRevenue - prevRevenue) / prevRevenue) * 100);
      }
      if (prevProfit !== 0) {
        trends.profit = Math.round(((netProfit - prevProfit) / Math.abs(prevProfit)) * 100);
      }
    } catch {
      // If previous month data not available, trends stay at 0
    }

    // --- Recent Transactions ---
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

    const recentExpenseRecords = await db.expense.findMany({
      take: 20,
      orderBy: { expenseDate: 'desc' },
    } as any);

    const incomeTransactions = recentPayments.map((p: any) => ({
      id: p.id,
      date: p.createdAt,
      description: p.bill?.guest
        ? `Payment - ${p.bill.guest.firstName} ${p.bill.guest.lastName}`
        : `Payment${p.notes ? ` - ${p.notes}` : ''}`,
      amount: p.amount,
      type: 'income' as const,
      paymentMethod: p.paymentMethod || 'cash',
    }));

    const expenseTransactions = recentExpenseRecords.map((e: any) => ({
      id: e.id,
      date: e.expenseDate || e.date,
      description: e.description || e.category || 'Expense',
      amount: e.amount,
      type: 'expense' as const,
      paymentMethod: e.paymentMethod || e.reference || e.vendor || 'cash',
    }));

    const recentTransactions = [...incomeTransactions, ...expenseTransactions]
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    // --- Payment Methods Breakdown ---
    const paymentMethodsBreakdown = buildPaymentMethodsBreakdown(recentPayments);

    return NextResponse.json({
      monthlyRevenue,
      outstandingBills,
      totalExpenses,
      netProfit,
      revenueByCategory,
      recentTransactions,
      paymentMethodsBreakdown,
      trends,
    });
  } catch (error: unknown) {
    console.error('Accounts error:', error);
    return NextResponse.json({ error: 'Failed to load accounts data' }, { status: 500 });
  }
}

function buildPaymentMethodsBreakdown(payments: any[]) {
  const methodMap: Record<string, { total: number; label: string }> = {
    cash: { total: 0, label: 'Cash' },
    pos: { total: 0, label: 'POS / Card' },
    bank_transfer: { total: 0, label: 'Bank Transfer' },
    opay: { total: 0, label: 'OPay' },
    palmpay: { total: 0, label: 'PalmPay' },
    moniepoint: { total: 0, label: 'Moniepoint' },
    credit_card: { total: 0, label: 'Credit Card' },
    debit_card: { total: 0, label: 'Debit Card' },
    cheque: { total: 0, label: 'Cheque' },
  };

  let grandTotal = 0;

  for (const p of payments) {
    const method = (p.paymentMethod || 'cash').toLowerCase().trim();
    if (methodMap[method]) {
      methodMap[method].total += p.amount || 0;
    } else {
      methodMap[method] = {
        total: (methodMap[method]?.total || 0) + (p.amount || 0),
        label: method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' '),
      };
    }
    grandTotal += p.amount || 0;
  }

  const breakdown: Array<{ method: string; label: string; total: number; percentage: number }> = [];

  for (const [method, data] of Object.entries(methodMap)) {
    if (data.total > 0) {
      breakdown.push({
        method,
        label: data.label,
        total: data.total,
        percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 100) : 0,
      });
    }
  }

  breakdown.sort((a, b) => b.total - a.total);

  return breakdown;
}