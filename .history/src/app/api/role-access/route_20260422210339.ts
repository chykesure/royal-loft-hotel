import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  const session = await db.session.findFirst({
    where: { token },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

// Default module access per role
const DEFAULT_ACCESS: Record<string, string[]> = {
  manager: [
    'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
    'billing', 'accounts', 'staff', 'inventory', 'reports',
    'rules', 'security',
  ],
  front_desk: [
    'dashboard', 'front_desk', 'reservations', 'rooms', 'guests', 'billing',
  ],
  accountant: [
    'dashboard', 'billing', 'accounts', 'expenses', 'reports',
  ],
  auditor: [
    'dashboard', 'billing', 'accounts', 'expenses', 'reports',
  ],
  housekeeping: [
    'dashboard', 'rooms', 'inventory',
  ],
  staff: [
    'dashboard',
  ],
};

// Check if RoleModuleAccess table exists by trying a simple query
async function isTableAccessible(): Promise<boolean> {
  try {
    await db.roleModuleAccess.count();
    return true;
  } catch {
    return false;
  }
}

// ── GET: Read module access config (or a specific role's access) ──
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    // Check if the table is accessible
    const tableOk = await isTableAccessible();
    if (!tableOk) {
      // Table doesn't exist — return defaults only
      if (role) {
        const modules = DEFAULT_ACCESS[role] || ['dashboard'];
        return NextResponse.json({ role, modules });
      }
      return NextResponse.json({ ...DEFAULT_ACCESS });
    }

    if (role) {
      // Return access for a specific role
      const record = await db.roleModuleAccess.findUnique({
        where: { role },
      });
      if (!record) {
        const modules = DEFAULT_ACCESS[role] || ['dashboard'];
        return NextResponse.json({ role, modules });
      }
      const modules = JSON.parse(record.modules);
      return NextResponse.json({ role, modules });
    }

    // Return all access configs
    const records = await db.roleModuleAccess.findMany();
    const all: Record<string, string[]> = {};

    // Initialize defaults
    for (const [r, mods] of Object.entries(DEFAULT_ACCESS)) {
      all[r] = [...mods];
    }

    // Override with saved values
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
    // Return defaults even on error so the app doesn't break
    return NextResponse.json({ ...DEFAULT_ACCESS });
  }
}

// ── POST: Save module access config for a role ──
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super_admin and manager can change access
    if (!['super_admin', 'manager', 'developer'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { role, modules } = body;

    if (!role || !Array.isArray(modules)) {
      return NextResponse.json({ error: 'role and modules array are required' }, { status: 400 });
    }

    // Check if table is accessible
    const tableOk = await isTableAccessible();
    if (!tableOk) {
      return NextResponse.json({ error: 'RoleModuleAccess table not available. Please run the SQL migration first.' }, { status: 503 });
    }

    const modulesJson = JSON.stringify(modules);

    await db.roleModuleAccess.upsert({
      where: { role },
      update: { modules: modulesJson },
      create: { role, modules: modulesJson },
    });

    return NextResponse.json({ success: true, role, modules });
  } catch (error: unknown) {
    console.error('Role access POST error:', error);
    return NextResponse.json({ error: 'Failed to save role access' }, { status: 500 });
  }
}