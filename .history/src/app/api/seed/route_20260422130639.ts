import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  console.log('[SEED] Quick seed endpoint called');
  try {
    const adminExists = await db.user.findUnique({ where: { email: 'admin@royalloft.com' } });
    if (!adminExists) {
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';
      const hashedPassword = await hashPassword(adminPassword);
      await db.user.create({
        data: {
          email: 'admin@royalloft.com',
          password: hashedPassword,
          name: 'Pascal Manager',
          role: 'super_admin',
          department: 'management',
          phone: '+234 801 234 5678',
        },
      });
      console.log('[SEED] Admin user created');
    }

    const counts = await Promise.all([
      db.user.count(),
      db.roomType.count(),
      db.room.count(),
      db.guest.count(),
      db.reservation.count(),
      db.staffProfile.count(),
    ]);

    const status = {
      users: counts[0],
      roomTypes: counts[1],
      rooms: counts[2],
      guests: counts[3],
      reservations: counts[4],
      staff: counts[5],
      message: 'Quick seed complete.',
      adminEmail: 'admin@royalloft.com',
    };

    return NextResponse.json(status);
  } catch (error: unknown) {
    console.error('[SEED] Quick seed failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Quick seed failed', details: msg },
      { status: 500 }
    );
  }
}