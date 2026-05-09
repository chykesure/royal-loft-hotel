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

      const userIds = [...new Set(alerts.map((a) => a.userId).filter(Boolean))] as string[];
      const userMap = new Map<string, { name: string; email: string }>();
      if (userIds.length > 0) {
        const users = await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        });
        for (const u of users) {
          userMap.set(u.id, { name: u.name, email: u.email });
        }
      }

      const enriched = alerts.map((alert) => ({
        ...alert,
        user: alert.userId ? userMap.get(alert.userId) || null : null,
      }));

      return NextResponse.json(enriched);
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

      const existingPerms = await db.permission.findMany();
      const permSet = new Set(existingPerms.map((p) => `${p.module}-${p.action}`));

      for (const mod of allModules) {
        for (const act of allActions) {
          if (!permSet.has(`${mod}-${act}`)) {
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
    const body = await parseBody(request);
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

      // ─── AUTO-CREATE StaffProfile so user shows in Staff & Payroll ───
      try {
        const staffCount = await db.staffProfile.count();
        let counter = staffCount + 1;
        let finalEmpId = `RL-${String(counter).padStart(3, '0')}`;

        let exists = await db.staffProfile.findUnique({ where: { employeeId: finalEmpId } });
        while (exists) {
          counter++;
          finalEmpId = `RL-${String(counter).padStart(3, '0')}`;
          exists = await db.staffProfile.findUnique({ where: { employeeId: finalEmpId } });
        }

        await db.staffProfile.create({
          data: {
            userId: user.id,
            employeeId: finalEmpId,
            department: department || 'front_desk',
            position: role === 'admin' || role === 'manager' ? 'Manager' : 'Staff',
            baseSalary: 0,
            startDate: new Date(),
            status: 'active',
          },
        });
      } catch (profileErr) {
        console.warn('Could not auto-create StaffProfile (non-critical):', profileErr);
      }

      return NextResponse.json(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        { status: 201 }
      );
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

      await db.rolePermission.deleteMany({ where: { roleId } });

      const allPerms = await db.permission.findMany();

      for (const mp of modulePermissions) {
        for (const act of mp.actions) {
          const perm = allPerms.find((p) => p.module === mp.module && p.action === act);
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Security POST error:', errMsg);
    return NextResponse.json({ error: `Internal server error: ${errMsg}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await parseBody(request);
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Security PUT error:', errMsg);
    return NextResponse.json({ error: `Internal server error: ${errMsg}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const { id, action } = body;

    if (action === 'delete-user') {
      await db.user.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Security DELETE error:', errMsg);
    return NextResponse.json({ error: `Failed to delete: ${errMsg}` }, { status: 500 });
  }
}