import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import {
  createBackup,
  listBackups,
  getBackupData,
  deleteBackup,
  checkAndRunAutoBackup,
  getLastAutoBackupTime,
  formatBytes,
  exportDatabase,
  AUTO_BACKUP_INTERVAL_MS,
} from '@/lib/backup-service';

// Resilient auth - same pattern as expenses and role-access
async function authenticate() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const session = await db.session.findFirst({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            department: true,
            isActive: true,
          },
        },
      },
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }
    if (!session.user.isActive) return null;

    return session;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await authenticate();

    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');
    const statusCheck = searchParams.get('status');

    // Download specific backup
    if (backupId) {
      if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

      const backup = await getBackupData(backupId);
      if (!backup) {
        return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
      }
      if (!backup.data) {
        return NextResponse.json({ error: 'Backup data not available' }, { status: 404 });
      }

      return new NextResponse(backup.data, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="royal-loft-backup-${backupId}.json"`,
        },
      });
    }

    // Return auto-backup status
    if (statusCheck === 'auto') {
      const lastBackup = await getLastAutoBackupTime();
      const now = Date.now();
      let nextDueAt: string | null = null;
      let isOverdue = false;

      if (lastBackup) {
        const nextDue = lastBackup.getTime() + AUTO_BACKUP_INTERVAL_MS;
        nextDueAt = new Date(nextDue).toISOString();
        isOverdue = now > nextDue;
      } else {
        isOverdue = true;
      }

      return NextResponse.json({
        lastAutoBackup: lastBackup?.toISOString() || null,
        nextDueAt,
        isOverdue,
        intervalHours: AUTO_BACKUP_INTERVAL_MS / (60 * 60 * 1000),
      });
    }

    // List all backups
    const backups = await listBackups();
    const formatted = backups.map((b) => ({
      ...b,
      sizeFormatted: formatBytes(b.sizeBytes),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Backup GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await authenticate();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Backup access is restricted to super administrators only.' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // ── Create Manual Backup ──
    if (action === 'create') {
      const result = await createBackup('manual', session.user.id, session.user.name);
      if (result.success) {
        return NextResponse.json(result);
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // ── Auto-Backup Check ──
    if (action === 'auto-check') {
      const { ran, result } = await checkAndRunAutoBackup(session.user.id, session.user.name);
      return NextResponse.json({
        ran,
        backup: result?.backup || null,
        error: result && !result.success ? result.error : null,
      });
    }

    // ── Restore from Stored Backup ──
    if (action === 'restore') {
      const { backupId } = body;
      if (!backupId) {
        return NextResponse.json({ error: 'backupId is required' }, { status: 400 });
      }

      const backup = await getBackupData(backupId);
      if (!backup || !backup.data) {
        return NextResponse.json({ error: 'Backup not found or has no data' }, { status: 404 });
      }

      const backupData = JSON.parse(backup.data);
      const restoreResult = await performRestore(backupData, session.user.id, session.user.name);
      return NextResponse.json(restoreResult);
    }

    // ── Restore from Uploaded File ──
    if (action === 'restore-upload' || (!action && body.meta && body.data)) {
      const backup = body.action === 'restore-upload' ? body : body;
      if (!backup.meta || !backup.data) {
        return NextResponse.json({ error: 'Invalid backup format. Must have meta and data.' }, { status: 400 });
      }
      const restoreResult = await performRestore(backup, session.user.id, session.user.name);
      return NextResponse.json(restoreResult);
    }

    return NextResponse.json({ error: 'Unknown action. Use: create, auto-check, restore, or restore-upload.' }, { status: 400 });
  } catch (error) {
    console.error('Backup POST error:', error);
    return NextResponse.json({ error: 'Restore failed: ' + String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await authenticate();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Backup deletion is restricted to super administrators only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');
    if (!backupId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    await deleteBackup(backupId);

    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name,
          action: 'delete',
          module: 'backup',
          details: JSON.stringify({ action: 'delete_backup', backupId }),
        },
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Backup DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
  }
}

async function performRestore(
  backup: { meta: Record<string, unknown>; data: Record<string, unknown[]> },
  userId?: string,
  userName?: string
) {
  const clearOrder = [
    'payment', 'invoice', 'guestFeedback', 'reservation', 'stockMovement',
    'inventoryItem', 'housekeepingTask', 'maintenanceRequest',
    'room', 'roomPricing', 'guest', 'hotelPolicy', 'expense',
    'cloudFile', 'notification', 'auditLog', 'securityAlert',
    'rolePermission', 'permission', 'role', 'staffProfile',
    'attendance', 'payrollRecord', 'session', 'chatbotConversation',
    'demandForecast', 'pricingSuggestion', 'hotelSetting',
    'roleModuleAccess', 'user',
  ];

  for (const tableName of clearOrder) {
    try {
      await db[tableName].deleteMany();
    } catch {}
  }

  const d = backup.data;
  let tablesRestored = 0;
  let totalRecordsRestored = 0;

  const tableNames = [
    'role', 'permission', 'rolePermission', 'roomType', 'roomPricing',
    'room', 'guest', 'user', 'reservation', 'bill', 'payment',
    'housekeepingTask', 'maintenanceRequest', 'inventoryItem',
    'stockMovement', 'hotelPolicy', 'expense', 'cloudFile',
    'notification', 'auditLog', 'securityAlert', 'guestFeedback',
    'staffProfile', 'attendance', 'payrollRecord',
    'demandForecast', 'pricingSuggestion', 'hotelSetting',
    'roleModuleAccess', 'invoice', 'chatbotConversation',
  ];

  for (const tableName of tableNames) {
    const records = d[tableName];
    if (!records || !Array.isArray(records) || records.length === 0) continue;

    const modelKey = tableName.charAt(0).toLowerCase() + tableName.slice(1);

    try {
      const model = db[modelKey];
      if (model && model.createMany) {
        try {
          await model.createMany({ data: records, skipDuplicates: true });
          totalRecordsRestored += records.length;
          tablesRestored++;
        } catch {
          for (const record of records) {
            try {
              await model.create({ data: record });
              totalRecordsRestored++;
            } catch {}
          }
          tablesRestored++;
        }
      }
    } catch {}
  }

  try {
    await db.auditLog.create({
      data: {
        userId: userId || null,
        userName: userName || 'System',
        action: 'restore',
        module: 'backup',
        details: JSON.stringify({
          action: 'database_restore',
          backupDate: backup.meta?.exportedAt,
          totalRecordsRestored,
          tablesRestored,
        }),
      },
    });
  } catch {}

  return { success: true, totalRecordsRestored, tablesRestored };
}