import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
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

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is disabled. Contact administrator.' },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      await db.securityAlert.create({
        data: {
          type: 'failed_login',
          severity: 'low',
          userId: user.id,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          details: `Failed login attempt for ${email}`,
        },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        device: request.headers.get('user-agent') || undefined,
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
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
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
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
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
