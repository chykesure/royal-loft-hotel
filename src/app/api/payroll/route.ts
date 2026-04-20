import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/auth';

// ═══════════════ GET: Fetch payroll records for a period ═══════════════

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

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || (() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        })();

        const records = await db.payrollRecord.findMany({
            where: { period },
            include: {
                staff: {
                    include: {
                        user: { select: { name: true, email: true, phone: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const totalNetPay = records.reduce((s, r) => s + r.netPay, 0);
        const paidAmount = records.filter(r => r.status === 'paid' || r.status === 'processed').reduce((s, r) => s + r.netPay, 0);
        const pendingAmount = records.filter(r => r.status === 'pending').reduce((s, r) => s + r.netPay, 0);

        return NextResponse.json({
            records,
            summary: {
                total: records.length,
                paid: records.filter(r => r.status === 'paid').length,
                pending: records.filter(r => r.status === 'pending').length,
                processed: records.filter(r => r.status === 'processed').length,
                totalNetPay,
                paidAmount,
                pendingAmount,
            },
        });
    } catch (error: unknown) {
        console.error('Payroll GET error:', error);
        return NextResponse.json({ error: 'Failed to load payroll' }, { status: 500 });
    }
}

// ═══════════════ POST: Generate payroll for current period ═══════════════

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
        const { period, staffId, basicSalary, overtimePay, bonus, deductions, taxAmount, netPay } = body;

        // If staffId is provided, create single payroll record
        if (staffId) {
            if (!period || netPay === undefined) {
                return NextResponse.json({ error: 'Period and netPay are required' }, { status: 400 });
            }

            // Check if record already exists for this staff+period
            const existing = await db.payrollRecord.findFirst({
                where: { staffId, period },
            });

            if (existing) {
                return NextResponse.json({ error: 'Payroll record already exists for this staff member this period. Delete it first or update it.' }, { status: 400 });
            }

            const record = await db.payrollRecord.create({
                data: {
                    staffId,
                    period,
                    basicSalary: parseFloat(basicSalary) || 0,
                    overtimePay: parseFloat(overtimePay) || 0,
                    bonus: parseFloat(bonus) || 0,
                    deductions: parseFloat(deductions) || 0,
                    taxAmount: parseFloat(taxAmount) || 0,
                    netPay: parseFloat(netPay),
                    status: 'pending',
                },
                include: { staff: { include: { user: true } } },
            });

            return NextResponse.json(record, { status: 201 });
        }

        // Otherwise, generate payroll for ALL active staff
        let genPeriod: string;
        if (!period) {
            const now = new Date();
            genPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        } else {
            genPeriod = period;
        }

        const activeStaff = await db.staffProfile.findMany({
            where: { status: 'active' },
        });

        let created = 0;
        let skipped = 0;

        for (const staff of activeStaff) {
            // Check if record exists
            const exists = await db.payrollRecord.findFirst({
                where: { staffId: staff.id, period: genPeriod },
            });

            if (exists) {
                skipped++;
                continue;
            }

            await db.payrollRecord.create({
                data: {
                    staffId: staff.id,
                    period: genPeriod,
                    basicSalary: staff.baseSalary,
                    overtimePay: 0,
                    bonus: 0,
                    deductions: 0,
                    taxAmount: 0,
                    netPay: staff.baseSalary,
                    status: 'pending',
                },
            });

            created++;
        }

        return NextResponse.json({
            message: `Payroll generated: ${created} created, ${skipped} skipped (already exist)`,
            created,
            skipped,
            period: genPeriod,
        }, { status: 201 });
    } catch (error: unknown) {
        console.error('Payroll POST error:', error);
        return NextResponse.json({ error: 'Failed to generate payroll' }, { status: 500 });
    }
}

// ═══════════════ PUT: Update payroll record (process pay) ═══════════════

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
        const { id, status, basicSalary, overtimePay, bonus, deductions, taxAmount, netPay, bulkAction } = body;

        // Bulk action: mark all pending as paid
        if (bulkAction === 'pay_all') {
            const period = (() => {
                const now = new Date();
                return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            })();

            const result = await db.payrollRecord.updateMany({
                where: { period, status: 'pending' },
                data: { status: 'paid', paidAt: new Date(), processedBy: session.user.id },
            });

            return NextResponse.json({
                message: `${result.count} payroll records marked as paid`,
                count: result.count,
            });
        }

        if (!id) {
            return NextResponse.json({ error: 'Payroll ID is required' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (status) {
            updateData.status = status;
            if (status === 'paid') {
                updateData.paidAt = new Date();
                updateData.processedBy = session.user.id;
            }
        }
        if (basicSalary !== undefined) updateData.basicSalary = parseFloat(basicSalary);
        if (overtimePay !== undefined) updateData.overtimePay = parseFloat(overtimePay);
        if (bonus !== undefined) updateData.bonus = parseFloat(bonus);
        if (deductions !== undefined) updateData.deductions = parseFloat(deductions);
        if (taxAmount !== undefined) updateData.taxAmount = parseFloat(taxAmount);
        if (netPay !== undefined) updateData.netPay = parseFloat(netPay);

        const record = await db.payrollRecord.update({
            where: { id },
            data: updateData,
            include: { staff: { include: { user: true } } },
        });

        return NextResponse.json(record);
    } catch (error: unknown) {
        console.error('Payroll PUT error:', error);
        return NextResponse.json({ error: 'Failed to update payroll' }, { status: 500 });
    }
}

// ═══════════════ DELETE: Delete a payroll record ═══════════════

export async function DELETE(request: NextRequest) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await db.session.findFirst({
            where: { token },
        });

        if (!session || session.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'Payroll ID is required' }, { status: 400 });
        }

        await db.payrollRecord.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Payroll DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete payroll record' }, { status: 500 });
    }
}