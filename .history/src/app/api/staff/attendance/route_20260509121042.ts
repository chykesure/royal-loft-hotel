import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── Robust body parser (Next.js 16 compatible) ───
async function parseBody(req: NextRequest): Promise<any> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return await req.json();
  }
  const raw = await req.text();
  try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON body'); }
}

// POST /api/staff/attendance
// Body: { staffId: string, status: "present" | "absent" | "half_day" | "on_leave" | "reset" }
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
      if (session) await db.session.delete({ where: { id: session.id } });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseBody(request);
    const { staffId, status } = body;

    if (!staffId || !status) {
      return NextResponse.json(
        { error: 'staffId and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['present', 'absent', 'half_day', 'on_leave', 'holiday', 'reset'];
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

    // Handle "reset" — delete today's attendance and restore staff to active
    if (status === 'reset') {
      await db.attendance.deleteMany({
        where: {
          staffId,
          date: { gte: today, lte: todayEnd } as any,
        },
      });

      if (staffProfile.status === 'on_leave') {
        await db.staffProfile.update({
          where: { id: staffId },
          data: { status: 'active' },
        });
      }

      return NextResponse.json({ attendance: null, message: 'Attendance reset' });
    }

    // Toggle: if the same status is already set, treat it as reset
    const existingAtt = await db.attendance.findFirst({
      where: {
        staffId,
        date: { gte: today, lte: todayEnd } as any,
      },
    });

    if (existingAtt && existingAtt.status === status) {
      await db.attendance.deleteMany({
        where: {
          staffId,
          date: { gte: today, lte: todayEnd } as any,
        },
      });

      if (staffProfile.status === 'on_leave') {
        await db.staffProfile.update({
          where: { id: staffId },
          data: { status: 'active' },
        });
      }

      return NextResponse.json({ attendance: null, message: 'Attendance cleared' });
    }

    await db.attendance.deleteMany({
      where: {
        staffId,
        date: { gte: today, lte: todayEnd } as any,
      },
    });

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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Attendance error:', errMsg);
    return NextResponse.json(
      { error: `Failed to record attendance: ${errMsg}` },
      { status: 500 }
    );
  }
}
