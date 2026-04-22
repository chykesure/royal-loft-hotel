import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  const results: Record<string, string> = {};

  // 1. Check DATABASE_URL is set (without leaking any part of the URL)
  results['database_configured'] = process.env.DATABASE_URL ? 'YES' : 'NO';

  // 2. Try to connect
  try {
    const prisma = new PrismaClient({
      log: [],
    });
    await prisma.$connect();
    results['db_connect'] = 'SUCCESS';

    // 3. Try simple query
    const userCount = await prisma.user.count();
    results['user_count'] = String(userCount);

    await prisma.$disconnect();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results['db_connect'] = 'FAILED';
    results['error'] = msg.substring(0, 200);
  }

  results['status'] = 'ok';
  results['timestamp'] = new Date().toISOString();

  return NextResponse.json(results, { status: 200 });
}
