import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Map user.role string to Role.name in the Role table
const ROLE_NAME_MAP: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  front_desk: 'Front Desk',
  housekeeping: 'Housekeeping',
  accountant: 'Accountant',
  auditor: 'Auditor',
};

const ALL_MODULES = [
  'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
  'billing', 'accounts', 'staff', 'inventory', 'reports',
  'rules', 'security', 'cloud', 'settings',
];

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete'];

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await db.session.findFirst({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await db.session.delete({ where: { id: session.id } });
      }
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Refresh session expiry
    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    const userRole = session.user.role;

    // Build permissions for this user
    let permissions: Record<string, Record<string, boolean>> = {};

    // Super admin and developer get everything
    if (userRole === 'super_admin' || userRole === 'developer') {
      for (const mod of ALL_MODULES) {
        permissions[mod] = {};
        for (const act of ALL_ACTIONS) {
          permissions[mod][act] = true;
        }
      }
    } else {
      // Look up the user's role in the Role table
      const roleName = ROLE_NAME_MAP[userRole];
      if (roleName) {
        const role = await db.role.findFirst({
          where: { name: roleName },
          include: { permissions: { include: { permission: true } } },
        });
        if (role && role.permissions.length > 0) {
          // Build permissions from role's assigned permissions
          for (const rp of role.permissions) {
            const mod = rp.permission.module;
            const act = rp.permission.action;
            if (!permissions[mod]) permissions[mod] = {};
            permissions[mod][act] = true;
          }
        } else {
          // No permissions configured for this role yet — use sensible defaults
          permissions = getDefaultPermissions(userRole);
        }
      } else {
        // Unknown role — use sensible defaults
        permissions = getDefaultPermissions(userRole);
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        phone: session.user.phone,
        role: session.user.role,
        department: session.user.department,
      },
      permissions,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

// Fallback default permissions per role
function getDefaultPermissions(userRole: string): Record<string, Record<string, boolean>> {
  const perms: Record<string, Record<string, boolean>> = {};

  // Everyone can view dashboard and settings
  const everyoneModules = ['dashboard', 'settings'];
  for (const mod of everyoneModules) {
    perms[mod] = { view: true, create: true, edit: true, delete: false };
  }

  if (userRole === 'manager') {
    const modules = ['front_desk', 'reservations', 'rooms', 'guests', 'billing', 'accounts', 'staff', 'inventory', 'reports', 'rules'];
    for (const mod of modules) {
      perms[mod] = { view: true, create: true, edit: true, delete: false };
    }
  } else if (userRole === 'front_desk') {
    const modules = ['front_desk', 'reservations', 'rooms', 'guests', 'billing'];
    for (const mod of modules) {
      perms[mod] = { view: true, create: true, edit: true, delete: false };
    }
  } else if (userRole === 'housekeeping') {
    const modules = ['rooms', 'inventory'];
    for (const mod of modules) {
      perms[mod] = { view: true, create: false, edit: true, delete: false };
    }
  } else if (userRole === 'accountant') {
    const modules = ['billing', 'accounts', 'reports'];
    for (const mod of modules) {
      perms[mod] = { view: true, create: true, edit: true, delete: false };
    }
  } else if (userRole === 'auditor') {
    const modules = ['billing', 'accounts', 'reports', 'audit'];
    for (const mod of modules) {
      perms[mod] = { view: true, create: false, edit: false, delete: false };
    }
  } else {
    // staff gets basic modules
    const modules = ['front_desk', 'reservations', 'rooms', 'guests'];
    for (const mod of modules) {
      perms[mod] = { view: true, create: false, edit: false, delete: false };
    }
  }

  return perms;
}