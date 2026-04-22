import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// ── Default module access per configurable role ──
const DEFAULT_ACCESS: Record<string, string[]> = {
  manager: [
    'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
    'billing', 'expenses', 'accounts', 'staff', 'inventory',
    'reports', 'rules', 'settings',
  ],
  front_desk: [
    'dashboard', 'front_desk', 'reservations', 'rooms', 'guests', 'billing',
  ],
  accountant: [
    'dashboard', 'billing', 'expenses', 'accounts', 'reports', 'settings',
  ],
  auditor: [
    'dashboard', 'billing', 'expenses', 'accounts', 'reports', 'rules',
  ],
  housekeeping: [
    'dashboard', 'rooms', 'inventory',
  ],
  staff: [
    'dashboard', 'rooms', 'guests',
  ],
};

// Modules that are configurable (excludes developer-only modules)
export const ALL_MODULE_KEYS = [
  'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
  'billing', 'expenses', 'accounts', 'staff', 'inventory', 'reports',
  'rules', 'security', 'cloud', 'settings', 'developer_tools',
];

// Roles whose module access can be configured by super_admin/developer
export const CONFIGURABLE_ROLES = ['manager', 'front_desk', 'accountant', 'auditor', 'housekeeping', 'staff'];

// ── Helper: get current user ──
async function getCurrentUser() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;

  const session = await db.session.findFirst({
    where: { token, expiresAt: { gte: new Date() } },
    include: { user: true },
  });

  return session?.user ?? null;
}

// ── Helper: check admin access ──
function isAdmin(role: string | null): boolean {
  return role === 'super_admin' || role === 'developer';
}

// ── GET: Load the full access map (all roles → modules) ──
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load persisted access for all configurable roles
    const rows = await db.roleModuleAccess.findMany();

    const accessMap: Record<string, string[]> = {};

    for (const role of CONFIGURABLE_ROLES) {
      const row = rows.find((r) => r.role === role);
      if (row) {
        try {
          accessMap[role] = JSON.parse(row.modules);
        } catch {
          accessMap[role] = DEFAULT_ACCESS[role] || ['dashboard'];
        }
      } else {
        accessMap[role] = DEFAULT_ACCESS[role] || ['dashboard'];
      }
    }

    return NextResponse.json({ accessMap, defaultAccess: DEFAULT_ACCESS });
  } catch (error) {
    console.error('GET /api/role-access error:', error);
    return NextResponse.json({ error: 'Failed to load access config' }, { status: 500 });
  }
}

// ── POST: Save the full access map ──
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Only Super Admin and Developer can modify module access' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { accessMap } = body as { accessMap: Record<string, string[]> };

    if (!accessMap || typeof accessMap !== 'object') {
      return NextResponse.json({ error: 'Invalid accessMap' }, { status: 400 });
    }

    // Validate and upsert each role's module list
    for (const role of CONFIGURABLE_ROLES) {
      const modules = accessMap[role];
      if (!Array.isArray(modules)) continue;

      // Validate: only allow known module keys
      const validModules = modules.filter((m) => ALL_MODULE_KEYS.includes(m));

      // Dashboard is always included
      if (!validModules.includes('dashboard')) {
        validModules.unshift('dashboard');
      }

      // Security, cloud, and developer_tools cannot be granted to non-developer roles
      const blockedModules = ['security', 'cloud', 'developer_tools'];
      const filtered = validModules.filter((m) => !blockedModules.includes(m));

      // Ensure dashboard is still there
      if (!filtered.includes('dashboard')) {
        filtered.unshift('dashboard');
      }

      await db.roleModuleAccess.upsert({
        where: { role },
        create: { role, modules: JSON.stringify(filtered) },
        update: { modules: JSON.stringify(filtered) },
      });
    }

    return NextResponse.json({ success: true, message: 'Module access updated' });
  } catch (error) {
    console.error('POST /api/role-access error:', error);
    return NextResponse.json({ error: 'Failed to save access config' }, { status: 500 });
  }
}

// ── PUT: Reset to defaults ──
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user.role)) {
      return NextResponse.json(
        { error: 'Only Super Admin and Developer can modify module access' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body as { action: string };

    if (action === 'reset') {
      // Delete all persisted configs and let defaults take over
      await db.roleModuleAccess.deleteMany();
      return NextResponse.json({ success: true, message: 'Reset to defaults', defaultAccess: DEFAULT_ACCESS });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('PUT /api/role-access error:', error);
    return NextResponse.json({ error: 'Failed to reset access config' }, { status: 500 });
  }
}