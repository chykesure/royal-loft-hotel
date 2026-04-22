import { db } from '@/lib/db';
import { uploadBackupToStorage } from '@/lib/supabase-storage';

// Auto-backup configuration
export const AUTO_BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const MAX_BACKUPS = 10; // Keep last 10 backups
const BACKUP_SETTING_KEY = 'last_auto_backup';

/**
 * Export all database tables (excluding passwords) as a JSON object.
 */
export async function exportDatabase() {
  const users = await db.user.findMany({
    select: {
      id: true, email: true, name: true, phone: true, avatar: true,
      role: true, department: true, isActive: true, lastLogin: true,
      createdAt: true, updatedAt: true,
    },
  });

  const [
    rooms, roomTypes, guests, reservations, bills, payments,
    housekeepingTasks, maintenanceRequests, inventoryItems, stockMovements,
    hotelPolicies, expenses, cloudFiles, notifications, auditLogs,
    securityAlerts, guestFeedbacks, roles, permissions,
    invoices, hotelSettings, roleModuleAccesses, rolePermissions,
    staffProfiles, attendances, payrollRecords,
  ] = await Promise.all([
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
    db.invoice.findMany(),
    db.hotelSetting.findMany(),
    db.roleModuleAccess.findMany(),
    db.rolePermission.findMany(),
    db.staffProfile.findMany(),
    db.attendance.findMany(),
    db.payrollRecord.findMany(),
  ]);

  const data: Record<string, unknown[]> = {
    users, rooms, roomTypes, guests, reservations, bills, payments,
    housekeepingTasks, maintenanceRequests, inventoryItems, stockMovements,
    hotelPolicies, expenses, cloudFiles, notifications, auditLogs,
    securityAlerts, guestFeedbacks, roles, permissions,
    invoices, hotelSettings, roleModuleAccesses, rolePermissions,
    staffProfiles, attendances, payrollRecords,
  };

  let totalRecords = 0;
  for (const key of Object.keys(data)) {
    totalRecords += data[key].length;
  }

  return {
    meta: {
      version: '1.0',
      application: 'Royal Loft Hotel Management System',
      exportedAt: new Date().toISOString(),
      tablesCount: Object.keys(data).length,
      recordsCount: totalRecords,
    },
    data,
  };
}

/**
 * Create a new backup. Stores in the Backup table.
 * type: 'auto' | 'manual'
 */
export async function createBackup(
  type: 'auto' | 'manual' = 'manual',
  userId?: string,
  userName?: string
) {
  const backupRecord = await db.backup.create({
    data: {
      name: `${type === 'auto' ? 'Auto Backup' : 'Manual Backup'} — ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`,
      type,
      status: 'in_progress',
      createdBy: userId,
      createdByName: userName,
    },
  });

  try {
    const backupData = await exportDatabase();
    const jsonStr = JSON.stringify(backupData);
    const sizeBytes = Buffer.byteLength(jsonStr, 'utf-8');

    await db.backup.update({
      where: { id: backupRecord.id },
      data: {
        status: 'completed',
        sizeBytes,
        tablesCount: backupData.meta.tablesCount,
        recordsCount: backupData.meta.recordsCount,
        data: jsonStr,
      },
    });

    // Upload a copy to Supabase Storage (Level 3 — safe even if database crashes)
    const storagePath = await uploadBackupToStorage(backupRecord.id, jsonStr);
    if (storagePath) {
      await db.backup.update({
        where: { id: backupRecord.id },
        data: { storagePath },
      });
    }

    // Update last auto-backup time in settings
    if (type === 'auto') {
      await db.hotelSetting.upsert({
        where: { key: BACKUP_SETTING_KEY },
        update: { value: new Date().toISOString() },
        create: {
          key: BACKUP_SETTING_KEY,
          value: new Date().toISOString(),
          category: 'system',
          label: 'Last Auto Backup',
          type: 'datetime',
        },
      });
    }

    // Cleanup old backups (keep only MAX_BACKUPS)
    await cleanupOldBackups();

    // Create audit log
    try {
      await db.auditLog.create({
        data: {
          userId: userId || null,
          userName: userName || 'System',
          action: 'backup',
          module: 'backup',
          details: JSON.stringify({
            action: `${type}_backup`,
            backupId: backupRecord.id,
            sizeBytes,
            recordsCount: backupData.meta.recordsCount,
          }),
        },
      });
    } catch {
      // skip audit log if table not ready
    }

    return {
      success: true,
      backup: {
        id: backupRecord.id,
        name: backupRecord.name,
        type,
        status: 'completed',
        sizeBytes,
        tablesCount: backupData.meta.tablesCount,
        recordsCount: backupData.meta.recordsCount,
        createdAt: backupRecord.createdAt,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    await db.backup.update({
      where: { id: backupRecord.id },
      data: {
        status: 'failed',
        error: errorMsg,
      },
    });

    return {
      success: false,
      error: errorMsg,
      backup: { id: backupRecord.id, status: 'failed' },
    };
  }
}

/**
 * List all backups (metadata only, no data).
 */
export async function listBackups() {
  return db.backup.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      sizeBytes: true,
      tablesCount: true,
      recordsCount: true,
      createdBy: true,
      createdByName: true,
      error: true,
      storagePath: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a single backup's data (full JSON).
 */
export async function getBackupData(backupId: string) {
  const backup = await db.backup.findUnique({
    where: { id: backupId },
    select: { id: true, name: true, data: true, status: true, error: true },
  });
  return backup;
}

/**
 * Delete a backup.
 */
export async function deleteBackup(backupId: string) {
  await db.backup.delete({ where: { id: backupId } });
}

/**
 * Get the last auto-backup time from HotelSetting.
 */
export async function getLastAutoBackupTime(): Promise<Date | null> {
  const setting = await db.hotelSetting.findUnique({
    where: { key: BACKUP_SETTING_KEY },
  });
  if (setting?.value) {
    return new Date(setting.value);
  }
  return null;
}

/**
 * Check if auto-backup is due (6 hours since last one).
 */
export async function shouldRunAutoBackup(): Promise<boolean> {
  const lastBackup = await getLastAutoBackupTime();
  if (!lastBackup) return true;
  const elapsed = Date.now() - lastBackup.getTime();
  return elapsed >= AUTO_BACKUP_INTERVAL_MS;
}

/**
 * Check and run auto-backup if due. Returns result.
 */
export async function checkAndRunAutoBackup(
  userId?: string,
  userName?: string
): Promise<{ ran: boolean; result?: Awaited<ReturnType<typeof createBackup>> }> {
  const isDue = await shouldRunAutoBackup();
  if (!isDue) {
    return { ran: false };
  }

  const result = await createBackup('auto', userId, userName);
  return { ran: true, result };
}

/**
 * Delete old backups, keeping only the most recent MAX_BACKUPS.
 */
async function cleanupOldBackups() {
  const allBackups = await db.backup.findMany({
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  if (allBackups.length <= MAX_BACKUPS) return;

  const toDelete = allBackups.slice(MAX_BACKUPS);
  const idsToDelete = toDelete.map((b) => b.id);

  await db.backup.deleteMany({
    where: { id: { in: idsToDelete } },
  });
}

/**
 * Format bytes to human readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}