import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

// Track whether seed has been triggered this process
let seedTriggered = false;

// Server-side idle timeout: 30 minutes (must match client-side hook)
// If the session expiresAt is within 30 minutes from now, extend it.
// If the session has already expired (user idle > 30 min), reject it.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days absolute max

export async function GET(request: NextRequest) {
  try {
    // Auto-seed if database is empty (only once per process)
    if (!seedTriggered) {
      const userCount = await db.user.count().catch(() => 0);
      if (userCount === 0) {
        console.log('[VERIFY] Database empty — triggering seed...');
        seedTriggered = true;
        try {
          await seedDatabase();
          console.log('[VERIFY] Seed completed successfully');
        } catch (seedError: unknown) {
          console.error('[VERIFY] Seed failed:', seedError);
        }
      }
    }

    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) {
        await db.session.delete({ where: { id: session.id } });
      }
      return NextResponse.json({ authenticated: false, reason: 'expired' }, { status: 401 });
    }

    if (!session.user.isActive) {
      await db.session.delete({ where: { id: session.id } });
      return NextResponse.json({ authenticated: false, reason: 'disabled' }, { status: 401 });
    }

    // Refresh session expiry: extend by IDLE_TIMEOUT from now,
    // but never beyond the absolute max session life (7 days from creation)
    const maxExpiry = new Date(session.createdAt.getTime() + MAX_SESSION_MS);
    const idleExpiry = new Date(Date.now() + IDLE_TIMEOUT_MS);
    const newExpiry = idleExpiry < maxExpiry ? idleExpiry : maxExpiry;

    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiry },
    });

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
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
