import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Validates the auth_token cookie and returns the session with user info.
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