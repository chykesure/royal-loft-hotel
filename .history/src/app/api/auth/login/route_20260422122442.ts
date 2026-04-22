import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed';

// Track whether seed has been triggered this process
let loginSeedTriggered = false;

// Account lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    // Auto-seed if database is empty (only once per process)
    if (!loginSeedTriggered) {
      const userCount = await db.user.count().catch(() => 0);
      if (userCount === 0) {
        console.log('[LOGIN] Database empty — triggering seed...');
        loginSeedTriggered = true;
        try {
          await seedDatabase();
          console.log('[LOGIN] Seed completed successfully');
        } catch (seedError: unknown) {
          console.error('[LOGIN] Seed failed:', seedError);
        }
      }
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is disabled
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is disabled. Contact administrator.' },
        { status: 403 }
      );
    }

    // Check if account is locked due to too many failed attempts
    const recentFailedAlerts = await db.securityAlert.findMany({
      where: {
        type: 'failed_login',
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - LOCKOUT_DURATION_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentFailedAlerts.length >= MAX_FAILED_ATTEMPTS) {
      const lastAttempt = recentFailedAlerts[0];
      const lockUntil = new Date(lastAttempt.createdAt.getTime() + LOCKOUT_DURATION_MS);
      const now = new Date();

      if (now < lockUntil) {
        const minutesLeft = Math.ceil((lockUntil.getTime() - now.getTime()) / 60000);
        return NextResponse.json(
          {
            error: `Account is temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
            locked: true,
            lockUntil: lockUntil.toISOString(),
          },
          { status: 423 }
        );
      }
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      const clientIp =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        undefined;

      await db.securityAlert.create({
        data: {
          type: 'failed_login',
          severity: recentFailedAlerts.length >= MAX_FAILED_ATTEMPTS - 1 ? 'high' : 'low',
          userId: user.id,
          ipAddress: clientIp,
          details: `Failed login attempt for ${email}. Total recent failures: ${recentFailedAlerts.length + 1}/${MAX_FAILED_ATTEMPTS}`,
        },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Successful login — clear any existing failed login alerts
    if (recentFailedAlerts.length > 0) {
      await db.securityAlert.updateMany({
        where: {
          type: 'failed_login',
          userId: user.id,
          isResolved: false,
        },
        data: { isResolved: true, resolvedAt: new Date() },
      });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        device: request.headers.get('user-agent') || undefined,
        ipAddress:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          undefined,
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: 'login',
        module: 'security',
        details: JSON.stringify({ action: 'user_login', email: user.email }),
        ipAddress:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        department: user.department,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (token) {
      await db.session.deleteMany({ where: { token } });
      await db.auditLog.create({
        data: {
          action: 'logout',
          module: 'security',
          details: JSON.stringify({ action: 'user_logout' }),
          ipAddress:
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            undefined,
        },
      });
    }

    const response = NextResponse.json({ message: 'Logged out' });
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}