'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Building, Bell, Palette, Clock, CreditCard, Save, RefreshCw, Check, Settings,
  Info,
} from 'lucide-react';

interface SettingsMap {
  [key: string]: string;
}

export function SettingsModule() {
  const [map, setMap] = useState<SettingsMap>({});
  const [originalMap, setOriginalMap] = useState<SettingsMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyCategories, setDirtyCategories] = useState<Set<string>>(new Set());

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setMap(data.map);
        setOriginalMap(data.map);
        setDirtyCategories(new Set());
      } else {
        toast.error('Failed to load settings');
      }
    } catch {
      toast.error('Network error loading settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const get = (key: string, fallback = ''): string => map[key] ?? fallback;

  const set = (key: string, value: string, category: string) => {
    setMap((prev) => ({ ...prev, [key]: value }));
    if (originalMap[key] !== value) {
      setDirtyCategories((prev) => new Set(prev).add(category));
    } else {
      setDirtyCategories((prev) => {
        const next = new Set(prev);
        next.delete(category);
        return next;
      });
    }
  };

  const isDirty = (category: string) => dirtyCategories.has(category);

  const saveCategory = async (category: string) => {
    const categoryKeys = CATEGORY_KEY_MAP[category];
    if (!categoryKeys) return;

    const updates = categoryKeys
      .filter((key) => map[key] !== undefined && originalMap[key] !== map[key])
      .map((key) => ({ key, value: map[key] }));

    if (updates.length === 0) { toast.info('No changes to save'); return; }

    try {
      setIsSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.updated} setting${data.updated !== 1 ? 's' : ''} saved`);
        setOriginalMap({ ...map });
        setDirtyCategories((prev) => { const next = new Set(prev); next.delete(category); return next; });
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Network error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const saveAll = async () => {
    const allKeys = Object.keys(CATEGORY_KEY_MAP).flatMap((cat) => CATEGORY_KEY_MAP[cat]);
    const updates = allKeys
      .filter((key) => map[key] !== undefined && originalMap[key] !== map[key])
      .map((key) => ({ key, value: map[key] }));

    if (updates.length === 0) { toast.info('No changes to save'); return; }

    try {
      setIsSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`All ${data.updated} settings saved`);
        setOriginalMap({ ...map });
        setDirtyCategories(new Set());
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Network error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const CATEGORY_KEY_MAP: Record<string, string[]> = {
    hotel_profile: ['hotel_name', 'brand_name', 'hotel_email', 'hotel_phone', 'hotel_address', 'hotel_website', 'hotel_currency', 'hotel_timezone', 'hotel_star_rating', 'hotel_tax_id'],
    operations: ['checkin_time', 'checkout_time', 'late_checkout_fee', 'early_checkin_fee', 'max_occupancy_default', 'extra_guest_fee', 'no_show_policy_hours'],
    billing: ['tax_rate', 'service_charge_rate', 'deposit_percentage', 'payment_methods', 'currency_symbol', 'invoice_prefix', 'receipt_footer'],
    notifications: ['notif_new_reservation', 'notif_checkin_checkout', 'notif_payments', 'notif_low_stock', 'notif_security', 'notif_maintenance', 'notif_daily_report', 'notif_feedback'],
    appearance: ['theme', 'primary_color', 'sidebar_collapsed'],
  };

  const totalChanges = Object.keys(CATEGORY_KEY_MAP).reduce((count, cat) => {
    return count + CATEGORY_KEY_MAP[cat].filter((key) => map[key] !== undefined && originalMap[key] !== map[key]).length;
  }, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-full" /></div>
                  <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-full" /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2.5">
            <Settings className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-xs text-muted-foreground">Configure your hotel management system</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalChanges > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
              {totalChanges} change{totalChanges !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button size="sm" variant="ghost" onClick={fetchSettings} disabled={isSaving}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={totalChanges === 0 || isSaving} onClick={saveAll}>
            {isSaving ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save All
          </Button>
        </div>
      </div>

      {/* 1. HOTEL PROFILE */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4 text-amber-500" /> Hotel Profile
          </CardTitle>
          {isDirty('hotel_profile') && (
            <Button size="sm" variant="outline" className="h-7 text-xs bg-amber-50 text-amber-700 border-amber-200" onClick={() => saveCategory('hotel_profile')}>
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Hotel Name</Label><Input value={get('hotel_name')} onChange={(e) => set('hotel_name', e.target.value, 'hotel_profile')} /></div>
            <div className="grid gap-2"><Label>Brand Name</Label><Input value={get('brand_name')} onChange={(e) => set('brand_name', e.target.value, 'hotel_profile')} /></div>
            <div className="grid gap-2"><Label>Email</Label><Input type="email" value={get('hotel_email')} onChange={(e) => set('hotel_email', e.target.value, 'hotel_profile')} /></div>
            <div className="grid gap-2"><Label>Phone</Label><Input value={get('hotel_phone')} onChange={(e) => set('hotel_phone', e.target.value, 'hotel_profile')} /></div>
          </div>
          <div className="grid gap-2"><Label>Address</Label><Input value={get('hotel_address')} onChange={(e) => set('hotel_address', e.target.value, 'hotel_profile')} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Website</Label><Input placeholder="https://..." value={get('hotel_website')} onChange={(e) => set('hotel_website', e.target.value, 'hotel_profile')} /></div>
            <div className="grid gap-2"><Label>Tax ID / TIN</Label><Input value={get('hotel_tax_id')} onChange={(e) => set('hotel_tax_id', e.target.value, 'hotel_profile')} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2"><Label>Currency</Label>
              <Select value={get('hotel_currency', 'NGN')} onValueChange={(v) => set('hotel_currency', v, 'hotel_profile')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">Nigerian Naira</SelectItem>
                  <SelectItem value="USD">US Dollar ($)</SelectItem>
                  <SelectItem value="GBP">British Pound</SelectItem>
                  <SelectItem value="EUR">Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Timezone</Label>
              <Select value={get('hotel_timezone', 'WAT')} onValueChange={(v) => set('hotel_timezone', v, 'hotel_profile')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAT">WAT (UTC+1)</SelectItem>
                  <SelectItem value="GMT">GMT (UTC+0)</SelectItem>
                  <SelectItem value="CAT">CAT (UTC+2)</SelectItem>
                  <SelectItem value="EAT">EAT (UTC+3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Star Rating</Label>
              <Select value={get('hotel_star_rating', '4')} onValueChange={(v) => set('hotel_star_rating', v, 'hotel_profile')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5].map((s) => <SelectItem key={s} value={String(s)}>{s} Star{s > 1 ? 's' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. OPERATIONS */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" /> Operations
          </CardTitle>
          {isDirty('operations') && (
            <Button size="sm" variant="outline" className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200" onClick={() => saveCategory('operations')}>
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Default Check-in Time</Label><Input type="time" value={get('checkin_time', '14:00')} onChange={(e) => set('checkin_time', e.target.value, 'operations')} /></div>
            <div className="grid gap-2"><Label>Default Check-out Time</Label><Input type="time" value={get('checkout_time', '12:00')} onChange={(e) => set('checkout_time', e.target.value, 'operations')} /></div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Fees & Policies</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Late Checkout Fee (&#8358;/hr)</Label><Input type="number" value={get('late_checkout_fee', '5000')} onChange={(e) => set('late_checkout_fee', e.target.value, 'operations')} /></div>
            <div className="grid gap-2"><Label>Early Check-in Fee (&#8358;/hr)</Label><Input type="number" value={get('early_checkin_fee', '3000')} onChange={(e) => set('early_checkin_fee', e.target.value, 'operations')} /></div>
            <div className="grid gap-2"><Label>Extra Guest Fee / Night (&#8358;)</Label><Input type="number" value={get('extra_guest_fee', '2500')} onChange={(e) => set('extra_guest_fee', e.target.value, 'operations')} /></div>
            <div className="grid gap-2"><Label>No-show Cancel After (hrs)</Label><Input type="number" value={get('no_show_policy_hours', '6')} onChange={(e) => set('no_show_policy_hours', e.target.value, 'operations')} /></div>
            <div className="grid gap-2"><Label>Default Max Occupancy</Label><Input type="number" value={get('max_occupancy_default', '2')} onChange={(e) => set('max_occupancy_default', e.target.value, 'operations')} /></div>
          </div>
        </CardContent>
      </Card>

      {/* 3. BILLING & TAX */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-500" /> Billing & Tax
          </CardTitle>
          {isDirty('billing') && (
            <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-200" onClick={() => saveCategory('billing')}>
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>VAT Tax Rate (%)</Label><Input type="number" step="0.1" value={get('tax_rate', '7.5')} onChange={(e) => set('tax_rate', e.target.value, 'billing')} /></div>
            <div className="grid gap-2"><Label>Service Charge Rate (%)</Label><Input type="number" step="0.1" value={get('service_charge_rate', '10')} onChange={(e) => set('service_charge_rate', e.target.value, 'billing')} /></div>
            <div className="grid gap-2"><Label>Deposit Required (%)</Label><Input type="number" value={get('deposit_percentage', '50')} onChange={(e) => set('deposit_percentage', e.target.value, 'billing')} /></div>
            <div className="grid gap-2"><Label>Invoice Prefix</Label><Input value={get('invoice_prefix', 'RLH')} onChange={(e) => set('invoice_prefix', e.target.value, 'billing')} /></div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Payment Methods</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['Cash', 'POS', 'Bank Transfer', 'OPay', 'PalmPay', 'Moniepoint'].map((method) => {
  const currentMethods = get('payment_methods', 'cash,pos,bank_transfer,opay,palmpay,moniepoint').split(',');
  const isOn = currentMethods.includes(method.toLowerCase().replace(' ', '_'));
  const toggle = () => {
    const methods = isOn
      ? currentMethods.filter((m) => m !== method.toLowerCase().replace(' ', '_'))
      : [...currentMethods, method.toLowerCase().replace(' ', '_')];
    set('payment_methods', methods.join(','), 'billing');
  };
  return (
    <button key={method} onClick={toggle} className={`p-3 rounded-lg border text-center text-xs font-medium transition-all ${isOn ? 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'border-muted bg-muted/30 text-muted-foreground hover:bg-muted/60'}`}>
      {method}
      {isOn && <Check className="h-3 w-3 mx-auto mt-1 text-emerald-500" />}
    </button>
  );
})}
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label>Receipt Footer Message</Label>
            <Input value={get('receipt_footer')} onChange={(e) => set('receipt_footer', e.target.value, 'billing')} />
            <p className="text-[11px] text-muted-foreground">This message appears at the bottom of all printed receipts</p>
          </div>
        </CardContent>
      </Card>

      {/* 4. NOTIFICATION PREFERENCES */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-violet-500" /> Notification Preferences
          </CardTitle>
          {isDirty('notifications') && (
            <Button size="sm" variant="outline" className="h-7 text-xs bg-violet-50 text-violet-700 border-violet-200" onClick={() => saveCategory('notifications')}>
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { key: 'notif_new_reservation', label: 'New Reservation Alerts', desc: 'Get notified when a new reservation is made' },
            { key: 'notif_checkin_checkout', label: 'Check-in / Check-out Reminders', desc: 'Daily summary of arrivals and departures' },
            { key: 'notif_payments', label: 'Payment Alerts', desc: 'Notify on new payments and overdue bills' },
            { key: 'notif_low_stock', label: 'Low Stock Alerts', desc: 'Alert when inventory items are below minimum' },
            { key: 'notif_security', label: 'Security Alerts', desc: 'Failed logins and suspicious activities' },
            { key: 'notif_maintenance', label: 'Maintenance Requests', desc: 'New and updated maintenance requests' },
            { key: 'notif_daily_report', label: 'Daily Summary Report', desc: 'End-of-day occupancy and revenue summary' },
            { key: 'notif_feedback', label: 'Guest Feedback Alerts', desc: 'New ratings and reviews from guests' },
          ].map((pref) => (
            <div key={pref.key} className="flex items-center justify-between py-3">
              <div className="pr-4">
                <p className="text-sm font-medium">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.desc}</p>
              </div>
              <Switch checked={get(pref.key, 'true') === 'true'} onCheckedChange={(v) => set(pref.key, v ? 'true' : 'false', 'notifications')} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 5. APPEARANCE */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-pink-500" /> Appearance
          </CardTitle>
          {isDirty('appearance') && (
            <Button size="sm" variant="outline" className="h-7 text-xs bg-pink-50 text-pink-700 border-pink-200" onClick={() => saveCategory('appearance')}>
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="mb-3 block">Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Light', bg: 'bg-white border' },
                { value: 'dark', label: 'Dark', bg: 'bg-slate-900' },
                { value: 'system', label: 'System', bg: 'bg-gradient-to-r from-white to-slate-900' },
              ].map((theme) => (
                <button key={theme.value} onClick={() => set('theme', theme.value, 'appearance')} className={`p-4 rounded-lg border-2 transition-all text-center ${get('theme', 'light') === theme.value ? 'border-amber-500 bg-amber-50/50 hover:bg-amber-50' : 'border-muted hover:border-muted-foreground/30 bg-white'}`}>
                  <div className={`w-full h-12 rounded-md mb-2 ${theme.bg}`} />
                  <span className="text-xs font-medium">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Primary Brand Color</Label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border shadow-inner" style={{ backgroundColor: get('primary_color', '#f59e0b') }} />
              <Input className="max-w-[200px]" value={get('primary_color', '#f59e0b')} onChange={(e) => set('primary_color', e.target.value, 'appearance')} placeholder="#f59e0b" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sidebar Default Collapsed</p>
              <p className="text-xs text-muted-foreground">Start with the sidebar collapsed on load</p>
            </div>
            <Switch checked={get('sidebar_collapsed', 'false') === 'true'} onCheckedChange={(v) => set('sidebar_collapsed', v ? 'true' : 'false', 'appearance')} />
          </div>
        </CardContent>
      </Card>

      {/* Sticky bottom save bar */}
      {totalChanges > 0 && (
        <div className="sticky bottom-0 bg-white/80 backdrop-blur border-t rounded-lg p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>{totalChanges} unsaved change{totalChanges !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fetchSettings} disabled={isSaving}>Discard</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" size="sm" onClick={saveAll} disabled={isSaving}>
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save All Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}