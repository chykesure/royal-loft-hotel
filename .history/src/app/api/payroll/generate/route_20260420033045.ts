import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

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

        const { period, staff: staffList } = await request.json();

        if (!period || !staffList || !Array.isArray(staffList)) {
            return NextResponse.json(
                { error: 'Period and staff list are required' },
                { status: 400 }
            );
        }

        // Check if payroll already exists for this period
        const existing = await db.payrollRecord.findMany({
            where: { period }
        });

        if (existing.length > 0) {
            return NextResponse.json({
                error: `Payroll already exists for ${period} with ${existing.length} records. Delete pending records first if you want to regenerate.`
            }, { status: 400 });
        }

        const records = [];

        for (const s of staffList) {
            const profile = await db.staffProfile.findUnique({
                where: { id: s.staffId }
            });
            if (!profile || !profile.baseSalary) continue;

            const deductions = Number(s.deductions) || 0;
            const netPay = Number(profile.baseSalary) - deductions;

            const record = await db.payrollRecord.create({
                data: {
                    staffId: s.staffId,
                    period,
                    basicSalary: Number(profile.baseSalary),
                    deductions,
                    netPay,
                    status: 'pending',
                    processedBy: session.user.id
                }
            });
            records.push(record);
        }

        return NextResponse.json({
            success: true,
            count: records.length,
            totalAmount: records.reduce((sum: number, r: any) => sum + Number(r.netPay), 0),
            records
        });
    } catch (error: any) {
        console.error('Generate payroll error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}