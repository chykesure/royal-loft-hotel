import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateConfirmationCode, formatCurrency } from '@/lib/auth';

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
          where: { date: { gte: today, lte: todayEnd } as any },
          select: { id: true, status: true, clockIn: true, clockOut: true, hoursWorked: true },
        },
        payrollRecords: {
          where: { period: currentPeriod },
          select: {
            id: true, basicSalary: true, overtimePay: true, bonus: true,
            deductions: true, taxAmount: true, netPay: true, status: true, paidAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' } as any,
    });

    const staff = staffProfiles.map((profile: any) => {
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
        bankName: profile.bankName,
        bankAccount: profile.bankAccount,
        todayAttendance: todayAttendance ? {
          status: todayAttendance.status,
          clockIn: todayAttendance.clockIn,
          clockOut: todayAttendance.clockOut,
          hoursWorked: todayAttendance.hoursWorked,
        } : null,
        currentPayroll: currentPayroll ? {
          id: currentPayroll.id,
          basicSalary: currentPayroll.basicSalary,
          overtimePay: currentPayroll.overtimePay,
          bonus: currentPayroll.bonus,
          deductions: currentPayroll.deductions,
          taxAmount: currentPayroll.taxAmount,
          netPay: currentPayroll.netPay,
          status: currentPayroll.status,
          paidAt: currentPayroll.paidAt,
        } : null,
      };
    });

    const totalStaff = staff.length;
    const presentToday = staff.filter((s: any) => s.todayAttendance && s.todayAttendance.status === 'present').length;
    const onLeave = staff.filter((s: any) => s.status === 'on_leave').length;
    const totalActive = staff.filter((s: any) => s.status === 'active').length;

    const monthlyPayroll = staff.reduce((sum: number, s: any) => {
      return sum + (s.currentPayroll ? s.currentPayroll.netPay : s.baseSalary);
    }, 0);

    const deptMap = new Map<string, { count: number; totalSalary: number }>();
    for (const s of staff) {
      const salary = (s as any).currentPayroll ? (s as any).currentPayroll.netPay : (s as any).baseSalary;
      const existing = deptMap.get((s as any).department);
      if (existing) {
        existing.count += 1;
        existing.totalSalary += salary;
      } else {
        deptMap.set((s as any).department, { count: 1, totalSalary: salary });
      }
    }

    const payrollByDepartment = Array.from(deptMap.entries()).map(([department, data]) => ({
      department, count: data.count, totalSalary: data.totalSalary,
    }));

    return NextResponse.json({
      staff,
      summary: {
        totalStaff, presentToday, onLeave, totalActive,
        monthlyPayroll, monthlyPayrollFormatted: formatCurrency(monthlyPayroll),
      },
      payrollByDepartment,
    });
  } catch (error: unknown) {
    console.error('Staff API error:', error);
    return NextResponse.json({ error: 'Failed to load staff data' }, { status: 500 });
  }
}

// ═══════════════ ADD NEW STAFF ═══════════════

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
    const { name, email, phone, password, department, position, baseSalary, bankName, bankAccount } = body;

    if (!name || !email || !department || !position || !baseSalary) {
      return NextResponse.json({ error: 'Name, email, department, position, and salary are required' }, { status: 400 });
    }

    // Check if user with this email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    // Generate employee ID
    const staffCount = await db.staffProfile.count();
    const empId = `RL-EMP-${String(staffCount + 1).padStart(4, '0')}`;

    // Create user account
    const hashedPassword = await hashPassword(password || 'Staff@123');
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: 'staff',
        department,
      },
    });

    // Create staff profile
    const profile = await db.staffProfile.create({
      data: {
        userId: user.id,
        employeeId: empId,
        department,
        position,
        baseSalary: parseFloat(baseSalary),
        startDate: new Date(),
        status: 'active',
        bankName: bankName || null,
        bankAccount: bankAccount || null,
      },
      include: { user: true },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error: unknown) {
    console.error('Create staff error:', error);
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 });
  }
}

// ═══════════════ UPDATE STAFF ═══════════════

export async function PUT(request: NextRequest) {
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
    const { id, name, email, phone, department, position, baseSalary, status, bankName, bankAccount } = body;

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    const profile = await db.staffProfile.findUnique({ where: { id }, include: { user: true } });
    if (!profile) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    // Update user info
    if (name || email || phone) {
      await db.user.update({
        where: { id: profile.userId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone !== undefined && { phone }),
        },
      });
    }

    // Update staff profile
    const updateData: Record<string, unknown> = {};
    if (department) updateData.department = department;
    if (position) updateData.position = position;
    if (baseSalary !== undefined) updateData.baseSalary = parseFloat(baseSalary);
    if (status) updateData.status = status;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;

    const updated = await db.staffProfile.update({
      where: { id },
      data: updateData,
      include: { user: true },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Update staff error:', error);
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
  }
}