import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guest = searchParams.get('guest');
    const status = searchParams.get('status');
    const id = searchParams.get('id');

    if (id) {
      const invoice = await db.invoice.findUnique({ where: { id } });
      if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      return NextResponse.json(invoice);
    }

    const where: Record<string, unknown> = {};
    if (guest) where.guestName = { contains: guest };
    if (status && status !== 'all') where.status = status;

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
    });

    return NextResponse.json(invoices);
  } catch (error: unknown) {
    console.error('Invoices GET error:', error);
    return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billId, notes, dueDays } = body;

    if (!billId) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    const bill = await db.bill.findUnique({
      where: { id: billId },
      include: {
        guest: true,
        reservation: {
          include: { room: { include: { roomType: true } } },
        },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const existingInvoice = await db.invoice.findFirst({ where: { billId } });
    if (existingInvoice) {
      return NextResponse.json({ error: 'Invoice already exists for this bill', invoice: existingInvoice }, { status: 409 });
    }

    const settings = await db.hotelSetting.findMany();
    const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || '';
    const getNumSetting = (key: string, fallback: number) => {
      const val = getSetting(key);
      return val ? parseFloat(val) : fallback;
    };

    const hotelName = getSetting('hotel_name') || 'Royal Loft Hotel';
    const hotelAddress = getSetting('address') || '';
    const hotelPhone = getSetting('phone') || '';
    const hotelEmail = getSetting('email') || '';
    const hotelWebsite = getSetting('website') || '';
    const taxRate = getNumSetting('tax_rate', 7.5);

    let nights = 1;
    if (bill.reservation?.checkIn && bill.reservation?.checkOut) {
      const diffMs = new Date(bill.reservation.checkOut).getTime() - new Date(bill.reservation.checkIn).getTime();
      nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    const addressParts: string[] = [];
    if (bill.guest.address) addressParts.push(bill.guest.address);
    if (bill.guest.city) addressParts.push(bill.guest.city);
    if (bill.guest.state) addressParts.push(bill.guest.state);
    if (bill.guest.country) addressParts.push(bill.guest.country);
    const guestAddress = addressParts.filter(Boolean).join(', ');

    const subtotal = bill.roomCharges + bill.foodCharges + bill.barCharges + bill.spaCharges + bill.laundryCharges + bill.otherCharges;

    const lastPayment = bill.payments.length > 0 ? bill.payments[0] : null;

    const count = await db.invoice.count();
    const invoiceNumber = `RLH-INV-${String(count + 1).padStart(4, '0')}`;

    const dueAt = dueDays
      ? new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let invoiceStatus = 'sent';
    if (bill.balanceAmount <= 0) invoiceStatus = 'paid';

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        billId,
        reservationId: bill.reservationId,
        guestId: bill.guestId,
        guestName: `${bill.guest.firstName} ${bill.guest.lastName}`,
        guestPhone: bill.guest.phone,
        guestEmail: bill.guest.email,
        guestAddress,
        hotelName,
        hotelAddress,
        hotelPhone,
        hotelEmail,
        hotelWebsite,
        confirmationCode: bill.reservation?.confirmationCode || null,
        roomNumber: bill.reservation?.room?.roomNumber || null,
        roomType: bill.reservation?.room?.roomType?.name || null,
        checkIn: bill.reservation?.checkIn || null,
        checkOut: bill.reservation?.checkOut || null,
        nights,
        roomRate: bill.reservation?.roomRate || 0,
        roomCharges: bill.roomCharges,
        foodCharges: bill.foodCharges,
        barCharges: bill.barCharges,
        spaCharges: bill.spaCharges,
        laundryCharges: bill.laundryCharges,
        otherCharges: bill.otherCharges,
        subtotal,
        taxRate,
        taxAmount: bill.taxAmount,
        discountAmount: bill.discountAmount,
        totalAmount: bill.totalAmount,
        paidAmount: bill.paidAmount,
        balanceAmount: bill.balanceAmount,
        paymentMethod: bill.paymentMethod || lastPayment?.paymentMethod || null,
        paymentRef: bill.paymentRef || lastPayment?.paymentRef || null,
        status: invoiceStatus,
        notes: notes || '',
        issuedAt: new Date(),
        dueAt,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: unknown) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const invoice = await db.invoice.update({
      where: { id },
      data,
    });

    return NextResponse.json(invoice);
  } catch (error: unknown) {
    console.error('Update invoice error:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    await db.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete invoice error:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}