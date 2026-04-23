import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  try {
    const session = await db.session.findFirst({
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

const DEFAULT_ACCESS: Record<string, string[]> = {
  manager: ['dashboard', 'reservations', 'guests', 'rooms', 'invoices', 'expenses', 'staff', 'housekeeping', 'inventory', 'security', 'reports', 'cloud'],
  front_desk: ['dashboard', 'reservations', 'guests', 'rooms', 'invoices', 'housekeeping'],
  accountant: ['dashboard', 'invoices', 'expenses', 'reports', 'guests'],
  auditor: ['dashboard', 'invoices', 'expenses', 'reports'],
  housekeeping: ['dashboard', 'housekeeping', 'rooms'],
  staff: ['dashboard'],
};

async function isTableAccessible(): Promise<boolean> {
  try {
    await db.roleModuleAccess.count();
    return true;
  } catch {
    return false;
  }
}

// ── GET ──
export async function GET(request: NextRequest) {
  try {
    let user: { id: string; name: string; role: string } | null = null;
    try { user = await authenticate(); } catch {}

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const tableOk = await isTableAccessible();
    if (!tableOk) {
      if (role) {
        return NextResponse.json({ role, modules: DEFAULT_ACCESS[role] || ['dashboard'] });
      }
      return NextResponse.json({ ...DEFAULT_ACCESS });
    }

    if (role) {
      const record = await db.roleModuleAccess.findUnique({ where: { role } });
      if (!record) {
        return NextResponse.json({ role, modules: DEFAULT_ACCESS[role] || ['dashboard'] });
      }
      return NextResponse.json({ role, modules: JSON.parse(record.modules) });
    }

    const records = await db.roleModuleAccess.findMany();
    const all: Record<string, string[]> = {};
    for (const [r, mods] of Object.entries(DEFAULT_ACCESS)) {
      all[r] = [...mods];
    }
    for (const record of records) {
      try {
        all[record.role] = JSON.parse(record.modules);
      } catch {
        all[record.role] = DEFAULT_ACCESS[record.role] || ['dashboard'];
      }
    }

    return NextResponse.json(all);
  } catch (error: unknown) {
    console.error('Role access GET error:', error);
    return NextResponse.json({ ...DEFAULT_ACCESS });
  }
}

// ── POST ──
export async function POST(request: NextRequest) {
  try {
    let user: { id: string; name: string; role: string } | null = null;
    try { user = await authenticate(); } catch {}

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'manager', 'developer'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { role, modules } = body;

    if (!role || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'role and modules array are required' },
        { status: 400 }
      );
    }

    const tableOk = await isTableAccessible();
    if (!tableOk) {
      return NextResponse.json(
        { error: 'RoleModuleAccess table not available. Run the SQL migration first.' },
        { status: 503 }
      );
    }

    const modulesJson = JSON.stringify(modules);

    await db.roleModuleAccess.upsert({
      where: { role },
      update: { modules: modulesJson },
      create: {
        id: `rma_${role}_${Date.now()}`,
        role,
        modules: modulesJson,
      },
    });

    return NextResponse.json({ success: true, role, modules });
  } catch (error: unknown) {
    console.error('Role access POST error:', error);
    return NextResponse.json({ error: 'Failed to save role access' }, { status: 500 });
  }
}