import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

const DEPARTMENT_LABELS: Record<string, string> = {
  front_desk: 'Front Desk',
  housekeeping: 'Housekeeping',
  kitchen: 'Kitchen',
  security: 'Security',
  maintenance: 'Maintenance',
  management: 'Management',
  accounts: 'Accounts',
};

// GET /api/staff - List staff with summary
export async function GET() {
  try {
    // Fetch all staff profiles with user data
    const staffProfiles = await db.staffProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            avatar: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count attendance for today
    const presentToday = await db.attendance.count({
      where: {
        date: { gte: today, lt: tomorrow },
        status: 'present',
      },
    });

    // Count staff on leave
    const onLeave = await db.staffProfile.count({
      where: { status: 'on_leave' },
    });

    // Sum monthly payroll (active staff base salaries)
    const payrollAgg = await db.staffProfile.aggregate({
      where: { status: 'active' },
      _sum: { baseSalary: true },
      _count: true,
    });

    // Group by department
    const deptGrouping = await db.staffProfile.groupBy({
      by: ['department'],
      where: { status: 'active' },
      _count: true,
      _sum: { baseSalary: true },
    });

    const departments = deptGrouping.map((d) => ({
      department: d.department,
      label: DEPARTMENT_LABELS[d.department] || d.department,
      staffCount: d._count,
      totalSalary: d._sum.baseSalary || 0,
    }));

    return NextResponse.json({
      staff: staffProfiles,
      summary: {
        totalStaff: staffProfiles.length,
        presentToday,
        onLeave,
        monthlyPayroll: payrollAgg._sum.baseSalary || 0,
      },
      departments,
    });
  } catch (error) {
    console.error('Staff GET error:', error);
    return NextResponse.json({ error: 'Failed to load staff data' }, { status: 500 });
  }
}

// POST /api/staff - Add new staff member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      phone,
      department,
      position,
      baseSalary,
      bankName,
      bankAccount,
      emergencyContact,
      emergencyPhone,
      role,
    } = body;

    if (!name || !email || !password || !department || !position || !baseSalary) {
      return NextResponse.json(
        { error: 'Name, email, password, department, position, and base salary are required' },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    // Generate employee ID
    const lastStaff = await db.staffProfile.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { employeeId: true },
    });

    let nextNum = 1;
    if (lastStaff && lastStaff.employeeId) {
      const match = lastStaff.employeeId.match(/RL-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const employeeId = `RL-${String(nextNum).padStart(3, '0')}`;

    // Create User first
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: role || 'staff',
        department,
      },
    });

    // Create StaffProfile
    const staffProfile = await db.staffProfile.create({
      data: {
        userId: user.id,
        employeeId,
        department,
        position,
        baseSalary: parseFloat(String(baseSalary)),
        startDate: new Date(),
        status: 'active',
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        emergencyContact: emergencyContact || null,
        emergencyPhone: emergencyPhone || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            avatar: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json(staffProfile, { status: 201 });
  } catch (error) {
    console.error('Staff POST error:', error);
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 });
  }
}

// PUT /api/staff?id=xxx - Update staff
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff profile ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const staffProfile = await db.staffProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!staffProfile) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
    }

    // Update User fields
    const userUpdateData: Record<string, unknown> = {};
    if (body.name !== undefined) userUpdateData.name = body.name;
    if (body.email !== undefined) userUpdateData.email = body.email;
    if (body.phone !== undefined) userUpdateData.phone = body.phone || null;
    if (body.role !== undefined) userUpdateData.role = body.role;

    if (Object.keys(userUpdateData).length > 0) {
      await db.user.update({
        where: { id: staffProfile.userId },
        data: userUpdateData,
      });
    }

    // Update StaffProfile fields
    const profileUpdateData: Record<string, unknown> = {};
    if (body.department !== undefined) profileUpdateData.department = body.department;
    if (body.position !== undefined) profileUpdateData.position = body.position;
    if (body.baseSalary !== undefined) profileUpdateData.baseSalary = parseFloat(String(body.baseSalary));
    if (body.status !== undefined) profileUpdateData.status = body.status;
    if (body.bankName !== undefined) profileUpdateData.bankName = body.bankName || null;
    if (body.bankAccount !== undefined) profileUpdateData.bankAccount = body.bankAccount || null;
    if (body.emergencyContact !== undefined) profileUpdateData.emergencyContact = body.emergencyContact || null;
    if (body.emergencyPhone !== undefined) profileUpdateData.emergencyPhone = body.emergencyPhone || null;

    if (Object.keys(profileUpdateData).length > 0) {
      await db.staffProfile.update({
        where: { id },
        data: profileUpdateData,
      });
    }

    // Fetch updated record
    const updated = await db.staffProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            avatar: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Staff PUT error:', error);
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
  }
}

// DELETE /api/staff?id=xxx - Archive staff (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff profile ID is required' }, { status: 400 });
    }

    const staffProfile = await db.staffProfile.findUnique({
      where: { id },
    });

    if (!staffProfile) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
    }

    // Archive: set isActive=false on User, status='terminated' on StaffProfile
    await db.user.update({
      where: { id: staffProfile.userId },
      data: { isActive: false },
    });

    await db.staffProfile.update({
      where: { id },
      data: {
        status: 'terminated',
        endDate: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Staff DELETE error:', error);
    return NextResponse.json({ error: 'Failed to archive staff member' }, { status: 500 });
  }
}
