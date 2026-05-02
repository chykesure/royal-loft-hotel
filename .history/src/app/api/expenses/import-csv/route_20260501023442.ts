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

function parseCSV(text: string) {
  // Strip BOM character that Excel adds to CSV files
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
  const dateIdx = header.findIndex((h: string) => h === 'date');
  const nameIdx = header.findIndex((h: string) => h === 'name');
  const kitchenIdx = header.findIndex((h: string) => h === 'kitchen');
  const hotelIdx = header.findIndex((h: string) => h === 'hotel');
  const beveragesIdx = header.findIndex((h: string) => h === 'beverages');
  const totalIdx = header.findIndex((h: string) => h === 'total');

  if (dateIdx === -1 || nameIdx === -1) {
    return { error: 'CSV must have "Date" and "Name" columns' };
  }

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map((v: string) => v.trim());
    if (vals.length < 2 || !vals[dateIdx] || !vals[nameIdx]) continue;
    rows.push({
      date: vals[dateIdx],
      name: vals[nameIdx],
      kitchen: kitchenIdx !== -1 ? vals[kitchenIdx] : '0',
      hotel: hotelIdx !== -1 ? vals[hotelIdx] : '0',
      beverages: beveragesIdx !== -1 ? vals[beveragesIdx] : '0',
      total: totalIdx !== -1 ? vals[totalIdx] : '0',
    });
  }

  return { rows, header };
}

// ── POST: Import expenses from CSV (developer only) ──
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Developer role check
    if (user.role !== 'developer') {
      return NextResponse.json({ error: 'Access denied. Developer role required.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('csvFile') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are accepted' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 400 });
    }

    const csvText = await file.text();
    const result = parseCSV(csvText);

    if (Array.isArray(result) && result.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty or has no valid rows' }, { status: 400 });
    }

    if (!Array.isArray(result) && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { rows } = result as { rows: Record<string, string>[] };

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const kitchen = parseFloat(row.kitchen) || 0;
        const hotel = parseFloat(row.hotel) || 0;
        const beverages = parseFloat(row.beverages) || 0;
        const total = parseFloat(row.total) || 0;

        await db.expense.create({
          data: {
            date: new Date(row.date + 'T12:00:00'),
            name: row.name,
            kitchen: kitchen > 0 ? kitchen : null,
            hotel: hotel > 0 ? hotel : null,
            beverages: beverages > 0 ? beverages : null,
            total,
          },
        });
        imported++;
      } catch (err: unknown) {
        skipped++;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Row ${i + 2}: ${msg}`);
      }
    }

    const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
    const kitchenTotal = rows.reduce((sum, r) => sum + (parseFloat(r.kitchen) || 0), 0);
    const hotelTotal = rows.reduce((sum, r) => sum + (parseFloat(r.hotel) || 0), 0);
    const bevTotal = rows.reduce((sum, r) => sum + (parseFloat(r.beverages) || 0), 0);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: rows.length,
      summary: {
        kitchen: kitchenTotal,
        hotel: hotelTotal,
        beverages: bevTotal,
        total: totalAmount,
      },
      errors: errors.slice(0, 10),
    });
  } catch (error: unknown) {
    console.error('CSV Import error:', error);
    return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 });
  }
}
