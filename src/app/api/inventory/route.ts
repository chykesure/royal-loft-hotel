import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: get authenticated user from cookie
async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  const session = await db.session.findFirst({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

// GET /api/inventory — list all items
export async function GET() {
  try {
    const items = await db.inventoryItem.findMany({
      orderBy: { createdAt: 'desc' },
      include: { stockMovements: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    return NextResponse.json(items);
  } catch (error: unknown) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
}

// POST /api/inventory — create item
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, description, unit, currentQuantity, minimumLevel, reorderQuantity, unitCost, supplier, location } = body;

    if (!name || !category || !unit) {
      return NextResponse.json({ error: 'Name, category, and unit are required' }, { status: 400 });
    }

    const item = await db.inventoryItem.create({
      data: {
        name,
        category,
        description: description || null,
        unit,
        currentQuantity: currentQuantity || 0,
        minimumLevel: minimumLevel || 0,
        reorderQuantity: reorderQuantity || null,
        unitCost: unitCost || null,
        supplier: supplier || null,
        location: location || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    console.error('Inventory POST error:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}

// PUT /api/inventory — update item
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const item = await db.inventoryItem.update({
      where: { id },
      data,
    });

    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error('Inventory PUT error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE /api/inventory — delete item (RESTRICTED to developer and super_admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only developer and super_admin can delete inventory items
    if (user.role !== 'developer' && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Access denied. Only Developer and Super Admin can delete inventory items.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const item = await db.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Stock movements cascade-delete automatically via schema
    await db.inventoryItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Inventory DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}