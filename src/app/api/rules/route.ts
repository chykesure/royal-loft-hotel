import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const policies = await db.hotelPolicy.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const activeCount = policies.filter(p => p.isActive).length;

    return NextResponse.json({ policies, activeCount });
  } catch (error) {
    console.error('Rules GET error:', error);
    return NextResponse.json({ error: 'Failed to load policies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, displayToGuest, sortOrder } = body;

    if (!title || !description || !category) {
      return NextResponse.json({ error: 'Title, description, and category are required' }, { status: 400 });
    }

    const policy = await db.hotelPolicy.create({
      data: {
        title,
        description,
        category,
        displayToGuest: displayToGuest !== false,
        sortOrder: parseInt(String(sortOrder || 0)),
      },
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    console.error('Rules POST error:', error);
    return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Policy ID required' }, { status: 400 });
    }

    const body = await request.json();
    const policy = await db.hotelPolicy.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.displayToGuest !== undefined && { displayToGuest: body.displayToGuest }),
        ...(body.sortOrder !== undefined && { sortOrder: parseInt(String(body.sortOrder)) }),
      },
    });

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Rules PUT error:', error);
    return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Policy ID required' }, { status: 400 });
    }

    await db.hotelPolicy.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rules DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
  }
}
