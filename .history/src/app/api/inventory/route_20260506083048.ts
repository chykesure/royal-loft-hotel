import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── Helper: parse body (Next.js 16 compatible) ───
async function parseBody(req: NextRequest): Promise<any> {
  try {
    return await req.json();
  } catch {
    const raw = await req.text();
    return JSON.parse(raw);
  }
}

// ─── Helper: verify session ───
async function getSession(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;
  const session = await db.session.findFirst({
    where: { token },
    include: { user: { select: { id: true, role: true, name: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

// ─── GET: List items OR get movement history ───
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'items'; // "items" | "movements"

    if (mode === 'movements') {
      return handleGetMovements(searchParams);
    }

    return handleGetItems(searchParams);
  } catch (error: any) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
}

async function handleGetItems(searchParams: URLSearchParams) {
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const lowStock = searchParams.get('lowStock') === 'true';

  const where: any = { isActive: true };

  if (category) where.category = category;

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
        take: 5,
        select: {
          type: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          notes: true,
          guestName: true,
          createdAt: true,
        },
      },
    },
  });

  const filtered = lowStock
    ? items.filter((i) => i.currentQuantity <= i.minimumLevel)
    : items;

  const totalItems = filtered.length;
  const lowStockCount = filtered.filter((i) => i.currentQuantity <= i.minimumLevel).length;
  const totalValue = filtered.reduce((sum, i) => sum + i.currentQuantity * (i.unitCost || 0), 0);

  const categoryMap = new Map<string, number>();
  for (const item of filtered) {
    categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
  }
  const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    items: filtered,
    summary: { totalItems, lowStockCount, totalValue, categories },
  });
}

async function handleGetMovements(searchParams: URLSearchParams) {
  const itemId = searchParams.get('itemId') || '';
  const type = searchParams.get('type') || '';
  const guestId = searchParams.get('guestId') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  const where: any = {};

  if (itemId) where.itemId = itemId;
  if (type) where.type = type;
  if (guestId) where.guestId = guestId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59');
  }

  const [movements, total] = await Promise.all([
    db.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        item: { select: { id: true, name: true, unit: true, category: true } },
      },
    }),
    db.stockMovement.count({ where }),
  ]);

  const stats = await db.stockMovement.aggregate({
    where,
    _sum: { quantity: true, totalAmount: true },
  });

  const typeCounts = await db.stockMovement.groupBy({
    by: ['type'],
    where,
    _count: true,
    _sum: { quantity: true, totalAmount: true },
  });

  return NextResponse.json({
    movements,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats: {
      totalQuantity: stats._sum.quantity || 0,
      totalAmount: stats._sum.totalAmount || 0,
      byType: typeCounts,
    },
  });
}

// ─── POST: Create item OR record stock movement ───
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await parseBody(request);
    const { action } = body;

    if (action === 'stock_in') return handleStockIn(body, session);
    if (action === 'sell') return handleSell(body, session);
    if (action === 'issue_guest') return handleIssueToGuest(body, session);
    if (action === 'consume') return handleConsume(body, session);
    if (action === 'adjust') return handleAdjust(body, session);

    return handleCreateItem(body, session);
  } catch (error: any) {
    console.error('Inventory POST error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

async function handleCreateItem(body: any, session: any) {
  const {
    name, category, description, unit, currentQuantity,
    minimumLevel, reorderQuantity, unitCost, supplier, location,
  } = body;

  if (!name || !category || !unit) {
    return NextResponse.json({ error: 'Name, category, and unit are required' }, { status: 400 });
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
}

async function handleStockIn(body: any, session: any) {
  const { itemId, quantity, unitCost, notes, reference } = body;

  if (!itemId || !quantity || Number(quantity) <= 0) {
    return NextResponse.json({ error: 'Item and valid quantity are required' }, { status: 400 });
  }

  const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const newQty = item.currentQuantity + Number(quantity);

  const [updatedItem, movement] = await db.$transaction([
    db.inventoryItem.update({
      where: { id: itemId },
      data: {
        currentQuantity: newQty,
        unitCost: unitCost ? Number(unitCost) : item.unitCost,
      },
    }),
    db.stockMovement.create({
      data: {
        itemId,
        type: 'in',
        quantity: Number(quantity),
        unitCost: unitCost ? Number(unitCost) : null,
        notes: notes || 'Stock restocked',
        reference: reference || null,
        performedBy: session.userId,
      },
    }),
  ]);

  return NextResponse.json({ item: updatedItem, movement }, { status: 201 });
}

async function handleSell(body: any, session: any) {
  const { itemId, quantity, unitPrice, notes, reference } = body;

  if (!itemId || !quantity || Number(quantity) <= 0) {
    return NextResponse.json({ error: 'Item and valid quantity are required' }, { status: 400 });
  }

  const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.currentQuantity < Number(quantity)) {
    return NextResponse.json({ error: `Insufficient stock. Available: ${item.currentQuantity} ${item.unit}` }, { status: 400 });
  }

  const qty = Number(quantity);
  const price = unitPrice ? Number(unitPrice) : null;
  const total = price ? qty * price : null;
  const newQty = item.currentQuantity - qty;

  const [updatedItem, movement] = await db.$transaction([
    db.inventoryItem.update({
      where: { id: itemId },
      data: { currentQuantity: newQty },
    }),
    db.stockMovement.create({
      data: {
        itemId,
        type: 'out_sell',
        quantity: qty,
        unitCost: item.unitCost,
        unitPrice: price,
        totalAmount: total,
        notes: notes || 'Item sold',
        reference: reference || null,
        performedBy: session.userId,
      },
    }),
  ]);

  return NextResponse.json({ item: updatedItem, movement }, { status: 201 });
}

async function handleIssueToGuest(body: any, session: any) {
  const { itemId, quantity, guestId, guestName, reservationId, notes } = body;

  if (!itemId || !quantity || Number(quantity) <= 0) {
    return NextResponse.json({ error: 'Item and valid quantity are required' }, { status: 400 });
  }

  const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.currentQuantity < Number(quantity)) {
    return NextResponse.json({ error: `Insufficient stock. Available: ${item.currentQuantity} ${item.unit}` }, { status: 400 });
  }

  const qty = Number(quantity);
  const price = item.unitCost;
  const total = price ? qty * price : null;
  const newQty = item.currentQuantity - qty;

  const [updatedItem, movement] = await db.$transaction([
    db.inventoryItem.update({
      where: { id: itemId },
      data: { currentQuantity: newQty },
    }),
    db.stockMovement.create({
      data: {
        itemId,
        type: 'out_guest',
        quantity: qty,
        unitCost: item.unitCost,
        totalAmount: total,
        guestId: guestId || null,
        guestName: guestName || null,
        reservationId: reservationId || null,
        notes: notes || `Issued to guest${guestName ? ': ' + guestName : ''}`,
        performedBy: session.userId,
      },
    }),
  ]);

  return NextResponse.json({ item: updatedItem, movement }, { status: 201 });
}

async function handleConsume(body: any, session: any) {
  const { itemId, quantity, notes } = body;

  if (!itemId || !quantity || Number(quantity) <= 0) {
    return NextResponse.json({ error: 'Item and valid quantity are required' }, { status: 400 });
  }

  const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (item.currentQuantity < Number(quantity)) {
    return NextResponse.json({ error: `Insufficient stock. Available: ${item.currentQuantity} ${item.unit}` }, { status: 400 });
  }

  const qty = Number(quantity);
  const total = item.unitCost ? qty * item.unitCost : null;
  const newQty = item.currentQuantity - qty;

  const [updatedItem, movement] = await db.$transaction([
    db.inventoryItem.update({
      where: { id: itemId },
      data: { currentQuantity: newQty },
    }),
    db.stockMovement.create({
      data: {
        itemId,
        type: 'out_consume',
        quantity: qty,
        unitCost: item.unitCost,
        totalAmount: total,
        notes: notes || 'Internal consumption / wastage',
        performedBy: session.userId,
      },
    }),
  ]);

  return NextResponse.json({ item: updatedItem, movement }, { status: 201 });
}

async function handleAdjust(body: any, session: any) {
  const { itemId, quantity, notes } = body;

  if (!itemId || quantity === undefined || quantity === null) {
    return NextResponse.json({ error: 'Item and quantity are required' }, { status: 400 });
  }

  const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const qty = Number(quantity);
  const newQty = item.currentQuantity + qty;

  if (newQty < 0) {
    return NextResponse.json({ error: 'Adjustment would result in negative stock' }, { status: 400 });
  }

  const total = item.unitCost ? Math.abs(qty) * item.unitCost : null;

  const [updatedItem, movement] = await db.$transaction([
    db.inventoryItem.update({
      where: { id: itemId },
      data: { currentQuantity: newQty },
    }),
    db.stockMovement.create({
      data: {
        itemId,
        type: 'adjustment',
        quantity: qty,
        unitCost: item.unitCost,
        totalAmount: total,
        notes: notes || 'Stock adjustment',
        performedBy: session.userId,
      },
    }),
  ]);

  return NextResponse.json({ item: updatedItem, movement }, { status: 201 });
}

// ─── PUT: Update inventory item ───
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await parseBody(request);
    const { id, name, category, description, unit, currentQuantity, minimumLevel, reorderQuantity, unitCost, supplier, location, isActive } = body;

    if (!id) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description || null;
    if (unit !== undefined) updateData.unit = unit;
    if (minimumLevel !== undefined) updateData.minimumLevel = Number(minimumLevel);
    if (reorderQuantity !== undefined) updateData.reorderQuantity = reorderQuantity ? Number(reorderQuantity) : null;
    if (unitCost !== undefined) updateData.unitCost = unitCost ? Number(unitCost) : null;
    if (supplier !== undefined) updateData.supplier = supplier || null;
    if (location !== undefined) updateData.location = location || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (currentQuantity !== undefined) {
      const existing = await db.inventoryItem.findUnique({ where: { id } });
      if (existing) {
        const diff = Number(currentQuantity) - existing.currentQuantity;
        if (diff !== 0) {
          updateData.currentQuantity = Number(currentQuantity);
          await db.stockMovement.create({
            data: {
              itemId: id,
              type: 'adjustment',
              quantity: diff,
              unitCost: existing.unitCost,
              notes: 'Manual quantity update',
              performedBy: session.userId,
            },
          });
        }
      }
    }

    const item = await db.inventoryItem.update({ where: { id }, data: updateData });
    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Inventory PUT error:', error);
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}

// ─── DELETE: Soft-delete inventory item ───
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });

    await db.inventoryItem.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Inventory DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}