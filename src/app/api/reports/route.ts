import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || 'daily-sales';
    const from = searchParams.get('from') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0];

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to + 'T23:59:59');

    if (type === 'daily-sales') {
      return handleDailySales(fromDate, toDate);
    } else if (type === 'journal') {
      return handleJournal(fromDate, toDate);
    } else if (type === 'occupancy') {
      return handleOccupancy(fromDate, toDate);
    } else if (type === 'revenue-source') {
      return handleRevenueSource(fromDate, toDate);
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

async function handleDailySales(fromDate: Date, toDate: Date) {
  const bills = await db.bill.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
    },
    include: {
      guest: { select: { firstName: true, lastName: true } },
      payments: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const grouped: Record<string, {
    date: string;
    roomCharges: number;
    foodCharges: number;
    barCharges: number;
    spaCharges: number;
    laundryCharges: number;
    otherCharges: number;
    totalAmount: number;
    payments: number;
  }> = {};

  // Fill all dates in range
  const current = new Date(fromDate);
  while (current <= toDate) {
    const dateKey = current.toISOString().split('T')[0];
    grouped[dateKey] = {
      date: dateKey,
      roomCharges: 0,
      foodCharges: 0,
      barCharges: 0,
      spaCharges: 0,
      laundryCharges: 0,
      otherCharges: 0,
      totalAmount: 0,
      payments: 0,
    };
    current.setDate(current.getDate() + 1);
  }

  for (const bill of bills) {
    const date = bill.createdAt.toISOString().split('T')[0];
    if (!grouped[date]) {
      grouped[date] = {
        date,
        roomCharges: 0,
        foodCharges: 0,
        barCharges: 0,
        spaCharges: 0,
        laundryCharges: 0,
        otherCharges: 0,
        totalAmount: 0,
        payments: 0,
      };
    }
    grouped[date].roomCharges += bill.roomCharges;
    grouped[date].foodCharges += bill.foodCharges;
    grouped[date].barCharges += bill.barCharges;
    grouped[date].spaCharges += bill.spaCharges;
    grouped[date].laundryCharges += bill.laundryCharges;
    grouped[date].otherCharges += bill.otherCharges;
    grouped[date].totalAmount += bill.totalAmount;
    grouped[date].payments += bill.paidAmount;
  }

  const result = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(result);
}

async function handleJournal(fromDate: Date, toDate: Date) {
  const bills = await db.bill.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
    },
    include: {
      guest: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const payments = await db.payment.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
    },
    include: {
      bill: {
        include: {
          guest: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const entries: Array<{
    date: string;
    dateFormatted: string;
    description: string;
    account: string;
    debit: number;
    credit: number;
    balance: number;
  }> = [];

  let runningBalance = 0;

  // Create a merged timeline
  interface TimelineItem {
    date: Date;
    description: string;
    account: string;
    debit: number;
    credit: number;
  }

  const timeline: TimelineItem[] = [];

  for (const bill of bills) {
    const guestName = bill.guest ? `${bill.guest.firstName} ${bill.guest.lastName}` : 'Unknown Guest';
    const charges = bill.roomCharges + bill.foodCharges + bill.barCharges + bill.spaCharges + bill.laundryCharges + bill.otherCharges;
    if (charges > 0) {
      timeline.push({
        date: bill.createdAt,
        description: `Bill - Room: ${bill.roomCharges.toFixed(2)}, Food: ${bill.foodCharges.toFixed(2)}, Bar: ${bill.barCharges.toFixed(2)}, Spa: ${bill.spaCharges.toFixed(2)}`,
        account: guestName,
        debit: charges,
        credit: 0,
      });
    }
  }

  for (const payment of payments) {
    const guestName = payment.bill?.guest ? `${payment.bill.guest.firstName} ${payment.bill.guest.lastName}` : 'Unknown Guest';
    timeline.push({
      date: payment.createdAt,
      description: `Payment via ${payment.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}${payment.notes ? ` - ${payment.notes}` : ''}`,
      account: guestName,
      debit: 0,
      credit: payment.amount,
    });
  }

  timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const item of timeline) {
    runningBalance += item.debit - item.credit;
    entries.push({
      date: item.date.toISOString().split('T')[0],
      dateFormatted: formatDate(item.date),
      description: item.description,
      account: item.account,
      debit: Math.round(item.debit * 100) / 100,
      credit: Math.round(item.credit * 100) / 100,
      balance: Math.round(runningBalance * 100) / 100,
    });
  }

  return NextResponse.json(entries);
}

async function handleOccupancy(fromDate: Date, toDate: Date) {
  const totalRooms = await db.room.count({ where: { status: { not: 'out_of_service' } } });

  const result: Array<{
    date: string;
    dateFormatted: string;
    totalRooms: number;
    available: number;
    occupied: number;
    occupancyRate: number;
    revenue: number;
    revPAR: number;
  }> = [];

  const reservations = await db.reservation.findMany({
    where: {
      OR: [
        { checkIn: { lte: toDate }, checkOut: { gte: fromDate } },
      ],
      status: { in: ['confirmed', 'checked_in'] },
    },
    select: {
      checkIn: true,
      checkOut: true,
      totalAmount: true,
      roomRate: true,
    },
  });

  const bills = await db.bill.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
    },
    select: {
      createdAt: true,
      totalAmount: true,
    },
  });

  // Group bill revenue by date
  const revenueByDate: Record<string, number> = {};
  for (const bill of bills) {
    const dateKey = bill.createdAt.toISOString().split('T')[0];
    revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + bill.totalAmount;
  }

  const current = new Date(fromDate);
  while (current <= toDate) {
    const dateKey = current.toISOString().split('T')[0];

    // Count rooms occupied on this day
    let occupied = 0;
    for (const res of reservations) {
      const checkIn = new Date(res.checkIn);
      const checkOut = new Date(res.checkOut);
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      // Guest is in-house if checkIn <= this day < checkOut
      if (checkIn <= dayStart && dayStart < checkOut) {
        occupied++;
      }
    }

    const available = Math.max(0, totalRooms - occupied);
    const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;
    const dayRevenue = revenueByDate[dateKey] || 0;
    const revPAR = totalRooms > 0 ? Math.round(dayRevenue / totalRooms) : 0;

    result.push({
      date: dateKey,
      dateFormatted: formatDate(current),
      totalRooms,
      available,
      occupied,
      occupancyRate,
      revenue: Math.round(dayRevenue * 100) / 100,
      revPAR,
    });

    current.setDate(current.getDate() + 1);
  }

  return NextResponse.json(result);
}

async function handleRevenueSource(fromDate: Date, toDate: Date) {
  const reservations = await db.reservation.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
    },
    select: {
      source: true,
      totalAmount: true,
      roomRate: true,
    },
  });

  const sourceMap: Record<string, { bookings: number; revenue: number; totalRate: number }> = {
    walk_in: { bookings: 0, revenue: 0, totalRate: 0 },
    website: { bookings: 0, revenue: 0, totalRate: 0 },
    phone: { bookings: 0, revenue: 0, totalRate: 0 },
    whatsapp: { bookings: 0, revenue: 0, totalRate: 0 },
    ota_booking: { bookings: 0, revenue: 0, totalRate: 0 },
    ota_jumia: { bookings: 0, revenue: 0, totalRate: 0 },
    ota_hotels: { bookings: 0, revenue: 0, totalRate: 0 },
  };

  for (const res of reservations) {
    const source = res.source || 'walk_in';
    if (!sourceMap[source]) {
      sourceMap[source] = { bookings: 0, revenue: 0, totalRate: 0 };
    }
    sourceMap[source].bookings++;
    sourceMap[source].revenue += res.totalAmount;
    sourceMap[source].totalRate += res.roomRate;
  }

  const sourceLabels: Record<string, string> = {
    walk_in: 'Walk-in',
    website: 'Website',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    ota_booking: 'OTA Booking',
    ota_jumia: 'Jumia',
    ota_hotels: 'Hotels.com',
  };

  const result = Object.entries(sourceMap)
    .filter(([, data]) => data.bookings > 0)
    .map(([source, data]) => ({
      source: sourceLabels[source] || source,
      sourceKey: source,
      bookings: data.bookings,
      revenue: Math.round(data.revenue * 100) / 100,
      averageRate: data.bookings > 0 ? Math.round((data.totalRate / data.bookings) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json(result);
}
