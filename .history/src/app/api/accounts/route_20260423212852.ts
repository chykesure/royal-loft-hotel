import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Auth check (non-blocking)
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (token) {
      try {
        const session = await db.session.findFirst({
          where: { token },
          include: { user: true },
        });
        if (session && session.expiresAt < new Date()) {
          await db.session.delete({ where: { id: session.id } });
        }
      } catch {}
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Date range
    let startDate: Date;
    let endDate: Date;

    if (fromParam && toParam) {
      startDate = new Date(fromParam);
      endDate = new Date(toParam);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Previous period for trends
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - periodDays);
    const prevEnd = new Date(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);

    // ═══════════════ REVENUE (from Bills) ═══════════════

    let totalCollected = 0;
    let roomRevenue = 0;
    let foodRevenue = 0;
    let barRevenue = 0;
    let spaRevenue = 0;
    let laundryRevenue = 0;
    let otherRevenue = 0;

    try {
      const bills = await db.bill.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: {
          paidAmount: true,
          roomCharges: true,
          foodCharges: true,
          barCharges: true,
          spaCharges: true,
          laundryCharges: true,
          otherCharges: true,
        },
      });

      totalCollected = bills.reduce((s, b) => s + b.paidAmount, 0);
      roomRevenue = bills.reduce((s, b) => s + b.roomCharges, 0);
      foodRevenue = bills.reduce((s, b) => s + b.foodCharges, 0);
      barRevenue = bills.reduce((s, b) => s + b.barCharges, 0);
      spaRevenue = bills.reduce((s, b) => s + b.spaCharges, 0);
      laundryRevenue = bills.reduce((s, b) => s + b.laundryCharges, 0);
      otherRevenue = bills.reduce((s, b) => s + b.otherCharges, 0);
    } catch (err) {
      console.error('[ACCOUNTS] Bill query failed:', err);
    }

    const monthlyRevenue = totalCollected;

    // ═══════════════ OUTSTANDING BILLS ═══════════════

    let outstandingCount = 0;
    let outstandingTotal = 0;

    try {
      const outstandingBills = await db.bill.findMany({
        where: { status: { in: ['open', 'partially_paid'] } },
        select: { balanceAmount: true },
      });

      outstandingCount = outstandingBills.length;
      outstandingTotal = outstandingBills.reduce((s, b) => s + b.balanceAmount, 0);
    } catch (err) {
      console.error('[ACCOUNTS] Outstanding bills query failed:', err);
    }

    // ═══════════════ EXPENSES (from Expense table) ═══════════════

    let totalExpenses = 0;

    try {
      const expenses = await db.expense.findMany({
        where: { expenseDate: { gte: startDate, lte: endDate } },
        select: { amount: true, category: true },
      });

      totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    } catch (err) {
      console.error('[ACCOUNTS] Expense query failed:', err);
    }

    // ═══════════════ PREVIOUS PERIOD (for trends) ═══════════════

    let prevRevenue = 0;
    let prevExpenses = 0;

    try {
      const prevBills = await db.bill.findMany({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
        select: { paidAmount: true },
      });
      prevRevenue = prevBills.reduce((s, b) => s + b.paidAmount, 0);
    } catch {}

    try {
      const prevExp = await db.expense.findMany({
        where: { expenseDate: { gte: prevStart, lte: prevEnd } },
        select: { amount: true },
      });
      prevExpenses = prevExp.reduce((s, e) => s + e.amount, 0);
    } catch {}

    const netProfit = monthlyRevenue - totalExpenses;
    const prevProfit = prevRevenue - prevExpenses;

    const revenueTrend = prevRevenue > 0
      ? Math.round(((monthlyRevenue - prevRevenue) / prevRevenue) * 100)
      : (monthlyRevenue > 0 ? 100 : 0);
    const profitTrend = prevProfit > 0
      ? Math.round(((netProfit - prevProfit) / prevProfit) * 100)
      : (netProfit > 0 ? 100 : 0);

    // ═══════════════ REVENUE BY CATEGORY ═══════════════

    const categoryColors = [
      { name: 'Room Charges', color: 'bg-emerald-500' },
      { name: 'Food & Beverage', color: 'bg-blue-500' },
      { name: 'Bar & Lounge', color: 'bg-purple-500' },
      { name: 'Spa & Services', color: 'bg-pink-500' },
      { name: 'Laundry', color: 'bg-cyan-500' },
      { name: 'Other Services', color: 'bg-amber-500' },
    ];

    const rawCategories = [
      { name: 'Room Charges', amount: roomRevenue },
      { name: 'Food & Beverage', amount: foodRevenue },
      { name: 'Bar & Lounge', amount: barRevenue },
      { name: 'Spa & Services', amount: spaRevenue },
      { name: 'Laundry', amount: laundryRevenue },
      { name: 'Other Services', amount: otherRevenue },
    ].filter(c => c.amount > 0);

    const revenueCategoryTotal = rawCategories.reduce((s, c) => s + c.amount, 0);

    const revenueByCategory: { name: string; amount: number; percentage: number; color: string }[] = rawCategories.map(c => {
      const colorInfo = categoryColors.find(cc => cc.name === c.name);
      return {
        name: c.name,
        amount: Math.round(c.amount * 100) / 100,
        percentage: revenueCategoryTotal > 0 ? Math.round((c.amount / revenueCategoryTotal) * 100) : 0,
        color: colorInfo?.color || 'bg-gray-500',
      };
    });

    // ═══════════════ RECENT TRANSACTIONS ═══════════════

    let recentTransactions: any[] = [];

    // Income transactions (payments)
    try {
      const payments = await db.payment.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          bill: {
            include: {
              guest: { select: { firstName: true, lastName: true } },
              reservation: { select: { room: { select: { roomNumber: true } } } },
            },
          },
        },
      });

      recentTransactions.push(...payments
        .filter(p => p.createdAt >= startDate && p.createdAt <= endDate)
        .map((p: any) => ({
          id: p.id,
          type: 'income',
          description: p.bill?.guest
            ? `Room Payment - ${p.bill.guest.firstName} ${p.bill.guest.lastName}${p.bill.reservation?.room ? ` (Room ${p.bill.reservation.room.roomNumber})` : ''}`
            : `Payment${p.notes ? ` - ${p.notes}` : ''}`,
          amount: Math.round(p.amount * 100) / 100,
          paymentMethod: p.paymentMethod || 'cash',
          date: p.createdAt.toISOString(),
        }))
      );
    } catch (err) {
      console.error('[ACCOUNTS] Income transactions failed:', err);
    }

    // Expense transactions
    try {
      const expenses = await db.expense.findMany({
        take: 50,
        orderBy: { expenseDate: 'desc' },
      });

      recentTransactions.push(...expenses
        .filter(e => e.expenseDate >= startDate && e.expenseDate <= endDate)
        .map((e: any) => ({
          id: e.id,
          type: 'expense',
          description: e.description || e.category,
          amount: Math.round(e.amount * 100) / 100,
          paymentMethod: e.paymentMethod || 'cash',
          date: e.expenseDate.toISOString(),
        }))
      );
    } catch (err) {
      console.error('[ACCOUNTS] Expense transactions failed:', err);
    }

    // Sort by date descending
    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    recentTransactions = recentTransactions.slice(0, 50);

    // ═══════════════ PAYMENT METHODS BREAKDOWN ═══════════════

    const methodMap: Record<string, number> = {};
    const methodLabels: Record<string, string> = {
      cash: 'Cash',
      pos: 'POS / Card',
      bank_transfer: 'Bank Transfer',
      opay: 'OPay',
      palmpay: 'PalmPay',
      moniepoint: 'Moniepoint',
    };

    try {
      const payments = await db.payment.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { amount: true, paymentMethod: true },
      });

      for (const p of payments) {
        methodMap[p.paymentMethod] = (methodMap[p.paymentMethod] || 0) + p.amount;
      }
    } catch (err) {
      console.error('[ACCOUNTS] Payment methods failed:', err);
    }

    const methodTotal = Object.values(methodMap).reduce((s, a) => s + a, 0);

    const paymentMethodsBreakdown = Object.entries(methodMap)
      .map(([method, total]) => ({
        method,
        label: methodLabels[method] || method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' '),
        total: Math.round(total * 100) / 100,
        percentage: methodTotal > 0 ? Math.round((total / methodTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ═══════════════ RESPONSE (matches AccountsModule interface) ═══════════════

    return NextResponse.json({
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      outstandingBills: {
        count: outstandingCount,
        total: Math.round(outstandingTotal * 100) / 100,
      },
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      revenueByCategory,
      recentTransactions,
      paymentMethodsBreakdown,
      trends: {
        revenue: revenueTrend,
        profit: profitTrend,
      },
    });
  } catch (error: unknown) {
    console.error('Accounts error:', error);
    return NextResponse.json({ error: 'Failed to load accounts data' }, { status: 500 });
  }
}