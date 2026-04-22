import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

/**
 * Password complexity validation.
 * Requirements:
 *   - Minimum 8 characters
 *   - At least 1 uppercase letter
 *   - At least 1 lowercase letter
 *   - At least 1 number
 *   - At least 1 special character
 */
function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least 1 uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least 1 lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least 1 number.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least 1 special character.' };
  }
  return { valid: true, message: '' };
}

/** Roles that are NOT allowed to be self-assigned during registration */
const RESTRICTED_ROLES = ['super_admin', 'admin', 'developer'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone, role, department } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Validate password complexity
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      );
    }

    // Prevent self-assignment of restricted roles
    if (role && RESTRICTED_ROLES.includes(role.toLowerCase())) {
      return NextResponse.json(
        { error: 'Cannot self-assign this role. Contact an administrator.' },
        { status: 403 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: role || 'staff',
        department,
        sessions: {
          create: {
            token,
            expiresAt,
            device: request.headers.get('user-agent') || undefined,
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: 'create',
        module: 'security',
        recordId: user.id,
        details: JSON.stringify({ action: 'user_registered', email: user.email, role: user.role }),
        ipAddress:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          undefined,
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
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
