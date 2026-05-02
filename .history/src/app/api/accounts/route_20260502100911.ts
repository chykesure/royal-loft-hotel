// src/app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// --- Auth helper ---
async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  } as any);

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }
  return session;
}

// --- Payment Methods helper ---
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
        total: p.amount || 0,
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

// --- Compute previous period ---
function getPreviousPeriod(from: Date, to: Date) {
  const rangeMs = to.getTime() - from.getTime();
  const prevEnd = new Date(from.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - rangeMs);
  return { prevStart, prevEnd };
}

// --- Revenue Category Breakdown ---
function computeRevenueCategories(bills: any[]) {
  const room = bills.reduce((s: number, b: any) => s + (b.roomCharges || 0), 0);
  const food = bills.reduce((s: number, b: any) => s + (b.foodCharges || 0), 0);
  const bar = bills.reduce((s: number, b: any) => s + (b.barCharges || 0), 0);
  const spa = bills.reduce((s: number, b: any) => s + (b.spaCharges || 0), 0);
  const laundry = bills.reduce((s: number, b: any) => s + (b.laundryCharges || 0), 0);
  const other = bills.reduce((s: number, b: any) => s + (b.otherCharges || 0), 0);
  const totalCat = room + food + bar + spa + laundry + other;

  return [
    { name: 'Room Charges', amount: room, percentage: totalCat > 0 ? Math.round((room / totalCat) * 100) : 0, color: 'bg-emerald-500' },
    { name: 'Food & Beverage', amount: food, percentage: totalCat > 0 ? Math.round((food / totalCat) * 100) : 0, color: 'bg-blue-500' },
    { name: 'Bar & Lounge', amount: bar, percentage: totalCat > 0 ? Math.round((bar / totalCat) * 100) : 0, color: 'bg-purple-500' },
    { name: 'Spa & Services', amount: spa, percentage: totalCat > 0 ? Math.round((spa / totalCat) * 100) : 0, color: 'bg-pink-500' },
    { name: 'Laundry', amount: laundry, percentage: totalCat > 0 ? Math.round((laundry / totalCat) * 100) : 0, color: 'bg-orange-500' },
    { name: 'Other Services', amount: other, percentage: totalCat > 0 ? Math.round((other / totalCat) * 100) : 0, color: 'bg-gray-500' },
  ];
}

// --- MAIN HANDLER ---
export async function GET(request: NextRequest) {
  try {
    const session = await authenticate();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'overview';

    // Parse date range
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    let from: Date, to: Date;
    if (fromParam && toParam) {
      from = new Date(fromParam);
      to = new Date(toParam);
    } else {
      const now = new Date();
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    if (view === 'revenue') return handleRevenueDetail(from, to);
    if (view === 'expenses') return handleExpenseDetail(from, to);
    return handleOverview(from, to);
  } catch (error: unknown) {
    console.error('Accounts error:', error);
    return NextResponse.json({ error: 'Failed to load accounts data' }, { status: 500 });
  }
}

// --- OVERVIEW HANDLER ---
async function handleOverview(monthStart: Date, monthEnd: Date) {
  const currentPeriod = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

  // Monthly revenue
  const monthlyBills = await db.bill.findMany({
    where: { createdAt: { gte: monthStart, lte: monthEnd } },
    select: { totalAmount: true, roomCharges: true, foodCharges: true, barCharges: true, spaCharges: true, laundryCharges: true, otherCharges: true },
  } as any);
  const monthlyRevenue = monthlyBills.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);

  // Revenue by category
  const revenueByCategory = computeRevenueCategories(monthlyBills);

  // Outstanding
  const outstandingRecords = await db.bill.findMany({
    where: { status: { in: ['open', 'partially_paid'] } },
    select: { balanceAmount: true },
  } as any);
  const outstandingBills = {
    count: outstandingRecords.length,
    total: outstandingRecords.reduce((s: number, b: any) => s + (b.balanceAmount || 0), 0),
  };

  // Grand totals
  const [grandRev, grandExp] = await Promise.all([
    db.bill.aggregate({ _sum: { totalAmount: true } }),
    db.expense.aggregate({ _sum: { amount: true, total: true } }),
  ] as any[]);
  const grandTotalRevenue = grandRev._sum.totalAmount || 0;
  const grandTotalExpenses = (grandExp._sum.amount || 0) + (grandExp._sum.total || 0);
  const grandTotalProfit = grandTotalRevenue - grandTotalExpenses;

  // Monthly expenses
  const monthlyExpRecords = await db.expense.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    select: { amount: true, total: true },
  } as any);
  const totalExpenses = monthlyExpRecords.reduce((s: number, e: any) => s + (e.amount || e.total || 0), 0);

  // Monthly payroll
  let monthlyPayroll = 0;
  try {
    const payRecords = await db.payrollRecord.findMany({ where: { period: currentPeriod }, select: { netPay: true } } as any);
    monthlyPayroll = payRecords.reduce((s: number, p: any) => s + (p.netPay || 0), 0);
  } catch { /* PayrollRecord may not exist */ }

  const netProfit = monthlyRevenue - totalExpenses - monthlyPayroll;

  // Trends
  const prevStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const prevEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0, 23, 59, 59, 999);
  const prevPeriod = `${prevStart.getFullYear()}-${String(prevStart.getMonth() + 1).padStart(2, '0')}`;
  let trends = { revenue: 0, profit: 0 };

  try {
    const prevBills = await db.bill.findMany({ where: { createdAt: { gte: prevStart, lte: prevEnd } }, select: { totalAmount: true } } as any);
    const prevRevenue = prevBills.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
    const prevExp = await db.expense.findMany({ where: { date: { gte: prevStart, lte: prevEnd } }, select: { amount: true, total: true } } as any);
    const prevExpTotal = prevExp.reduce((s: number, e: any) => s + (e.amount || e.total || 0), 0);
    let prevPayroll = 0;
    try {
      const prevPay = await db.payrollRecord.findMany({ where: { period: prevPeriod }, select: { netPay: true } } as any);
      prevPayroll = prevPay.reduce((s: number, p: any) => s + (p.netPay || 0), 0);
    } catch { /* ignore */ }
    const prevProfit = prevRevenue - prevExpTotal - prevPayroll;

    if (prevRevenue > 0) trends.revenue = Math.round(((monthlyRevenue - prevRevenue) / prevRevenue) * 100);
    if (prevProfit !== 0) trends.profit = Math.round(((netProfit - prevProfit) / Math.abs(prevProfit)) * 100);
  } catch { /* trends stay at 0 */ }

  // Recent transactions
  const recentPayments = await db.payment.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: { bill: { include: { guest: { select: { firstName: true, lastName: true } } } } },
  } as any);
  const recentExpenseRecords = await db.expense.findMany({
    take: 20,
    orderBy: { date: 'desc' },
  } as any);

  const incomeTx = recentPayments.map((p: any) => ({
    id: p.id,
    date: p.createdAt,
    description: p.bill?.guest ? `Payment - ${p.bill.guest.firstName} ${p.bill.guest.lastName}` : `Payment${p.notes ? ` - ${p.notes}` : ''}`,
    amount: p.amount,
    type: 'income' as const,
    paymentMethod: p.paymentMethod || 'cash',
  }));

  const expenseTx = recentExpenseRecords.map((e: any) => ({
    id: e.id,
    date: e.date,
    description: e.name || e.description || e.category || 'Expense',
    amount: e.amount || e.total || 0,
    type: 'expense' as const,
    paymentMethod: e.paymentMethod || e.reference || e.vendor || 'cash',
  }));

  const recentTransactions = [...incomeTx, ...expenseTx]
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  const paymentMethodsBreakdown = buildPaymentMethodsBreakdown(recentPayments);

  return NextResponse.json({
    grandTotalRevenue,
    grandTotalExpenses,
    grandTotalProfit,
    monthlyRevenue,
    outstandingBills,
    totalExpenses,
    netProfit,
    revenueByCategory,
    recentTransactions,
    paymentMethodsBreakdown,
    trends,
  });
}

// --- REVENUE DETAIL HANDLER ---
async function handleRevenueDetail(from: Date, to: Date) {
  // Grand total
  const grandRev = await db.bill.aggregate({ _sum: { totalAmount: true } } as any);
  const grandTotal = grandRev._sum.totalAmount || 0;

  // Current period bills
  const bills = await db.bill.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: {
      guest: { select: { firstName: true, lastName: true } },
      reservation: { select: { checkIn: true, checkOut: true, roomNumber: true } },
      payments: { select: { amount: true, paymentMethod: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  } as any);

  const currentTotal = bills.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
  const currentCategories = computeRevenueCategories(bills);

  // Previous period
  const { prevStart, prevEnd } = getPreviousPeriod(from, to);
  const prevBills = await db.bill.findMany({
    where: { createdAt: { gte: prevStart, lte: prevEnd } },
    select: { totalAmount: true, roomCharges: true, foodCharges: true, barCharges: true, spaCharges: true, laundryCharges: true, otherCharges: true },
  } as any);
  const prevTotal = prevBills.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
  const prevCategories = computeRevenueCategories(prevBills);

  const change = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0;

  // Format bills for frontend
  const formattedBills = bills.map((b: any) => {
    const guestName = b.guest ? `${b.guest.firstName} ${b.guest.lastName}` : 'Walk-in';
    const totalPaid = (b.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const methods = [...new Set((b.payments || []).map((p: any) => p.paymentMethod).filter(Boolean))];
    return {
      id: b.id,
      guestName,
      totalAmount: b.totalAmount || 0,
      balanceAmount: b.balanceAmount || 0,
      totalPaid,
      status: b.status || 'open',
      createdAt: b.createdAt,
      roomNumber: b.reservation?.roomNumber || '-',
      paymentMethods: methods,
    };
  });

  return NextResponse.json({
    grandTotal,
    current: {
      from: from.toISOString(),
      to: to.toISOString(),
      total: currentTotal,
      billCount: bills.length,
      categoryBreakdown: currentCategories,
      bills: formattedBills,
    },
    previous: {
      from: prevStart.toISOString(),
      to: prevEnd.toISOString(),
      total: prevTotal,
      billCount: prevBills.length,
      categoryBreakdown: prevCategories,
    },
    change,
  });
}

// --- EXPENSE DETAIL HANDLER ---
async function handleExpenseDetail(from: Date, to: Date) {
  // Grand total
  const grandExp = await db.expense.aggregate({ _sum: { amount: true, total: true } } as any);
  const grandTotal = (grandExp._sum.amount || 0) + (grandExp._sum.total || 0);

  // Current period expenses
  const expenses = await db.expense.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: 'desc' },
  } as any);

  const currentTotal = expenses.reduce((s: number, e: any) => s + (e.amount || e.total || 0), 0);

  // Category breakdown for current period
  const catMapCurrent: Record<string, number> = {};
  for (const e of expenses) {
    const cat = (e.category || 'miscellaneous').toLowerCase();
    catMapCurrent[cat] = (catMapCurrent[cat] || 0) + (e.amount || e.total || 0);
  }
  const currentCategories = Object.entries(catMapCurrent)
    .map(([cat, amount]) => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      amount,
      percentage: currentTotal > 0 ? Math.round((amount / currentTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Previous period
  const { prevStart, prevEnd } = getPreviousPeriod(from, to);
  const prevExpenses = await db.expense.findMany({
    where: { date: { gte: prevStart, lte: prevEnd } },
    select: { amount: true, total: true, category: true },
  } as any);
  const prevTotal = prevExpenses.reduce((s: number, e: any) => s + (e.amount || e.total || 0), 0);

  const catMapPrev: Record<string, number> = {};
  for (const e of prevExpenses) {
    const cat = (e.category || 'miscellaneous').toLowerCase();
    catMapPrev[cat] = (catMapPrev[cat] || 0) + (e.amount || e.total || 0);
  }
  const prevCategories = Object.entries(catMapPrev)
    .map(([cat, amount]) => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      amount,
      percentage: prevTotal > 0 ? Math.round((amount / prevTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const change = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0;

  // Format expenses for frontend
  const formattedExpenses = expenses.map((e: any) => ({
    id: e.id,
    name: e.name || e.description || e.category || 'Expense',
    amount: e.amount || e.total || 0,
    category: e.category || 'miscellaneous',
    vendor: e.vendor || '-',
    date: e.date,
    paymentMethod: e.paymentMethod || e.reference || '',
  }));

  return NextResponse.json({
    grandTotal,
    current: {
      from: from.toISOString(),
      to: to.toISOString(),
      total: currentTotal,
      expenseCount: expenses.length,
      categoryBreakdown: currentCategories,
      expenses: formattedExpenses,
    },
    previous: {
      from: prevStart.toISOString(),
      to: prevEnd.toISOString(),
      total: prevTotal,
      expenseCount: prevExpenses.length,
      categoryBreakdown: prevCategories,
    },
    change,
  });
}