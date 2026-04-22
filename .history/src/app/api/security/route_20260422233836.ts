import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    if (section === 'users') {
      const users = await db.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { auditLogs: true } },
        },
      });
      return NextResponse.json(users);
    }

    if (section === 'audit-log') {
      const limit = parseInt(searchParams.get('limit') || '50');
      const userId = searchParams.get('userId');
      const mod = searchParams.get('module');
      const action = searchParams.get('action');

      const where: Record<string, unknown> = {};
      if (userId) where.userId = userId;
      if (mod) where.module = mod;
      if (action) where.action = action;

      const logs = await db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return NextResponse.json(logs);
    }

    if (section === 'alerts') {
      const alerts = await db.securityAlert.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(alerts);
    }

    if (section === 'roles') {
      const roles = await db.role.findMany({
        include: {
          permissions: { include: { permission: true } },
        },
      });
      return NextResponse.json(roles);
    }

    if (section === 'permission-matrix') {
      const allModules = [
        'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
        'billing', 'accounts', 'staff', 'inventory', 'reports',
        'rules', 'security', 'cloud', 'settings',
      ];
      const allActions = ['view', 'create', 'edit', 'delete'];

      // Get or create all permissions
      const existingPerms = await db.permission.findMany();
      const permMap = new Map<string, boolean>();
      for (const p of existingPerms) {
        permMap.set(`${p.module}-${p.action}`, true);
      }

      for (const mod of allModules) {
        for (const act of allActions) {
          if (!permMap.has(`${mod}-${act}`)) {
            await db.permission.create({ data: { module: mod, action: act } });
          }
        }
      }

      const allPermissions = await db.permission.findMany();
      const roles = await db.role.findMany({
        include: { permissions: { include: { permission: true } } },
      });

      return NextResponse.json({ roles, permissions: allPermissions });
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Security error:', error);
    return NextResponse.json({ error: 'Failed to load security data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create-user') {
      const { email, password, name, phone, role, department } = body;
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
      }

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }

      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await db.user.create({
        data: { email, password: hashedPassword, name, phone, role, department },
      });

      return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role }, { status: 201 });
    }

    if (action === 'init-roles') {
      const defaultRoles = [
        { name: 'Super Admin', description: 'Full access to everything' },
        { name: 'Manager', description: 'Full access except security settings' },
        { name: 'Front Desk', description: 'Front desk operations' },
        { name: 'Housekeeping', description: 'Room management only' },
        { name: 'Accountant', description: 'Financial access' },
        { name: 'Auditor', description: 'View-only access' },
      ];

      for (const role of defaultRoles) {
        const exists = await db.role.findFirst({ where: { name: role.name } });
        if (!exists) {
          await db.role.create({ data: role });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'save-permissions') {
      const { roleId, modulePermissions } = body;

      // Delete existing role permissions
      await db.rolePermission.deleteMany({ where: { roleId } });

      // Get all permission IDs
      const allPerms = await db.permission.findMany();

      for (const mp of modulePermissions) {
        for (const act of mp.actions) {
          const perm = allPerms.find(p => p.module === mp.module && p.action === act);
          if (perm) {
            await db.rolePermission.create({
              data: { roleId, permissionId: perm.id },
            });
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Security POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    if (action === 'update-user') {
      const { name, email, phone, role, department, isActive } = body;
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (role !== undefined) updateData.role = role;
      if (department !== undefined) updateData.department = department;
      if (isActive !== undefined) updateData.isActive = isActive;

      const user = await db.user.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json(user);
    }

    if (action === 'change-password') {
      const { currentPassword, newPassword } = body;

      const user = await db.user.findUnique({ where: { id } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.user.update({
        where: { id },
        data: { password: hashedPassword },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'resolve-alert') {
      const alert = await db.securityAlert.update({
        where: { id },
        data: { isResolved: true, resolvedAt: new Date() },
      });
      return NextResponse.json(alert);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Security PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (action === 'delete-user') {
      if (!id) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      // Delete related records first (in correct order to avoid constraint errors)
      try { await db.session.deleteMany({ where: { userId: id } }); } catch { }
      try { await db.auditLog.deleteMany({ where: { userId: id } }); } catch { }
      try { await db.securityAlert.deleteMany({ where: { userId: id } }); } catch { }
      try { await db.notification.deleteMany({ where: { userId: id } }); } catch { }
      try { await db.staffProfile.deleteMany({ where: { userId: id } }); } catch { }
      try { await db.maintenanceRequest.deleteMany({ where: { reportedBy: id } }); } catch { }

      // Now delete the user
      await db.user.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Security DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}