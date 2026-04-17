import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Determine date range
    const now = new Date();
    const fromDate = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = toParam ? new Date(toParam) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    // 1. Monthly Revenue: Sum of Payment.amount in date range
    const paymentsInRange = await db.payment.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: { amount: true },
    });
    const monthlyRevenue = paymentsInRange.reduce((sum, p) => sum + p.amount, 0);

    // 2. Outstanding Bills: Count + total balance where status is 'open' or 'partially_paid'
    const outstandingBillsRaw = await db.bill.findMany({
      where: { status: { in: ['open', 'partially_paid'] } },
      select: { balanceAmount: true },
    });
    const outstandingBillCount = outstandingBillsRaw.length;
    const outstandingBillTotal = outstandingBillsRaw.reduce((sum, b) => sum + b.balanceAmount, 0);

    // 3. Total Expenses: Sum of Expense.amount in date range
    const expensesInRange = await db.expense.findMany({
      where: { expenseDate: { gte: fromDate, lte: toDate } },
      select: { amount: true },
    });
    const totalExpenses = expensesInRange.reduce((sum, e) => sum + e.amount, 0);

    // 4. Net Profit
    const netProfit = monthlyRevenue - totalExpenses;

    // 5. Revenue by Category: From Bill table in date range
    const billsInRange = await db.bill.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: {
        roomCharges: true,
        foodCharges: true,
        barCharges: true,
        spaCharges: true,
        laundryCharges: true,
        otherCharges: true,
      },
    });

    const roomRevenue = billsInRange.reduce((sum, b) => sum + b.roomCharges, 0);
    const foodRevenue = billsInRange.reduce((sum, b) => sum + b.foodCharges, 0);
    const barRevenue = billsInRange.reduce((sum, b) => sum + b.barCharges, 0);
    const spaRevenue = billsInRange.reduce((sum, b) => sum + b.spaCharges, 0);
    const otherServicesRevenue = billsInRange.reduce(
      (sum, b) => sum + b.laundryCharges + b.otherCharges,
      0
    );

    const totalCategoryRevenue =
      roomRevenue + foodRevenue + barRevenue + spaRevenue + otherServicesRevenue;

    const revenueByCategory = [
      {
        name: 'Room Revenue',
        amount: roomRevenue,
        percentage: totalCategoryRevenue > 0 ? Math.round((roomRevenue / totalCategoryRevenue) * 100) : 0,
        color: 'bg-amber-500',
      },
      {
        name: 'Food & Beverage',
        amount: foodRevenue,
        percentage: totalCategoryRevenue > 0 ? Math.round((foodRevenue / totalCategoryRevenue) * 100) : 0,
        color: 'bg-orange-500',
      },
      {
        name: 'Bar & Lounge',
        amount: barRevenue,
        percentage: totalCategoryRevenue > 0 ? Math.round((barRevenue / totalCategoryRevenue) * 100) : 0,
        color: 'bg-emerald-500',
      },
      {
        name: 'Spa & Services',
        amount: spaRevenue,
        percentage: totalCategoryRevenue > 0 ? Math.round((spaRevenue / totalCategoryRevenue) * 100) : 0,
        color: 'bg-teal-500',
      },
      {
        name: 'Other Services',
        amount: otherServicesRevenue,
        percentage:
          totalCategoryRevenue > 0 ? Math.round((otherServicesRevenue / totalCategoryRevenue) * 100) : 0,
        color: 'bg-rose-500',
      },
    ];

    // 6. Recent Transactions: Last 10 payments + last 5 expenses
    const recentPayments = await db.payment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        bill: {
          select: {
            id: true,
            guest: {
              select: { firstName: true, lastName: true },
            },
            reservation: {
              select: {
                room: { select: { roomNumber: true } },
              },
            },
          },
        },
      },
    });

    const recentExpenses = await db.expense.findMany({
      take: 5,
      orderBy: { expenseDate: 'desc' },
      select: {
        id: true,
        description: true,
        amount: true,
        paymentMethod: true,
        expenseDate: true,
        category: true,
      },
    });

    // Format recent transactions
    const recentTransactions = [
      ...recentPayments.map((p) => ({
        id: p.id,
        type: 'income' as const,
        description: p.bill.reservation
          ? `${p.bill.reservation.room.roomNumber} - ${p.bill.guest.firstName} ${p.bill.guest.lastName}`
          : `${p.bill.guest.firstName} ${p.bill.guest.lastName}`,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        date: p.createdAt.toISOString(),
      })),
      ...recentExpenses.map((e) => ({
        id: e.id,
        type: 'expense' as const,
        description: e.description,
        amount: -e.amount,
        paymentMethod: e.paymentMethod,
        date: e.expenseDate.toISOString(),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 7. Payment Methods Breakdown: From all payments in date range
    const paymentsWithMethod = await db.payment.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: { paymentMethod: true, amount: true },
    });

    const methodMap = new Map<string, number>();
    for (const p of paymentsWithMethod) {
      const current = methodMap.get(p.paymentMethod) || 0;
      methodMap.set(p.paymentMethod, current + p.amount);
    }

    const paymentMethodLabels: Record<string, string> = {
      cash: 'Cash',
      pos: 'POS / Card',
      bank_transfer: 'Bank Transfer',
      opay: 'OPay',
      palmpay: 'PalmPay',
      moniepoint: 'Moniepoint',
    };

    const paymentMethodsBreakdown = Array.from(methodMap.entries())
      .map(([method, total]) => ({
        method,
        label: paymentMethodLabels[method] || method.charAt(0).toUpperCase() + method.slice(1),
        total,
        percentage: monthlyRevenue > 0 ? Math.round((total / monthlyRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // 8. Previous month comparison for trend percentages
    const prevMonthStart = new Date(fromDate.getFullYear(), fromDate.getMonth() - 1, 1);
    const prevMonthEnd = new Date(fromDate.getFullYear(), fromDate.getMonth(), 0, 23, 59, 59, 999);

    const prevPayments = await db.payment.findMany({
      where: { createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      select: { amount: true },
    });
    const prevMonthRevenue = prevPayments.reduce((sum, p) => sum + p.amount, 0);

    const prevExpenses = await db.expense.findMany({
      where: { expenseDate: { gte: prevMonthStart, lte: prevMonthEnd } },
      select: { amount: true },
    });
    const prevMonthExpenses = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

    const revenueTrend =
      prevMonthRevenue > 0
        ? Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
        : 0;
    const profitTrend =
      prevMonthExpenses > 0
        ? Math.round(
            ((monthlyRevenue - totalExpenses - (prevMonthRevenue - prevMonthExpenses)) /
              (prevMonthRevenue - prevMonthExpenses || 1)) *
              100
          )
        : 0;

    return NextResponse.json({
      monthlyRevenue,
      outstandingBills: {
        count: outstandingBillCount,
        total: outstandingBillTotal,
      },
      totalExpenses,
      netProfit,
      revenueByCategory,
      recentTransactions,
      paymentMethodsBreakdown,
      trends: {
        revenue: revenueTrend,
        profit: profitTrend,
      },
    });
  } catch (error: unknown) {
    console.error('Accounts API error:', error);
    return NextResponse.json({ error: 'Failed to load accounts data' }, { status: 500 });
  }
}
