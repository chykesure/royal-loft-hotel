import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── Robust body parser (Next.js 16 compatible) ───
async function parseBody(req: NextRequest): Promise<any> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return await req.json();
  }
  const raw = await req.text();
  try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON body'); }
}

// POST /api/payroll/generate
// Body: { period: "2026-04", staffList: [{ staffId, deductions }] }
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
      if (session) await db.session.delete({ where: { id: session.id } });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseBody(request);
    const { period, staffList } = body;

    if (!period || !staffList || !Array.isArray(staffList) || staffList.length === 0) {
      return NextResponse.json(
        { error: 'period and staffList are required' },
        { status: 400 }
      );
    }

    const records: any[] = [];
    const skipped: any[] = [];

    for (const item of staffList) {
      const { staffId, deductions } = item;

      const existing = await db.payrollRecord.findFirst({
        where: { staffId, period },
      });

      if (existing) {
        skipped.push({ staffId, reason: 'Already exists' });
        continue;
      }

      const profile = await db.staffProfile.findUnique({
        where: { id: staffId },
      });

      if (!profile) {
        skipped.push({ staffId, reason: 'Not found' });
        continue;
      }

      const deduct = Number(deductions) || 0;
      const netPay = (Number(profile.baseSalary) || 0) - deduct;

      const record = await db.payrollRecord.create({
        data: {
          staffId,
          period,
          basicSalary: Number(profile.baseSalary) || 0,
          deductions: deduct,
          netPay,
          status: 'pending',
          processedBy: session.user.id,
        },
      });

      records.push(record);
    }

    return NextResponse.json({
      created: records.length,
      skipped: skipped.length,
      records,
    }, { status: 201 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Payroll generate error:', errMsg);
    return NextResponse.json(
      { error: `Failed to generate payroll: ${errMsg}` },
      { status: 500 }
    );
  }
}
