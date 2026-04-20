import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/auth';

export async function GET() {
  try {
    const totalRooms = await db.room.count();

    const occupiedRooms = await db.room.count({ where: { status: 'occupied' } });
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Revenue from bills paid today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayPayments = await db.payment.findMany({
      where: { createdAt: { gte: today, lte: todayEnd } },
    });
    const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    const activeReservations = await db.reservation.count({
      where: { status: { in: ['confirmed', 'checked_in'] } },
    });

    const checkInsToday = await db.reservation.count({
      where: {
        checkIn: { gte: today, lte: todayEnd },
        status: { in: ['checked_in', 'confirmed'] },
      },
    });

    const checkOutsToday = await db.reservation.count({
      where: {
        checkOut: { gte: today, lte: todayEnd },
      },
    });

    // Overdue checkouts: checked_in guests whose checkout date has passed
    const overdueCheckouts = await db.reservation.findMany({
      where: {
        status: 'checked_in',
        checkOut: { lt: today },
      },
      include: {
        guest: { select: { firstName: true, lastName: true, phone: true } },
        room: { select: { roomNumber: true } },
      },
      orderBy: { checkOut: 'asc' },
    });

    // Room status counts

    // Room status counts
    const available = await db.room.count({ where: { status: 'available' } });
    const housekeeping = await db.room.count({ where: { status: 'housekeeping' } });
    const maintenance = await db.room.count({ where: { status: 'maintenance' } });
    const reserved = await db.room.count({ where: { status: 'reserved' } });

    // Revenue chart - last 7 days
    const revenueData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayPayments = await db.payment.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
      });
      const dayRevenue = dayPayments.reduce((sum, p) => sum + p.amount, 0);

      revenueData.push({
        date: formatDate(dayStart),
        revenue: dayRevenue,
      });
    }

    // Recent reservations
    const recentReservations = await db.reservation.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        guest: { select: { firstName: true, lastName: true, phone: true } },
        room: { select: { roomNumber: true, roomType: { select: { name: true } } } },
      },
    });

    // Today's arrivals
    const arrivals = await db.reservation.findMany({
      where: {
        checkIn: { gte: today, lte: todayEnd },
        status: { in: ['confirmed', 'checked_in'] },
      },
      include: {
        guest: { select: { firstName: true, lastName: true, phone: true } },
        room: { select: { roomNumber: true } },
      },
      orderBy: { checkIn: 'asc' },
    });

    // Today's departures
    const departures = await db.reservation.findMany({
      where: {
        checkOut: { gte: today, lte: todayEnd },
        status: { in: ['checked_in', 'checked_out'] },
      },
      include: {
        guest: { select: { firstName: true, lastName: true, phone: true } },
        room: { select: { roomNumber: true } },
      },
      orderBy: { checkOut: 'asc' },
    });

    // ===== SYSTEM OVERVIEW (Super Admin) =====
    const totalUsers = await db.user.count({ where: { isActive: true } });
    const totalRoomTypes = await db.roomType.count();
    const totalGuests = await db.guest.count();
    const totalReservations = await db.reservation.count();
    const totalStaffMembers = await db.staffProfile.count({ where: { status: 'active' } });

    // Recent audit logs (last 5)
    const recentAuditLogs = await db.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        module: true,
        status: true,
        userName: true,
        createdAt: true,
        details: true,
      },
    });

    // Unresolved security alerts (last 3)
    const unresolvedAlerts = await db.securityAlert.findMany({
      take: 3,
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        severity: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    // Users by role
    const usersByRoleRaw = await db.user.groupBy({
      by: ['role'],
      where: { isActive: true },
      _count: { role: true },
    });
    const usersByRole = usersByRoleRaw.map((item) => ({
      role: item.role,
      count: item._count.role,
    }));

    // Revenue this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthPayments = await db.payment.findMany({
      where: { createdAt: { gte: monthStart, lte: todayEnd } },
    });
    const revenueThisMonth = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    // New guests this month
    const newGuestsThisMonth = await db.guest.count({
      where: { createdAt: { gte: monthStart, lte: todayEnd } },
    });

    // Average occupancy this month
    let monthOccupancySum = 0;
    let monthDaysCounted = 0;
    for (let i = 0; i < today.getDate(); i++) {
      const dayStart = new Date(today.getFullYear(), today.getMonth(), i + 1);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOccupied = await db.reservation.count({
        where: {
          checkIn: { lte: dayEnd },
          checkOut: { gt: dayStart },
          status: { in: ['confirmed', 'checked_in'] },
        },
      });

      monthOccupancySum += totalRooms > 0 ? Math.round((dayOccupied / totalRooms) * 100) : 0;
      monthDaysCounted++;
    }
    const avgOccupancyThisMonth = monthDaysCounted > 0 ? Math.round(monthOccupancySum / monthDaysCounted) : 0;

    return NextResponse.json({
      stats: {
        totalRooms,
        occupancyRate,
        todayRevenue,
        todayRevenueFormatted: formatCurrency(todayRevenue),
        activeReservations,
        checkInsToday,
        checkOutsToday,
        overdueCheckouts: overdueCheckouts.length,
      },
      roomStatus: {
        available,
        occupied: occupiedRooms,
        housekeeping,
        maintenance,
        reserved,
      },
      revenueData,
      recentReservations,
      arrivals,
      departures,
      systemOverview: {
        totalUsers,
        totalRooms,
        totalRoomTypes,
        totalGuests,
        totalReservations,
        totalStaffMembers,
        recentAuditLogs,
        unresolvedAlerts,
        usersByRole,
        revenueThisMonth,
        newGuestsThisMonth,
        avgOccupancyThisMonth,
      },
    });
  } catch (error: unknown) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
