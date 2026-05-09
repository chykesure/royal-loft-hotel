import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { formatCurrency, hashPassword } from '@/lib/auth';

// ─── Robust body parser (Next.js 16 compatible) ───
async function parseBody(req: NextRequest): Promise<any> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return await req.json();
  }
  const raw = await req.text();
  try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON body'); }
}

// ─── GET: List all staff + today's attendance + current payroll ───
// ?mode=unassigned → users without StaffProfile

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

    // ?mode=unassigned → return users without StaffProfile
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'unassigned') {
      const allUsers = await db.user.findMany({
        select: { id: true, name: true, email: true, phone: true, role: true, department: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });

      const staffProfiles = await db.staffProfile.findMany({
        select: { userId: true },
      });
      const linkedUserIds = new Set(staffProfiles.map(p => p.userId));

      const unassigned = allUsers.filter(u => !linkedUserIds.has(u.id));
      return NextResponse.json({ unassigned });
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

// ─── POST: Create new staff (User + StaffProfile) OR link existing user ───

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

    const body = await parseBody(request);
    const { action } = body;

    // ── ACTION: link_user — Create StaffProfile for an existing User ──
    if (action === 'link_user') {
      const { userId, employeeId, department, position, baseSalary, bankName, bankAccount } = body;

      if (!userId || !employeeId || !department || !position || !baseSalary) {
        return NextResponse.json(
          { error: 'User ID, Employee ID, department, position, and base salary are required' },
          { status: 400 }
        );
      }

      // Check user exists
      const existingUser = await db.user.findUnique({ where: { id: userId } });
      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check user doesn't already have a staff profile
      const existingProfile = await db.staffProfile.findUnique({ where: { userId } });
      if (existingProfile) {
        return NextResponse.json(
          { error: 'This user already has a staff profile' },
          { status: 400 }
        );
      }

      // Check unique employee ID
      const existingEmpId = await db.staffProfile.findUnique({ where: { employeeId } });
      if (existingEmpId) {
        return NextResponse.json({ error: 'This employee ID is already in use' }, { status: 400 });
      }

      const profile = await db.staffProfile.create({
        data: {
          userId,
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
            select: { name: true, email: true, phone: true, avatar: true, role: true, isActive: true },
          },
        },
      });

      // Update the user's department to match
      await db.user.update({
        where: { id: userId },
        data: { department },
      });

      return NextResponse.json({ staff: profile }, { status: 201 });
    }

    // ── DEFAULT ACTION: create — Create new User + StaffProfile ──
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

    const existingProfile = await db.staffProfile.findUnique({ where: { employeeId } });
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
          select: { name: true, email: true, phone: true, avatar: true, role: true, isActive: true },
        },
      },
    });

    return NextResponse.json({ staff: profile }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create staff error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to create staff profile: ${errMsg}` },
      { status: 500 }
    );
  }
}
