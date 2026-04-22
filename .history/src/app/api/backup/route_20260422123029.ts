import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate — super_admin only
    const session = await authenticateRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.user.role !== 'super_admin') {
      return forbiddenResponse('Database backup is restricted to super administrators only.');
    }

    // Export all data from all tables (exclude passwords)
    const users = await db.user.findMany({
      select: {
        id: true, email: true, name: true, phone: true, avatar: true,
        role: true, department: true, isActive: true, lastLogin: true,
        createdAt: true, updatedAt: true,
        // password is EXCLUDED
      },
    });

    const [rooms, roomTypes, guests, reservations, bills, payments, housekeepingTasks, maintenanceRequests, inventoryItems, stockMovements, hotelPolicies, expenses, cloudFiles, notifications, auditLogs, securityAlerts, guestFeedbacks, roles, permissions] = await Promise.all([
      db.room.findMany(),
      db.roomType.findMany(),
      db.guest.findMany(),
      db.reservation.findMany(),
      db.bill.findMany(),
      db.payment.findMany(),
      db.housekeepingTask.findMany(),
      db.maintenanceRequest.findMany(),
      db.inventoryItem.findMany(),
      db.stockMovement.findMany(),
      db.hotelPolicy.findMany(),
      db.expense.findMany(),
      db.cloudFile.findMany(),
      db.notification.findMany(),
      db.auditLog.findMany(),
      db.securityAlert.findMany(),
      db.guestFeedback.findMany(),
      db.role.findMany(),
      db.permission.findMany(),
    ]);

    const backup = {
      meta: {
        version: '1.0',
        application: 'Royal Loft Hotel Management System',
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.name,
        tablesCount: 20,
      },
      data: {
        users, rooms, roomTypes, guests, reservations, bills, payments,
        housekeepingTasks, maintenanceRequests, inventoryItems, stockMovements,
        hotelPolicies, expenses, cloudFiles, notifications, auditLogs,
        securityAlerts, guestFeedbacks, roles, permissions,
      },
    };

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        action: 'export',
        module: 'backup',
        details: JSON.stringify({ action: 'database_backup_export' }),
      },
    });

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Backup GET error:', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate — super_admin only
    const session = await authenticateRequest(request);
    if (!session) return unauthorizedResponse();
    if (session.user.role !== 'super_admin') {
      return forbiddenResponse('Database restore is restricted to super administrators only.');
    }

    const backup = await request.json();
    if (!backup.meta || !backup.data) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    // Clear all data first
    await db.payment.deleteMany();
    await db.bill.deleteMany();
    await db.guestFeedback.deleteMany();
    await db.reservation.deleteMany();
    await db.stockMovement.deleteMany();
    await db.inventoryItem.deleteMany();
    await db.housekeepingTask.deleteMany();
    await db.maintenanceRequest.deleteMany();
    await db.room.deleteMany();
    await db.roomPricing.deleteMany();
    await db.guest.deleteMany();
    await db.hotelPolicy.deleteMany();
    await db.expense.deleteMany();
    await db.cloudFile.deleteMany();
    await db.notification.deleteMany();
    await db.auditLog.deleteMany();
    await db.securityAlert.deleteMany();
    await db.rolePermission.deleteMany();
    await db.permission.deleteMany();
    await db.role.deleteMany();
    await db.staffProfile.deleteMany();
    await db.attendance.deleteMany();
    await db.payrollRecord.deleteMany();
    await db.session.deleteMany();
    await db.chatbotConversation.deleteMany();
    await db.demandForecast.deleteMany();
    await db.pricingSuggestion.deleteMany();
    await db.user.deleteMany();

    // Restore data
    const d = backup.data;
    let tablesRestored = 0;
    let totalRecordsRestored = 0;

    const restoreTable = async (name: string, records: unknown[]) => {
      if (!records || records.length === 0) return;
      // @ts-expect-error dynamic model access
      const model = db[name.charAt(0).toLowerCase() + name.slice(1)];
      if (model && model.createMany) {
        for (const record of records) {
          try {
            // @ts-expect-error dynamic create
            await model.create({ data: record });
            totalRecordsRestored++;
          } catch (e) {
            // Skip records that fail (e.g., unique constraints)
          }
        }
        tablesRestored++;
      }
    };

    await restoreTable('roomType', d.roomTypes);
    await restoreTable('room', d.rooms);
    await restoreTable('guest', d.guests);
    await restoreTable('user', d.users);
    await restoreTable('reservation', d.reservations);
    await restoreTable('bill', d.bills);
    await restoreTable('payment', d.payments);
    await restoreTable('housekeepingTask', d.housekeepingTasks);
    await restoreTable('maintenanceRequest', d.maintenanceRequests);
    await restoreTable('inventoryItem', d.inventoryItems);
    await restoreTable('stockMovement', d.stockMovements);
    await restoreTable('hotelPolicy', d.hotelPolicies);
    await restoreTable('expense', d.expenses);
    await restoreTable('cloudFile', d.cloudFiles);
    await restoreTable('notification', d.notifications);
    await restoreTable('auditLog', d.auditLogs);
    await restoreTable('securityAlert', d.securityAlerts);
    await restoreTable('guestFeedback', d.guestFeedbacks);
    await restoreTable('role', d.roles);
    await restoreTable('permission', d.permissions);

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        action: 'import',
        module: 'backup',
        details: JSON.stringify({
          action: 'database_backup_restore',
          totalRecordsRestored,
          tablesRestored,
        }),
      },
    });

    return NextResponse.json({ success: true, totalRecordsRestored, tablesRestored });
  } catch (error) {
    console.error('Backup POST error:', error);
    return NextResponse.json({ error: 'Restore failed: ' + String(error) }, { status: 500 });
  }
}