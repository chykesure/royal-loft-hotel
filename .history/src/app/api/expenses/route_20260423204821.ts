import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  try {
    const session = await db.session.findUnique({
      where: { token },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await db.session.delete({ where: { id: session.id } });
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

// ── GET ──
export async function GET(request: NextRequest) {
  try {
    let user: { id: string; name: string; role: string } | null = null;
    try { user = await authenticate(); } catch {}

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
      where.expenseDate = { gte: startDate, lte: endDate };
    } else if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(from + 'T00:00:00');
      if (to) where.expenseDate.lte = new Date(to + 'T23:59:59');
    }

    let expenses: any[] = [];
    try {
      expenses = await db.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        take: 500,
      });
    } catch (dbErr: unknown) {
      console.error('Expense findMany error:', dbErr);
    }

    const total = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    let monthTotalAmount = 0;
    try {
      const now = new Date();
      const monthTotal = await db.expense.aggregate({
        _sum: { amount: true },
        where: {
          expenseDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
          },
        },
      });
      monthTotalAmount = Math.round((monthTotal._sum?.amount ?? 0) * 100) / 100;
    } catch {}

    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const exp of expenses) {
      const existing = categoryMap.get(exp.category) || { amount: 0, count: 0 };
      existing.amount += exp.amount || 0;
      existing.count += 1;
      categoryMap.set(exp.category, existing);
    }
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([cat, data]) => ({
        category: cat,
        amount: Math.round(data.amount * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      expenses,
      total: Math.round(total * 100) / 100,
      monthTotal: monthTotalAmount,
      categoryBreakdown,
    });
  } catch (error: unknown) {
    console.error('Expenses GET error:', error);
    return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 });
  }
}

// ── POST ──
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate();

    const body = await request.json();
    const { category, description, amount, vendor, reference, paymentMethod, notes } = body;
    const dateVal = body.date || body.expenseDate;

    if (!dateVal || !category || !description || !amount) {
      return NextResponse.json(
        { error: 'date, category, description, and amount are required' },
        { status: 400 }
      );
    }

    const expense = await db.expense.create({
      data: {
        expenseDate: new Date(dateVal),
        category,
        description,
        amount: parseFloat(amount),
        vendor: vendor || null,
        reference: reference || null,
        paymentMethod: paymentMethod || 'cash',
        notes: notes || null,
        createdBy: user?.id || null,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: unknown) {
    console.error('Expenses POST error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

// ── PUT ──
export async function PUT(request: NextRequest) {
  try {
    await authenticate();

    const body = await request.json();
    const { id } = body;
    const dateVal = body.date || body.expenseDate;
    const { category, description, amount, vendor, reference, paymentMethod, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (dateVal) data.expenseDate = new Date(dateVal);
    if (category) data.category = category;
    if (description) data.description = description;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (vendor !== undefined) data.vendor = vendor || null;
    if (reference !== undefined) data.reference = reference || null;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod || 'cash';
    if (notes !== undefined) data.notes = notes || null;

    const expense = await db.expense.update({
      where: { id },
      data,
    });

    return NextResponse.json(expense);
  } catch (error: unknown) {
    console.error('Expenses PUT error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// ── DELETE ──
export async function DELETE(request: NextRequest) {
  try {
    await authenticate();

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