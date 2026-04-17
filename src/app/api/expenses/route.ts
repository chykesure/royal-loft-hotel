import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const expenses = await db.expense.findMany({
      orderBy: { expenseDate: 'desc' },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Expenses GET error:', error);
    return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, category, amount, paymentMethod, vendor, reference, expenseDate, notes } = body;

    if (!description || !category || !amount || !expenseDate) {
      return NextResponse.json({ error: 'Description, category, amount, and expenseDate are required' }, { status: 400 });
    }

    const expense = await db.expense.create({
      data: {
        description,
        category,
        amount: parseFloat(String(amount)),
        paymentMethod: paymentMethod || 'cash',
        vendor: vendor || undefined,
        reference: reference || undefined,
        expenseDate: new Date(expenseDate),
        notes: notes || undefined,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Expenses POST error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const body = await request.json();
    const expense = await db.expense.update({
      where: { id },
      data: {
        ...(body.description && { description: body.description }),
        ...(body.category && { category: body.category }),
        ...(body.amount !== undefined && { amount: parseFloat(String(body.amount)) }),
        ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
        ...(body.vendor !== undefined && { vendor: body.vendor || null }),
        ...(body.reference !== undefined && { reference: body.reference || null }),
        ...(body.expenseDate && { expenseDate: new Date(body.expenseDate) }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Expenses PUT error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Expenses DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
