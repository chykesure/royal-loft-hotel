import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/staff/attendance
// Body: { staffId: string, status: "present" | "absent" | "half_day" | "on_leave" }
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.session.findFirst({
      where: { token },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { staffId, status } = body;

    if (!staffId || !status) {
      return NextResponse.json(
        { error: 'staffId and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['present', 'absent', 'half_day', 'on_leave', 'holiday'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const staffProfile = await db.staffProfile.findUnique({
      where: { id: staffId },
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Delete existing attendance for today
    await db.attendance.deleteMany({
      where: {
        staffId,
        date: { gte: today, lte: todayEnd } as any,
      },
    });

    // Create new attendance record
    const clockIn = status === 'present' || status === 'half_day' ? new Date() : null;
    const hoursWorked = status === 'present' ? 8 : status === 'half_day' ? 4 : null;

    const attendance = await db.attendance.create({
      data: {
        staffId,
        date: today,
        status,
        clockIn,
        hoursWorked,
      },
    });

    // Toggle staff status based on attendance
    if (status === 'on_leave') {
      await db.staffProfile.update({
        where: { id: staffId },
        data: { status: 'on_leave' },
      });
    } else if (staffProfile.status === 'on_leave') {
      await db.staffProfile.update({
        where: { id: staffId },
        data: { status: 'active' },
      });
    }

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error: unknown) {
    console.error('Attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to record attendance' },
      { status: 500 }
    );
  }
}