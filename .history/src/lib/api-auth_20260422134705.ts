import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Server-side idle timeout: 30 minutes
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days absolute max

/**
 * Validates the auth_token cookie and returns the session with user info.
 * Also extends the session expiry on every call (server-side heartbeat).
 * Returns null if not authenticated or session expired.
 */
export async function authenticateRequest(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
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
    // Clean up expired session
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (!session.user.isActive) return null;

  // Server-side heartbeat: extend idle timeout on every API call
  // This means as long as the user is actively using the app (making API calls),
  // the session stays alive. If they go idle, the session expires.
  try {
    const maxExpiry = new Date(session.createdAt.getTime() + MAX_SESSION_MS);
    const idleExpiry = new Date(Date.now() + IDLE_TIMEOUT_MS);
    const newExpiry = idleExpiry < maxExpiry ? idleExpiry : maxExpiry;

    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiry },
    }).catch(() => {});
  } catch {
    // Don't fail auth just because we couldn't extend the session
  }

  return session;
}

/**
 * Returns a 401 Unauthorized JSON response.
 */
export function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Returns a 403 Forbidden JSON response.
 */
export function forbiddenResponse(message = 'Insufficient permissions') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Checks if the authenticated user has a super_admin role.
 * Must be called after authenticateRequest.
 */
export function isSuperAdmin(role: string): boolean {
  return role === 'super_admin' || role === 'admin';
}
