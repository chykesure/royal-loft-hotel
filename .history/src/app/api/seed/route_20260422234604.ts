import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  console.log('[SEED] Quick seed endpoint called');
  try {
    // Only create admin user (fast operation)
    const adminExists = await db.user.findUnique({ where: { email: 'admin@royalloft.com' } }).catch(() => null);
    if (!adminExists) {
      try {
        const hashedPassword = await hashPassword('Admin@123');
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
      } catch (err) {
        console.error('[SEED] Admin creation failed (may already exist):', err);
      }
    }

    // Check database status (each count has its own try/catch)
    let users = 0, roomTypes = 0, rooms = 0, guests = 0, reservations = 0, staff = 0;

    try { users = await db.user.count(); } catch {}
    try { roomTypes = await db.roomType.count(); } catch {}
    try { rooms = await db.room.count(); } catch {}
    try { guests = await db.guest.count(); } catch {}
    try { reservations = await db.reservation.count(); } catch {}
    try { staff = await db.staffProfile.count(); } catch {}

    const status = {
      users,
      roomTypes,
      rooms,
      guests,
      reservations,
      staff,
      message: 'Quick seed complete. For full data, run the SQL seed script in Supabase SQL Editor.',
      adminEmail: 'admin@royalloft.com',
      adminPassword: 'Admin@123',
    };

    return NextResponse.json(status);
  } catch (error: unknown) {
    console.error('[SEED] Quick seed failed:', error);
    // Return 200 anyway so the app doesn't break — seed is not critical
    return NextResponse.json({
      message: 'Seed check completed with warnings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}