import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { formatCurrency, hashPassword } from '@/lib/auth';

// ─── GET: List all staff with today's attendance + current payroll ───

export async function GET(request: NextRequest) {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const staffProfiles = await db.staffProfile.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            isActive: true,
          },
        },
        attendances: {
          where: {
            date: { gte: today, lte: todayEnd } as any,
          },
          select: {
            id: true,
            status: true,
            clockIn: true,
            clockOut: true,
            hoursWorked: true,
          },
        },
        payrollRecords: {
          where: { period: currentPeriod },
          select: {
            id: true,
            basicSalary: true,
            overtimePay: true,
            bonus: true,
            deductions: true,
            taxAmount: true,
            netPay: true,
            status: true,
            paidAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' } as any,
    });

    const staff = staffProfiles.map((profile) => {
      const todayAttendance = profile.attendances[0] || null;
      const currentPayroll = profile.payrollRecords[0] || null;

      return {
        id: profile.id,
        userId: profile.userId,
        user: profile.user,
        employeeId: profile.employeeId,
        department: profile.department,
        position: profile.position,
        baseSalary: profile.baseSalary,
        status: profile.status,
        startDate: profile.startDate,
        todayAttendance: todayAttendance
          ? {
              status: todayAttendance.status,
              clockIn: todayAttendance.clockIn,
              clockOut: todayAttendance.clockOut,
              hoursWorked: todayAttendance.hoursWorked,
            }
          : null,
        currentPayroll: currentPayroll
          ? {
              id: currentPayroll.id,
              basicSalary: currentPayroll.basicSalary,
              overtimePay: currentPayroll.overtimePay,
              bonus: currentPayroll.bonus,
              deductions: currentPayroll.deductions,
              taxAmount: currentPayroll.taxAmount,
              netPay: currentPayroll.netPay,
              status: currentPayroll.status,
              paidAt: currentPayroll.paidAt,
            }
          : null,
      };
    });

    const totalStaff = staff.length;
    const presentToday = staff.filter(
      (s) => s.todayAttendance && s.todayAttendance.status === 'present'
    ).length;
    const onLeave = staff.filter((s) => s.status === 'on_leave').length;
    const totalActive = staff.filter((s) => s.status === 'active').length;

    const monthlyPayroll = staff.reduce((sum, s) => {
      if (s.currentPayroll) {
        return sum + s.currentPayroll.netPay;
      }
      return sum + s.baseSalary;
    }, 0);

    const deptMap = new Map<string, { count: number; totalSalary: number }>();
    for (const s of staff) {
      const salary = s.currentPayroll ? s.currentPayroll.netPay : s.baseSalary;
      const existing = deptMap.get(s.department);
      if (existing) {
        existing.count += 1;
        existing.totalSalary += salary;
      } else {
        deptMap.set(s.department, { count: 1, totalSalary: salary });
      }
    }

    const payrollByDepartment = Array.from(deptMap.entries()).map(
      ([department, data]) => ({
        department,
        count: data.count,
        totalSalary: data.totalSalary,
      })
    );

    return NextResponse.json({
      staff,
      summary: {
        totalStaff,
        presentToday,
        onLeave,
        totalActive,
        monthlyPayroll,
        monthlyPayrollFormatted: formatCurrency(monthlyPayroll),
      },
      payrollByDepartment,
    });
  } catch (error: unknown) {
    console.error('Staff API error:', error);
    return NextResponse.json(
      { error: 'Failed to load staff data' },
      { status: 500 }
    );
  }
}

// ─── POST: Create new staff (User + StaffProfile) ───

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
    const {
      name,
      email,
      phone,
      department,
      position,
      baseSalary,
      employeeId,
      bankName,
      bankAccount,
      password,
    } = body;

    if (!name || !email || !department || !position || !baseSalary || !employeeId) {
      return NextResponse.json(
        { error: 'Name, email, department, position, base salary, and employee ID are required' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    const existingProfile = await db.staffProfile.findUnique({
      where: { employeeId },
    });
    if (existingProfile) {
      return NextResponse.json(
        { error: 'This employee ID is already in use' },
        { status: 400 }
      );
    }

    const hashedPw = await hashPassword(password || 'RoyalLoft@123');

    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashedPw,
        role: department === 'management' ? 'manager' : 'staff',
        department,
        isActive: true,
      },
    });

    const profile = await db.staffProfile.create({
      data: {
        userId: user.id,
        employeeId,
        department,
        position,
        baseSalary: Number(baseSalary),
        startDate: new Date(),
        status: 'active',
        bankName: bankName || null,
        bankAccount: bankAccount || null,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({ staff: profile }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create staff error:', error);
    return NextResponse.json(
      { error: 'Failed to create staff profile' },
      { status: 500 }
    );
  }
}