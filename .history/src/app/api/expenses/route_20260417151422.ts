import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// ── Helper: get current user ──
async function getCurrentUser() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;
  const session = await db.session.findFirst({
    where: { token, expiresAt: { gte: new Date() } },
    include: { user: true },
  });
  return session?.user ?? null;
}

// ── GET: List expenses with optional filters ──
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month'); // format: "2026-04"

    const where: Record<string, unknown> = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 200,
    });

    // Category summary
    const categorySummary = await db.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: { id: true },
    });

    // Total for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthTotal = await db.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: monthStart, lte: monthEnd } } as any,
    });
    const totalAll = await db.expense.aggregate({
      _sum: { amount: true },
    });

    return NextResponse.json({
      expenses,
      categorySummary,
      thisMonthTotal: monthTotal._sum?.amount ?? 0,
      totalAll: totalAll._sum?.amount ?? 0,
    });
  } catch (error) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 });
  }
}

// ── POST: Create expense ──
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Delete multiple
    if (action === 'delete-many') {
      const { ids } = body as { ids: string[] };
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
      }
      await db.expense.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ success: true, message: `${ids.length} expenses deleted` });
    }

    // Create single
    const { description, category, amount, date, paymentMethod, vendor, receiptRef, notes } = body;

    if (!description || !category || !amount || !date) {
      return NextResponse.json(
        { error: 'Description, category, amount, and date are required' },
        { status: 400 }
      );
    }

    const expense = await db.expense.create({
      data: {
        description,
        category,
        amount: parseFloat(amount),
        date: new Date(date),
        paymentMethod: paymentMethod || null,
        vendor: vendor || null,
        receiptRef: receiptRef || null,
        notes: notes || null,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ expense, message: 'Expense created successfully' });
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

// ── PUT: Update expense ──
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, description, category, amount, date, paymentMethod, vendor, receiptRef, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (date !== undefined) updateData.date = new Date(date);
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (vendor !== undefined) updateData.vendor = vendor;
    if (receiptRef !== undefined) updateData.receiptRef = receiptRef;
    if (notes !== undefined) updateData.notes = notes;

    const expense = await db.expense.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ expense, message: 'Expense updated successfully' });
  } catch (error) {
    console.error('PUT /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// ── DELETE: Delete expense ──
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    await db.expense.delete({ where: { id } });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/expenses error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}