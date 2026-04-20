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

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month'; // today, week, month, year, all
    const txType = searchParams.get('type') || 'all'; // all, income, expense
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Date range calculation
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        startDate = new Date(2020, 0, 1);
        endDate = new Date(now.getFullYear() + 5, 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // ═══════════════ REVENUE DATA ═══════════════

    // Bills created in range
    const monthlyBills = await db.bill.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: {
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        roomCharges: true,
        foodCharges: true,
        barCharges: true,
        spaCharges: true,
        laundryCharges: true,
        otherCharges: true,
        discountAmount: true,
        status: true,
      },
    });

    const totalBilled = monthlyBills.reduce((s, b) => s + b.totalAmount, 0);
    const totalCollected = monthlyBills.reduce((s, b) => s + b.paidAmount, 0);
    const roomRevenue = monthlyBills.reduce((s, b) => s + b.roomCharges, 0);
    const foodRevenue = monthlyBills.reduce((s, b) => s + b.foodCharges, 0);
    const barRevenue = monthlyBills.reduce((s, b) => s + b.barCharges, 0);
    const spaRevenue = monthlyBills.reduce((s, b) => s + b.spaCharges, 0);
    const laundryRevenue = monthlyBills.reduce((s, b) => s + b.laundryCharges, 0);
    const otherRevenue = monthlyBills.reduce((s, b) => s + b.otherCharges, 0);
    const totalDiscounts = monthlyBills.reduce((s, b) => s + b.discountAmount, 0);

    const revenueByCategory = [
      { category: 'Room Charges', amount: roomRevenue },
      { category: 'Food & Beverage', amount: foodRevenue },
      { category: 'Bar & Lounge', amount: barRevenue },
      { category: 'Spa & Services', amount: spaRevenue },
      { category: 'Laundry', amount: laundryRevenue },
      { category: 'Other Services', amount: otherRevenue },
    ].filter(c => c.amount > 0);

    // Outstanding bills (all time)
    const outstandingResult = await db.bill.aggregate({
      where: { status: { in: ['open', 'partially_paid'] } },
      _sum: { balanceAmount: true },
    });
    const outstandingBills = outstandingResult._sum.balanceAmount || 0;

    // ═══════════════ EXPENSES DATA ═══════════════

    const expenses = await db.expense.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { amount: true, category: true },
    } as any);

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    // Expense by category
    const expenseByCategoryMap: Record<string, number> = {};
    for (const e of expenses) {
      expenseByCategoryMap[e.category] = (expenseByCategoryMap[e.category] || 0) + e.amount;
    }
    const expenseByCategory = Object.entries(expenseByCategoryMap)
      .map(([category, amount]) => ({ category: category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), amount }))
      .sort((a, b) => b.amount - a.amount);

    // ═══════════════ PAYROLL DATA ═══════════════

    const payrollRecords = await db.payrollRecord.findMany({
      where: { period: currentPeriod },
      select: { netPay: true, status: true, basicSalary: true, deductions: true },
    });

    const monthlyPayroll = payrollRecords.reduce((s, p) => s + p.netPay, 0);
    const processedPayroll = payrollRecords.filter(p => p.status === 'paid' || p.status === 'processed').reduce((s, p) => s + p.netPay, 0);
    const pendingPayroll = payrollRecords.filter(p => p.status === 'pending').reduce((s, p) => s + p.netPay, 0);

    // ═══════════════ NET PROFIT ═══════════════

    const netProfit = totalCollected - totalExpenses - monthlyPayroll;
    const profitMargin = totalCollected > 0 ? ((netProfit / totalCollected) * 100) : 0;

    // ═══════════════ PAYMENT METHOD DISTRIBUTION ═══════════════

    const paymentsInRange = await db.payment.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { amount: true, paymentMethod: true },
    });

    const methodMap: Record<string, number> = {};
    for (const p of paymentsInRange) {
      const label = p.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      methodMap[label] = (methodMap[label] || 0) + p.amount;
    }
    const paymentMethods = Object.entries(methodMap)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);

    // ═══════════════ DAILY REVENUE TREND (last 14 days) ═══════════════

    const dailyBills = await db.bill.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true, totalAmount: true, paidAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyRevenueMap: Record<string, { billed: number; collected: number }> = {};
    for (const b of dailyBills) {
      const day = b.createdAt.toISOString().split('T')[0];
      if (!dailyRevenueMap[day]) dailyRevenueMap[day] = { billed: 0, collected: 0 };
      dailyRevenueMap[day].billed += b.totalAmount;
      dailyRevenueMap[day].collected += b.paidAmount;
    }
    const dailyRevenue = Object.entries(dailyRevenueMap)
      .map(([date, data]) => ({ date, ...data }))
      .slice(-14); // last 14 days

    // ═══════════════ RECENT TRANSACTIONS ═══════════════

    // Income transactions (payments)
    let incomeTx: any[] = [];
    if (txType === 'all' || txType === 'income') {
      const payments = await db.payment.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          bill: {
            include: {
              guest: { select: { firstName: true, lastName: true } },
              reservation: { select: { confirmationCode: true, room: { select: { roomNumber: true } } } },
            },
          },
        },
      });

      incomeTx = payments
        .filter(p => p.createdAt >= startDate && p.createdAt <= endDate)
        .map((p: any) => ({
          id: p.id,
          date: p.createdAt,
          description: p.bill?.guest
            ? `Room Payment — ${p.bill.guest.firstName} ${p.bill.guest.lastName}${p.bill.reservation ? ` (Room ${p.bill.reservation.room?.roomNumber})` : ''}`
            : `Payment${p.notes ? ` — ${p.notes}` : ''}`,
          amount: p.amount,
          type: 'income' as const,
          method: p.paymentMethod ? p.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : null,
          category: 'room_payment',
          reference: p.paymentRef || null,
        }));
    }

    // Expense transactions
    let expenseTx: any[] = [];
    if (txType === 'all' || txType === 'expense') {
      const exps = await db.expense.findMany({
        take: 100,
        orderBy: { date: 'desc' },
      } as any);

      expenseTx = exps
        .filter(e => new Date(e.date) >= startDate && new Date(e.date) <= endDate)
        .map((e: any) => ({
          id: e.id,
          date: e.date,
          description: e.description || e.category,
          amount: e.amount,
          type: 'expense' as const,
          method: null,
          category: e.category,
          reference: e.reference || e.vendor || null,
        }));
    }

    // Merge, sort, paginate
    const allTx = [...incomeTx, ...expenseTx]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalTx = allTx.length;
    const paginatedTx = allTx.slice((page - 1) * limit, page * limit);
    const totalPages = Math.ceil(totalTx / limit);

    return NextResponse.json({
      summary: {
        totalBilled,
        totalCollected,
        outstandingBills,
        totalExpenses,
        monthlyPayroll,
        pendingPayroll,
        processedPayroll,
        totalDiscounts,
        netProfit,
        profitMargin: Math.round(profitMargin * 10) / 10,
        totalTransactions: totalTx,
      },
      revenueByCategory,
      expenseByCategory,
      paymentMethods,
      dailyRevenue,
      transactions: paginatedTx,
      pagination: { page, limit, total: totalTx, totalPages },
    });
  } catch (error: unknown) {
    console.error('Accounts error:', error);
    return NextResponse.json({ error: 'Failed to load accounts data' }, { status: 500 });
  }
}