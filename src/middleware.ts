import { NextRequest, NextResponse } from 'next/server';

/**
 * Centralized Authentication & Security Middleware
 * 
 * Protects ALL /api/* routes except explicitly whitelisted ones.
 * Whitelisted routes:
 *   - /api/auth/login     (intentionally public)
 *   - /api/auth/register  (intentionally public)
 *   - /api/auth/verify    (handles its own token check)
 *   - /api/health         (uptime monitoring — returns no sensitive data)
 */

// Routes that do NOT require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify',
  '/api/health',
];

// Super-admin only routes — extra layer of protection beyond the middleware guard
const SUPER_ADMIN_ROUTES = [
  '/api/developer-tools',
  '/api/seed',
  '/api/backup',
  '/api/migrate-data',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function isSuperAdminRoute(pathname: string): boolean {
  return SUPER_ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

// Lightweight in-memory rate limiter for login attempts
// Maps IP -> { count, resetTime }
const loginRateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_LOGIN_ATTEMPTS = 10; // per window
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginRateLimit.get(ip);
  if (!entry || now > entry.resetTime) {
    loginRateLimit.set(ip, { count: 1, resetTime: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count++;
  if (entry.count > MAX_LOGIN_ATTEMPTS) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public routes through
  if (isPublicRoute(pathname)) {
    // Rate limit login endpoint
    if (pathname === '/api/auth/login' && request.method === 'POST') {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';

      if (isRateLimited(ip)) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again in 15 minutes.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.next();
  }

  // All other /api/* routes require authentication
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Note: We don't validate the token in middleware because middleware
  // doesn't have access to Prisma/db. The token validity is checked
  // in each route handler. The middleware just ensures a token exists.
  // This prevents unauthenticated access to all protected endpoints.

  // Add security headers to all API responses
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};