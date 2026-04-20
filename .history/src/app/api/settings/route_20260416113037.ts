import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

interface HotelSettings {
  hotelName: string;
  hotelShortName: string;
  email: string;
  phone: string;
  address: string;
}

const DEFAULT_SETTINGS: HotelSettings = {
  hotelName: 'Royal Loft Hotel',
  hotelShortName: 'Royal Loft',
  email: '',
  phone: '',
  address: '',
};

async function readSettings(): Promise<HotelSettings> {
  try {
    const raw = await readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function writeSettings(settings: HotelSettings): Promise<void> {
  await mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const settings = await readSettings();

    // Gather system stats
    const [guestCount, reservationCount, roomCount, policyCount, staffCount] = await Promise.all([
      db.guest.count(),
      db.reservation.count(),
      db.room.count(),
      db.hotelPolicy.count({ where: { isActive: true } }),
      db.user.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      settings,
      systemInfo: {
        totalGuests: guestCount,
        totalReservations: reservationCount,
        totalRooms: roomCount,
        activePolicies: policyCount,
        activeStaff: staffCount,
      },
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { hotelName, hotelShortName, email, phone, address } = body;

    const current = await readSettings();
    const updated: HotelSettings = {
      hotelName: hotelName || current.hotelName,
      hotelShortName: hotelShortName || current.hotelShortName,
      email: email !== undefined ? email : current.email,
      phone: phone !== undefined ? phone : current.phone,
      address: address !== undefined ? address : current.address,
    };

    await writeSettings(updated);

    return NextResponse.json({ settings: updated, success: true });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
