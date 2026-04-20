import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await db.session.findFirst({ where: { token } });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0];

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to + 'T23:59:59');

    // ===== REVENUE (from Bills) =====
    const bills = await db.bill.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
    });

    const revenueData = {
      total: 0,
      roomCharges: 0,
      foodCharges: 0,
      barCharges: 0,
      spaCharges: 0,
      laundryCharges: 0,
      otherCharges: 0,
    };

    for (const bill of bills as any[]) {
      revenueData.total += bill.totalAmount;
      revenueData.roomCharges += bill.roomCharges;
      revenueData.foodCharges += bill.foodCharges;
      revenueData.barCharges += bill.barCharges;
      revenueData.spaCharges += bill.spaCharges;
      revenueData.laundryCharges += bill.laundryCharges;
      revenueData.otherCharges += bill.otherCharges;
    }

    // ===== PAYMENTS RECEIVED =====
    const payments = await db.payment.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
    });
    const paymentsReceived = payments.reduce((sum, p) => sum + p.amount, 0);

    // ===== OUTSTANDING BILLS =====
    const outstandingBills = await db.bill.findMany({
      where: { status: { in: ['open', 'partially_paid'] } },
    });
    const outstandingTotal = outstandingBills.reduce((sum, b) => sum + b.balanceAmount, 0);

    // ===== EXPENSES =====
    // NOTE: If your Expense model uses 'expenseDate' instead of 'date',
    // change the line below from { date: ... } to { expenseDate: ... }
    const expenses = await db.expense.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
    });

    const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryMap: Record<string, { amount: number; count: number }> = {};
    for (const exp of expenses) {
      if (!categoryMap[exp.category]) {
        categoryMap[exp.category] = { amount: 0, count: 0 };
      }
      categoryMap[exp.category].amount += exp.amount;
      categoryMap[exp.category].count += 1;
    }
    const expensesByCategory = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        amount: Math.round(data.amount * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    // ===== PAYROLL =====
    const allPayroll = await db.payrollRecord.findMany({
      include: { staff: { select: { department: true } } },
    });

    const fromMonth = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}`;
    const toMonth = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}`;

    const filteredPayroll = allPayroll.filter((p: any) => p.period >= fromMonth && p.period <= toMonth);
    const payrollTotal = filteredPayroll.reduce((sum, p: any) => sum + p.netPay, 0);

    const deptMap: Record<string, { amount: number; count: number }> = {};
    for (const pr of filteredPayroll as any[]) {
      const dept = pr.staff?.department || 'Unknown';
      if (!deptMap[dept]) {
        deptMap[dept] = { amount: 0, count: 0 };
      }
      deptMap[dept].amount += pr.netPay;
      deptMap[dept].count += 1;
    }
    const payrollByDepartment = Object.entries(deptMap)
      .map(([department, data]) => ({
        department,
        amount: Math.round(data.amount * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    // ===== NET PROFIT =====
    const netProfit = revenueData.total - expensesTotal - payrollTotal;

    // ===== MONTHLY BREAKDOWN =====
    const monthlyMap: Record<string, { revenue: number; expenses: number; payroll: number }> = {};

    for (const bill of bills as any[]) {
      const billDate = new Date(bill.createdAt);
      const key = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, expenses: 0, payroll: 0 };
      monthlyMap[key].revenue += bill.totalAmount;
    }

    // NOTE: If your Expense model uses 'expenseDate', change exp.date to exp.expenseDate
    for (const exp of expenses as any[]) {
      const expDate = new Date(exp.date);
      const key = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, expenses: 0, payroll: 0 };
      monthlyMap[key].expenses += exp.amount;
    }

    for (const pr of filteredPayroll as any[]) {
      const key = pr.period;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, expenses: 0, payroll: 0 };
      monthlyMap[key].payroll += pr.netPay;
    }

    const monthNames: Record<string, string> = {
      '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
    };

    const monthlyBreakdown = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const monthProfit = data.revenue - data.expenses - data.payroll;
        return {
          month,
          monthLabel: `${monthNames[month.split('-')[1]]} ${month.split('-')[0]}`,
          revenue: Math.round(data.revenue * 100) / 100,
          expenses: Math.round(data.expenses * 100) / 100,
          payroll: Math.round(data.payroll * 100) / 100,
          netProfit: Math.round(monthProfit * 100) / 100,
        };
      });

    return NextResponse.json({
      revenue: {
        total: Math.round(revenueData.total * 100) / 100,
        roomCharges: Math.round(revenueData.roomCharges * 100) / 100,
        foodCharges: Math.round(revenueData.foodCharges * 100) / 100,
        barCharges: Math.round(revenueData.barCharges * 100) / 100,
        spaCharges: Math.round(revenueData.spaCharges * 100) / 100,
        laundryCharges: Math.round(revenueData.laundryCharges * 100) / 100,
        otherCharges: Math.round(revenueData.otherCharges * 100) / 100,
      },
      paymentsReceived: Math.round(paymentsReceived * 100) / 100,
      outstandingBills: Math.round(outstandingTotal * 100) / 100,
      expenses: {
        total: Math.round(expensesTotal * 100) / 100,
        byCategory: expensesByCategory,
      },
      payroll: {
        total: Math.round(payrollTotal * 100) / 100,
        byDepartment: payrollByDepartment,
      },
      netProfit: Math.round(netProfit * 100) / 100,
      monthlyBreakdown,
    });
  } catch (error: unknown) {
    console.error('Financial report error:', error);
    return NextResponse.json({ error: 'Failed to generate financial report' }, { status: 500 });
  }
}