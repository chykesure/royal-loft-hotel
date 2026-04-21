import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [
      users, rooms, roomTypes, guests, reservations, bills, payments,
      housekeepingTasks, maintenanceRequests, inventoryItems, stockMovements,
      hotelPolicies, expenses, cloudFiles, notifications, auditLogs,
      securityAlerts, guestFeedbacks, roles, permissions, sessions,
    ] = await Promise.all([
      db.user.count(), db.room.count(), db.roomType.count(), db.guest.count(),
      db.reservation.count(), db.bill.count(), db.payment.count(),
      db.housekeepingTask.count(), db.maintenanceRequest.count(),
      db.inventoryItem.count(), db.stockMovement.count(), db.hotelPolicy.count(),
      db.expense.count(), db.cloudFile.count(), db.notification.count(),
      db.auditLog.count(), db.securityAlert.count(), db.guestFeedback.count(),
      db.role.count(), db.permission.count(), db.session.count(),
    ]);

    return NextResponse.json({
      users, rooms, roomTypes, guests, reservations, bills, payments,
      housekeepingTasks, maintenanceRequests, inventoryItems, stockMovements,
      hotelPolicies, expenses, cloudFiles, notifications, auditLogs,
      securityAlerts, guestFeedbacks, roles, permissions, sessions,
    });
  } catch (error) {
    console.error('Developer tools GET error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { section } = body;
    const adminEmail = 'admin@royalloft.com';
    const developerEmail = 'developer@royalloft.com';
    const deleted: Record<string, number> = {};

    if (section === 'all') {
      deleted.payments = await db.payment.deleteMany().then((r) => r.count);
      deleted.bills = await db.bill.deleteMany().then((r) => r.count);
      deleted.guestFeedbacks = await db.guestFeedback.deleteMany().then((r) => r.count);
      deleted.reservations = await db.reservation.deleteMany().then((r) => r.count);
      deleted.stockMovements = await db.stockMovement.deleteMany().then((r) => r.count);
      deleted.inventoryItems = await db.inventoryItem.deleteMany().then((r) => r.count);
      deleted.housekeepingTasks = await db.housekeepingTask.deleteMany().then((r) => r.count);
      deleted.maintenanceRequests = await db.maintenanceRequest.deleteMany().then((r) => r.count);
      deleted.rooms = await db.room.deleteMany().then((r) => r.count);
      deleted.roomPricing = await db.roomPricing.deleteMany().then((r) => r.count);
      deleted.guests = await db.guest.deleteMany().then((r) => r.count);
      deleted.hotelPolicies = await db.hotelPolicy.deleteMany().then((r) => r.count);
      deleted.expenses = await db.expense.deleteMany().then((r) => r.count);
      deleted.cloudFiles = await db.cloudFile.deleteMany().then((r) => r.count);
      deleted.notifications = await db.notification.deleteMany().then((r) => r.count);
      deleted.auditLogs = await db.auditLog.deleteMany().then((r) => r.count);
      deleted.securityAlerts = await db.securityAlert.deleteMany().then((r) => r.count);
      deleted.chatbotConversations = await db.chatbotConversation.deleteMany().then((r) => r.count);
      deleted.rolePermissions = await db.rolePermission.deleteMany().then((r) => r.count);
      deleted.permissions = await db.permission.deleteMany().then((r) => r.count);
      deleted.roles = await db.role.deleteMany().then((r) => r.count);
      deleted.staffProfiles = await db.staffProfile.deleteMany().then((r) => r.count);
      deleted.attendances = await db.attendance.deleteMany().then((r) => r.count);
      deleted.payrollRecords = await db.payrollRecord.deleteMany().then((r) => r.count);
      deleted.sessions = await db.session.deleteMany().then((r) => r.count);
      deleted.users = await db.user.deleteMany({
        where: { AND: [{ email: { not: adminEmail } }, { email: { not: developerEmail } }] },
      }).then((r) => r.count);

      const totalDeleted = Object.values(deleted).reduce((sum, val) => sum + val, 0);
      return NextResponse.json({ success: true, message: `Database reset complete. ${totalDeleted} records deleted.`, deleted });
    }

    switch (section) {
      case 'reservations':
        deleted.payments = (await db.payment.deleteMany()).count;
        deleted.bills = (await db.bill.deleteMany()).count;
        deleted.reservations = (await db.reservation.deleteMany()).count;
        await db.room.updateMany({ where: { status: { in: ['occupied', 'reserved'] } }, data: { status: 'available' } });
        break;
      case 'guests':
        deleted.feedbacks = (await db.guestFeedback.deleteMany()).count;
        deleted.payments = (await db.payment.deleteMany()).count;
        deleted.bills = (await db.bill.deleteMany()).count;
        deleted.reservations = (await db.reservation.deleteMany()).count;
        deleted.guests = (await db.guest.deleteMany()).count;
        await db.room.updateMany({ where: { status: { in: ['occupied', 'reserved'] } }, data: { status: 'available' } });
        break;
      case 'billing':
        deleted.payments = (await db.payment.deleteMany()).count;
        deleted.bills = (await db.bill.deleteMany()).count;
        break;
      case 'housekeeping':
        deleted.housekeepingTasks = (await db.housekeepingTask.deleteMany()).count;
        break;
      case 'maintenance':
        deleted.maintenanceRequests = (await db.maintenanceRequest.deleteMany()).count;
        break;
      case 'inventory':
        deleted.stockMovements = (await db.stockMovement.deleteMany()).count;
        deleted.inventoryItems = (await db.inventoryItem.deleteMany()).count;
        break;
      case 'rooms':
        deleted.housekeepingTasks = (await db.housekeepingTask.deleteMany()).count;
        deleted.maintenanceRequests = (await db.maintenanceRequest.deleteMany()).count;
        deleted.reservations = (await db.reservation.deleteMany()).count;
        deleted.rooms = (await db.room.deleteMany()).count;
        break;
      case 'expenses':
        deleted.expenses = (await db.expense.deleteMany()).count;
        break;
      case 'audit-logs':
        deleted.auditLogs = (await db.auditLog.deleteMany()).count;
        break;
      case 'security-alerts':
        deleted.securityAlerts = (await db.securityAlert.deleteMany()).count;
        break;
      case 'notifications':
        deleted.notifications = (await db.notification.deleteMany()).count;
        break;
      case 'feedbacks':
        deleted.feedbacks = (await db.guestFeedback.deleteMany()).count;
        break;
      case 'policies':
        deleted.policies = (await db.hotelPolicy.deleteMany()).count;
        break;
      case 'roles-permissions':
        deleted.rolePermissions = (await db.rolePermission.deleteMany()).count;
        deleted.permissions = (await db.permission.deleteMany()).count;
        deleted.roles = (await db.role.deleteMany()).count;
        break;
      default:
        return NextResponse.json({ success: false, message: 'Invalid section' }, { status: 400 });
    }

    const totalDeleted = Object.values(deleted).reduce((sum, val) => sum + val, 0);
    return NextResponse.json({ success: true, message: `${section} reset complete. ${totalDeleted} records deleted.`, deleted });
  } catch (error) {
    console.error('Developer tools POST error:', error);
    return NextResponse.json({ success: false, message: 'Reset failed: ' + String(error) }, { status: 500 });
  }
}
