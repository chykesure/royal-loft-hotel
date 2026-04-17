import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: get authenticated user from cookie
async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function GET() {
  try {
    const items = await db.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const totalCount = items.length;
    const lowStockCount = items.filter(i => i.currentQuantity <= i.minimumLevel).length;
    const totalValue = items.reduce((sum, item) => sum + (item.currentQuantity * (item.unitCost || 0)), 0);

    return NextResponse.json({ items, stats: { totalCount, lowStockCount, totalValue } });
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, description, unit, currentQuantity, minimumLevel, reorderQuantity, unitCost, supplier, location } = body;

    if (!name || !category || !unit) {
      return NextResponse.json({ error: 'Name, category, and unit are required' }, { status: 400 });
    }

    const item = await db.inventoryItem.create({
      data: {
        name,
        category,
        description: description || undefined,
        unit,
        currentQuantity: parseFloat(String(currentQuantity || 0)),
        minimumLevel: parseFloat(String(minimumLevel || 0)),
        reorderQuantity: reorderQuantity ? parseFloat(String(reorderQuantity)) : undefined,
        unitCost: unitCost ? parseFloat(String(unitCost)) : undefined,
        supplier: supplier || undefined,
        location: location || undefined,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Inventory POST error:', error);
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const body = await request.json();

    // Handle stock adjustment
    if (body.adjustQuantity !== undefined && body.adjustType) {
      const item = await db.inventoryItem.findUnique({ where: { id } });
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      const qty = parseFloat(String(body.adjustQuantity));
      const newQty = body.adjustType === 'in' ? item.currentQuantity + qty : item.currentQuantity - qty;

      if (newQty < 0) {
        return NextResponse.json({ error: 'Cannot reduce quantity below zero' }, { status: 400 });
      }

      // Create stock movement
      await db.stockMovement.create({
        data: {
          itemId: id,
          type: body.adjustType === 'in' ? 'in' : 'out',
          quantity: qty,
          unitCost: item.unitCost,
          reference: body.reference || undefined,
          notes: body.notes || undefined,
        },
      });

      // Update quantity
      const updated = await db.inventoryItem.update({
        where: { id },
        data: { currentQuantity: newQty },
      });

      return NextResponse.json(updated);
    }

    // Handle regular update
    const updated = await db.inventoryItem.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.unit !== undefined && { unit: body.unit }),
        ...(body.currentQuantity !== undefined && { currentQuantity: parseFloat(String(body.currentQuantity)) }),
        ...(body.minimumLevel !== undefined && { minimumLevel: parseFloat(String(body.minimumLevel)) }),
        ...(body.reorderQuantity !== undefined && { reorderQuantity: body.reorderQuantity ? parseFloat(String(body.reorderQuantity)) : null }),
        ...(body.unitCost !== undefined && { unitCost: body.unitCost ? parseFloat(String(body.unitCost)) : null }),
        ...(body.supplier !== undefined && { supplier: body.supplier || null }),
        ...(body.location !== undefined && { location: body.location || null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Inventory PUT error:', error);
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}

// DELETE — restricted to developer and super_admin only
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const item = await db.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await db.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inventory DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}