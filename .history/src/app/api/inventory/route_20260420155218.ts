import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET: List all inventory items ───

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.session.findFirst({
      where: { token },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const lowStock = searchParams.get('lowStock') === 'true';

    const where: any = { isActive: true };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { supplier: { contains: search } },
      ];
    }

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        unit: true,
        currentQuantity: true,
        minimumLevel: true,
        reorderQuantity: true,
        unitCost: true,
        supplier: true,
        location: true,
        createdAt: true,
        updatedAt: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { type: true, quantity: true, createdAt: true },
        },
      },
    });

    const filtered = lowStock
      ? items.filter((i) => i.currentQuantity <= i.minimumLevel)
      : items;

    const totalItems = filtered.length;
    const lowStockCount = filtered.filter((i) => i.currentQuantity <= i.minimumLevel).length;
    const totalValue = filtered.reduce((sum, i) => {
      return sum + (i.currentQuantity * (i.unitCost || 0));
    }, 0);

    const categoryMap = new Map<string, number>();
    for (const item of filtered) {
      const existing = categoryMap.get(item.category) || 0;
      categoryMap.set(item.category, existing + 1);
    }
    const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      items: filtered,
      summary: {
        totalItems,
        lowStockCount,
        totalValue,
        categories,
      },
    });
  } catch (error: unknown) {
    console.error('Inventory GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load inventory' },
      { status: 500 }
    );
  }
}

// ─── POST: Create new inventory item ───

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.session.findFirst({
      where: { token },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      category,
      description,
      unit,
      currentQuantity,
      minimumLevel,
      reorderQuantity,
      unitCost,
      supplier,
      location,
    } = body;

    if (!name || !category || !unit) {
      return NextResponse.json(
        { error: 'Name, category, and unit are required' },
        { status: 400 }
      );
    }

    const item = await db.inventoryItem.create({
      data: {
        name,
        category,
        description: description || null,
        unit,
        currentQuantity: Number(currentQuantity) || 0,
        minimumLevel: Number(minimumLevel) || 0,
        reorderQuantity: reorderQuantity ? Number(reorderQuantity) : null,
        unitCost: unitCost ? Number(unitCost) : null,
        supplier: supplier || null,
        location: location || null,
      },
    });

    if (Number(currentQuantity) > 0) {
      await db.stockMovement.create({
        data: {
          itemId: item.id,
          type: 'in',
          quantity: Number(currentQuantity),
          unitCost: unitCost ? Number(unitCost) : null,
          notes: 'Initial stock',
          performedBy: session.userId,
        },
      });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: unknown) {
    console.error('Inventory POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}

// ─── PUT: Update inventory item ───

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.session.findFirst({
      where: { token },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, category, description, unit, currentQuantity, minimumLevel, reorderQuantity, unitCost, supplier, location, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description || null;
    if (unit !== undefined) updateData.unit = unit;
    if (currentQuantity !== undefined) updateData.currentQuantity = Number(currentQuantity);
    if (minimumLevel !== undefined) updateData.minimumLevel = Number(minimumLevel);
    if (reorderQuantity !== undefined) updateData.reorderQuantity = reorderQuantity ? Number(reorderQuantity) : null;
    if (unitCost !== undefined) updateData.unitCost = unitCost ? Number(unitCost) : null;
    if (supplier !== undefined) updateData.supplier = supplier || null;
    if (location !== undefined) updateData.location = location || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const item = await db.inventoryItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ item });
  } catch (error: unknown) {
    console.error('Inventory PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Soft-delete inventory item ───

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.session.findFirst({
      where: { token },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    await db.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Inventory DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}