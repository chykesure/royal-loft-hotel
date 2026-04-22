import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  const session = await db.session.findFirst({
    where: { token },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

// ── GET: List expenses with optional filters ──
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      take: 200,
    });

    // Total all time
    const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);

    // This month total
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let thisMonthTotal = 0;
    try {
      const monthAgg = await db.expense.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: monthStart, lte: monthEnd },
        } as any,
      });
      thisMonthTotal = Math.round((monthAgg._sum?.amount ?? 0) * 100) / 100;
    } catch (err) {
      console.error('[EXPENSES] Month aggregate failed:', err);
    }

    // Category summary — matching what the component expects
    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const exp of expenses) {
      const existing = categoryMap.get(exp.category) || { amount: 0, count: 0 };
      existing.amount += exp.amount;
      existing.count += 1;
      categoryMap.set(exp.category, existing);
    }

    const categorySummary = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        _sum: { amount: Math.round(data.amount * 100) / 100 },
        _count: { id: data.count },
      }))
      .sort((a, b) => (b._sum.amount || 0) - (a._sum.amount || 0));

    return NextResponse.json({
      expenses,
      categorySummary,
      thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
      totalAll: Math.round(totalAll * 100) / 100,
    });
  } catch (error: unknown) {
    console.error('Expenses GET error:', error);
    return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 });
  }
}

// ── POST: Create a new expense ──
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description, category, amount, date, paymentMethod, vendor, receiptRef, notes } = body;

    if (!description || !amount || !date) {
      return NextResponse.json({ error: 'Description, amount, and date are required' }, { status: 400 });
    }

    const expense = await db.expense.create({
      data: {
        description,
        category: category || 'miscellaneous',
        amount: parseFloat(amount),
        date: new Date(date),
        vendor: vendor || null,
        reference: receiptRef || null,
        createdBy: user.id,
      } as any,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: unknown) {
    console.error('Expenses POST error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

// ── PUT: Update an expense ──
export async function PUT(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, description, category, amount, date, paymentMethod, vendor, receiptRef, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const expense = await db.expense.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(category && { category }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
        ...(vendor !== undefined && { vendor: vendor || null }),
        ...(receiptRef !== undefined && { reference: receiptRef || null }),
      } as any,
    });

    return NextResponse.json(expense);
  } catch (error: unknown) {
    console.error('Expenses PUT error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// ── DELETE: Delete an expense ──
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