import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

const DEFAULT_SETTINGS = [
  { key: 'hotel_name', value: 'Royal Loft Hotel', category: 'hotel_profile', label: 'Hotel Name', type: 'text' },
  { key: 'brand_name', value: 'Royal Loft', category: 'hotel_profile', label: 'Brand Name', type: 'text' },
  { key: 'hotel_email', value: 'info@royalloft.com', category: 'hotel_profile', label: 'Email', type: 'text' },
  { key: 'hotel_phone', value: '+234 801 234 5678', category: 'hotel_profile', label: 'Phone', type: 'text' },
  { key: 'hotel_address', value: '15 Victoria Island, Lagos, Nigeria', category: 'hotel_profile', label: 'Address', type: 'text' },
  { key: 'hotel_website', value: '', category: 'hotel_profile', label: 'Website', type: 'text' },
  { key: 'hotel_currency', value: 'NGN', category: 'hotel_profile', label: 'Currency', type: 'select' },
  { key: 'hotel_timezone', value: 'WAT', category: 'hotel_profile', label: 'Timezone', type: 'select' },
  { key: 'hotel_star_rating', value: '4', category: 'hotel_profile', label: 'Star Rating', type: 'number' },
  { key: 'hotel_tax_id', value: '', category: 'hotel_profile', label: 'Tax ID / TIN', type: 'text' },
  { key: 'checkin_time', value: '14:00', category: 'operations', label: 'Default Check-in Time', type: 'text' },
  { key: 'checkout_time', value: '12:00', category: 'operations', label: 'Default Check-out Time', type: 'text' },
  { key: 'late_checkout_fee', value: '5000', category: 'operations', label: 'Late Checkout Fee (NGN/hr)', type: 'number' },
  { key: 'early_checkin_fee', value: '3000', category: 'operations', label: 'Early Check-in Fee (NGN/hr)', type: 'number' },
  { key: 'max_occupancy_default', value: '2', category: 'operations', label: 'Default Max Occupancy', type: 'number' },
  { key: 'extra_guest_fee', value: '2500', category: 'operations', label: 'Extra Guest Fee per Night (NGN)', type: 'number' },
  { key: 'no_show_policy_hours', value: '6', category: 'operations', label: 'No-show Cancellation After (hrs)', type: 'number' },
  { key: 'tax_rate', value: '7.5', category: 'billing', label: 'VAT Tax Rate (%)', type: 'number' },
  { key: 'service_charge_rate', value: '10', category: 'billing', label: 'Service Charge Rate (%)', type: 'number' },
  { key: 'deposit_percentage', value: '50', category: 'billing', label: 'Deposit Required (%)', type: 'number' },
  { key: 'payment_methods', value: 'cash,pos,bank_transfer,opay,palmpay,moniepoint', category: 'billing', label: 'Accepted Payment Methods', type: 'json' },
  { key: 'currency_symbol', value: '\u20A6', category: 'billing', label: 'Currency Symbol', type: 'text' },
  { key: 'invoice_prefix', value: 'RLH', category: 'billing', label: 'Invoice Prefix', type: 'text' },
  { key: 'receipt_footer', value: 'Thank you for choosing Royal Loft Hotel!', category: 'billing', label: 'Receipt Footer Message', type: 'text' },
  { key: 'notif_new_reservation', value: 'true', category: 'notifications', label: 'New Reservation Alerts', type: 'boolean' },
  { key: 'notif_checkin_checkout', value: 'true', category: 'notifications', label: 'Check-in/Check-out Reminders', type: 'boolean' },
  { key: 'notif_payments', value: 'true', category: 'notifications', label: 'Payment Alerts', type: 'boolean' },
  { key: 'notif_low_stock', value: 'true', category: 'notifications', label: 'Low Stock Alerts', type: 'boolean' },
  { key: 'notif_security', value: 'true', category: 'notifications', label: 'Security Alerts', type: 'boolean' },
  { key: 'notif_maintenance', value: 'false', category: 'notifications', label: 'Maintenance Requests', type: 'boolean' },
  { key: 'notif_daily_report', value: 'true', category: 'notifications', label: 'Daily Summary Report', type: 'boolean' },
  { key: 'notif_feedback', value: 'true', category: 'notifications', label: 'Guest Feedback Alerts', type: 'boolean' },
  { key: 'theme', value: 'light', category: 'appearance', label: 'Theme', type: 'select' },
  { key: 'primary_color', value: '#f59e0b', category: 'appearance', label: 'Primary Color', type: 'text' },
  { key: 'sidebar_collapsed', value: 'false', category: 'appearance', label: 'Sidebar Default Collapsed', type: 'boolean' },
];

async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  const session = await db.session.findFirst({
    where: { token },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function GET() {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await db.hotelSetting.findMany();

    if (settings.length === 0) {
      await db.hotelSetting.createMany({ data: DEFAULT_SETTINGS });
      settings = await db.hotelSetting.findMany();
    }

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    const grouped: Record<string, Array<{ key: string; value: string; label: string; type: string }>> = {};
    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push({ key: s.key, value: s.value, label: s.label, type: s.type });
    }

    return NextResponse.json({ settings, map, grouped });
  } catch (error: unknown) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticate();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Array<{ key: string; value: string }> = body.updates;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const results = [];

    for (const { key, value } of updates) {
      if (!key || value === undefined) continue;

      const updated = await db.hotelSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), category: 'hotel_profile', label: key, type: 'text' },
      });

      results.push(updated);
    }

    return NextResponse.json({ success: true, updated: results.length, settings: results });
  } catch (error: unknown) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}