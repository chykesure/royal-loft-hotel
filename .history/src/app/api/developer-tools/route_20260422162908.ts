import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

// Module-to-Prisma-models mapping for reset
const MODULE_MODELS: Record<string, { models: string[]; label: string }> = {
  rooms: {
    label: 'Rooms & Room Types',
    models: ['IoTDevice', 'MaintenanceRequest', 'HousekeepingTask', 'Reservation', 'Room'],
  },
  guests: {
    label: 'Guests',
    models: ['GuestFeedback', 'ChatbotConversation', 'Bill', 'Reservation', 'Guest'],
  },
  reservations: {
    label: 'Reservations',
    models: ['GuestFeedback', 'Invoice', 'Payment', 'Bill', 'Reservation'],
  },
  billing: {
    label: 'Billing & Invoices',
    models: ['Invoice', 'Payment', 'Bill'],
  },
  staff: {
    label: 'Staff & Payroll',
    models: ['PayrollRecord', 'Attendance', 'StaffProfile'],
  },
  inventory: {
    label: 'Inventory',
    models: ['StockMovement', 'InventoryItem'],
  },
  expenses: {
    label: 'Expenses',
    models: ['Expense'],
  },
  security: {
    label: 'Security',
    models: ['SecurityAlert'],
  },
  cloud: {
    label: 'Cloud Storage',
    models: ['CloudFile'],
  },
  reports: {
    label: 'Reports & Forecasts',
    models: ['DemandForecast', 'PricingSuggestion'],
  },
  rules: {
    label: 'Hotel Rules & Policies',
    models: ['HotelPolicy'],
  },
  notifications: {
    label: 'Notifications',
    models: ['Notification'],
  },
  audit: {
    label: 'Audit Logs',
    models: ['AuditLog'],
  },
};

export async function GET(request: NextRequest) {
  try {
    // Authenticate — super_admin only
    const session = await authenticateRequest(request);
    if (!session) return unauthorizedResponse();
    if (!['super_admin', 'developer'].includes(session.user.role)) {
      return forbiddenResponse('Developer tools are restricted to administrators only.');
    }

    // Return module counts (with per-model error handling)
    const modules = await Promise.all(
      Object.entries(MODULE_MODELS).map(async ([key, config]) => {
        let totalCount = 0;
        const workingModels: string[] = [];
        const failedModels: string[] = [];
        for (const model of config.models) {
          try {
            // @ts-expect-error - dynamic prisma model access
            const count = await (db[model] as any).count();
            totalCount += count;
            workingModels.push(model);
          } catch {
            failedModels.push(model);
          }
        }
        return {
          key,
          label: config.label,
          count: totalCount,
          models: workingModels,
          ...(failedModels.length > 0 ? { failedModels } : {}),
        };
      })
    );
    return NextResponse.json({ modules });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate — super_admin only
    const session = await authenticateRequest(request);
    if (!session) return unauthorizedResponse();
    if (!['super_admin', 'developer'].includes(session.user.role)) {
      return forbiddenResponse('Developer tools are restricted to administrators only.');
    }

    const body = await request.json();
    const { module: moduleKey } = body;

    if (!moduleKey || !MODULE_MODELS[moduleKey]) {
      return NextResponse.json(
        { error: 'Invalid module. Valid modules: ' + Object.keys(MODULE_MODELS).join(', ') },
        { status: 400 }
      );
    }

    const config = MODULE_MODELS[moduleKey];
    let deletedTotal = 0;

    for (const model of config.models) {
      try {
        // @ts-expect-error - dynamic prisma model access
        const result = await (db[model] as any).deleteMany();
        deletedTotal += result.count;
      } catch {
        // Skip models that fail (e.g., foreign key constraints)
      }
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        action: 'delete',
        module: 'developer-tools',
        details: JSON.stringify({ action: 'reset_module', module: moduleKey, deletedCount: deletedTotal }),
      },
    });

    return NextResponse.json({
      message: `Reset "${config.label}" — ${deletedTotal} records deleted`,
      module: moduleKey,
      deletedCount: deletedTotal,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate — super_admin only
    const session = await authenticateRequest(request);
    if (!session) return unauthorizedResponse();
    if (!['super_admin', 'developer'].includes(session.user.role)) {
      return forbiddenResponse('Full database reset is restricted to administrators only.');
    }

    // Full database reset — delete ALL data (except settings and role access)
    const allModels = Object.values(MODULE_MODELS).flatMap((m) => m.models);
    // Deduplicate
    const uniqueModels = [...new Set(allModels)];
    let deletedTotal = 0;

    for (const model of uniqueModels) {
      try {
        // @ts-expect-error - dynamic prisma model access
        const result = await (db[model] as any).deleteMany();
        deletedTotal += result.count;
      } catch {
        // Skip models that fail
      }
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        action: 'delete',
        module: 'developer-tools',
        details: JSON.stringify({ action: 'full_database_reset', deletedCount: deletedTotal }),
      },
    });

    return NextResponse.json({
      message: `Full database reset — ${deletedTotal} records deleted`,
      deletedCount: deletedTotal,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}