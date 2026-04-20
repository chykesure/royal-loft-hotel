import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// GET - Fetch staff, attendance, and payroll data
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await db.session.findFirst({
      where: { token: sessionToken },
      include: { user: true }
    });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || getCurrentPeriod();

    // Fetch all staff (not guests)
    const staff = await db.user.findMany({
      where: {
        role: { not: 'guest' }
      },
      orderBy: { name: 'asc' }
    });

    // Today's attendance (all stored at midnight)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const attendance = await db.staffAttendance.findMany({
      where: { date: todayStart }
    });

    // Payroll records for the selected period
    const payrollRecords = await db.payrollRecord.findMany({
      where: { period },
      include: { staff: true },
      orderBy: { createdAt: 'desc' }
    });

    // Build attendance map: staffId -> status
    const attendanceMap: Record<string, string> = {};
    attendance.forEach((a: any) => {
      attendanceMap[a.staffId] = a.status;
    });

    const presentCount = attendance.filter((a: any) => a.status === 'present').length;
    const leaveCount = attendance.filter((a: any) => a.status === 'on_leave').length;

    const totalPayroll = payrollRecords.reduce((sum: number, p: any) => sum + Number(p.netPay), 0);
    const paidPayroll = payrollRecords
      .filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + Number(p.netPay), 0);

    return NextResponse.json({
      staff,
      attendance: attendanceMap,
      presentCount,
      leaveCount,
      totalStaff: staff.length,
      payrollRecords,
      totalPayroll,
      paidPayroll,
      period
    });
  } catch (error: any) {
    console.error('Payroll fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Mark attendance (single or batch)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await db.session.findFirst({
      where: { token: sessionToken },
      include: { user: true }
    });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Batch mode: mark multiple staff at once
    if (body.batch && body.staffIds) {
      const { status, staffIds, note } = body;
      for (const staffId of staffIds) {
        await db.staffAttendance.deleteMany({
          where: { staffId, date: todayStart }
        });
        if (status !== 'remove') {
          await db.staffAttendance.create({
            data: { staffId, date: todayStart, status, note: note || null }
          });
        }
      }
      return NextResponse.json({ success: true, count: staffIds.length });
    }

    // Single mode: mark one staff
    const { staffId, status, note } = body;
    if (!staffId || !status) {
      return NextResponse.json({ error: 'Missing staffId or status' }, { status: 400 });
    }

    await db.staffAttendance.deleteMany({
      where: { staffId, date: todayStart }
    });

    if (status !== 'remove') {
      await db.staffAttendance.create({
        data: { staffId, date: todayStart, status, note: note || null }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Attendance mark error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete all PENDING payroll records for a period
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await db.session.findFirst({
      where: { token: sessionToken },
      include: { user: true }
    });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    if (!period) {
      return NextResponse.json({ error: 'Period is required' }, { status: 400 });
    }

    const result = await db.payrollRecord.deleteMany({
      where: { period, status: 'pending' }
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: any) {
    console.error('Delete payroll error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}