import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const month = searchParams.get('month');

    const where: any = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 0, 23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    } else if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from + 'T00:00:00');
      if (to) where.date.lte = new Date(to + 'T23:59:59');
    }

    const expenses = await db.expense.findMany({
      where: where as any,
      orderBy: { date: 'desc' } as any,
      take: 500,
    });

    const mappedExpenses = expenses.map((e: Record<string, unknown>) => ({
      ...e,
      expenseDate: e.date,
    }));

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const monthTotal = await db.expense.aggregate({
      _sum: { amount: true },
      where: {
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999),
        },
      } as any,
    });

    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const exp of expenses) {
      const existing = categoryMap.get(exp.category) || { amount: 0, count: 0 };
      existing.amount += exp.amount;
      existing.count += 1;
      categoryMap.set(exp.category, existing);
    }
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: Math.round(data.amount * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      expenses: mappedExpenses,
      total: Math.round(total * 100) / 100,
      monthTotal: Math.round((monthTotal._sum?.amount ?? 0) * 100) / 100,
      categoryBreakdown,
    });
  } catch (error: unknown) {
    console.error('Expenses GET error:', error);
    return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const dateVal = body.date || body.expenseDate;
    const { category, description, amount, vendor, reference, paymentMethod, notes } = body;

    if (!dateVal || !category || !description || !amount) {
      return NextResponse.json({ error: 'date, category, description, and amount are required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {
      date: new Date(dateVal),
      category,
      description,
      amount: parseFloat(amount),
      vendor: vendor || null,
      reference: reference || null,
      createdBy: user.id,
    };
    if (paymentMethod) (data as Record<string, unknown>).paymentMethod = paymentMethod;
    if (notes) (data as Record<string, unknown>).notes = notes;

    const expense = await db.expense.create({ data: data as any });
    return NextResponse.json(expense, { status: 201 });
  } catch (error: unknown) {
    console.error('Expenses POST error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;
    const dateVal = body.date || body.expenseDate;
    const { category, description, amount, vendor, reference, paymentMethod, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (dateVal) data.date = new Date(dateVal);
    if (category) data.category = category;
    if (description) data.description = description;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (vendor !== undefined) data.vendor = vendor || null;
    if (reference !== undefined) data.reference = reference || null;
    if (paymentMethod) data.paymentMethod = paymentMethod;
    if (notes !== undefined) data.notes = notes;

    const expense = await db.expense.update({
      where: { id },
      data: data as any,
    });

    return NextResponse.json(expense);
  } catch (error: unknown) {
    console.error('Expenses PUT error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Expenses DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}