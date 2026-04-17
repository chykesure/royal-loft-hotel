'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Settings, Bell, Building, Save, Loader2, Database, Users, BedDouble, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';

interface HotelSettings {
  hotelName: string;
  hotelShortName: string;
  email: string;
  phone: string;
  address: string;
}

interface SystemInfo {
  totalGuests: number;
  totalReservations: number;
  totalRooms: number;
  activePolicies: number;
  activeStaff: number;
}

export function SettingsModule() {
  const [settings, setSettings] = useState<HotelSettings>({
    hotelName: '',
    hotelShortName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    totalGuests: 0,
    totalReservations: 0,
    totalRooms: 0,
    activePolicies: 0,
    activeStaff: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences (UI only)
  const [notifications, setNotifications] = useState({
    newReservations: true,
    checkInOut: true,
    payments: true,
    lowStock: true,
    security: true,
    maintenance: false,
  });

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
        setSystemInfo(data.systemInfo || {});
      } else {
        toast.error('Failed to load settings');
      }
    } catch {
      toast.error('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success('Settings saved successfully');
        fetchSettings();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof HotelSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage hotel configuration</p>
        </div>
      </div>

      {/* Hotel Profile Section */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4" /> Hotel Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Hotel Name</Label>
              <Input
                placeholder="e.g. Royal Loft Hotel"
                value={settings.hotelName}
                onChange={(e) => updateField('hotelName', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Short Name</Label>
              <Input
                placeholder="e.g. Royal Loft"
                value={settings.hotelShortName}
                onChange={(e) => updateField('hotelShortName', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="info@hotel.com"
                value={settings.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                placeholder="+234 801 234 5678"
                value={settings.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Input
              placeholder="Full hotel address"
              value={settings.address}
              onChange={(e) => updateField('address', e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 text-white">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences Section */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'newReservations' as const, label: 'New reservation alerts', desc: 'Get notified when a new reservation is made' },
            { key: 'checkInOut' as const, label: 'Check-in/Check-out reminders', desc: 'Daily summary of arrivals and departures' },
            { key: 'payments' as const, label: 'Payment alerts', desc: 'Notify on new payments and overdue bills' },
            { key: 'lowStock' as const, label: 'Low stock alerts', desc: 'Alert when inventory items are below minimum' },
            { key: 'security' as const, label: 'Security alerts', desc: 'Failed logins and suspicious activities' },
            { key: 'maintenance' as const, label: 'Maintenance requests', desc: 'New and updated maintenance requests' },
          ].map((pref) => (
            <div key={pref.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.desc}</p>
              </div>
              <Switch
                checked={notifications[pref.key]}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, [pref.key]: checked }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* System Information Section */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <Users className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-xs text-muted-foreground">Total Guests</p>
              <p className="text-lg font-bold">{systemInfo.totalGuests}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <ClipboardList className="h-5 w-5 mx-auto text-sky-500 mb-1" />
              <p className="text-xs text-muted-foreground">Reservations</p>
              <p className="text-lg font-bold">{systemInfo.totalReservations}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <BedDouble className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <p className="text-xs text-muted-foreground">Total Rooms</p>
              <p className="text-lg font-bold">{systemInfo.totalRooms}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <Settings className="h-5 w-5 mx-auto text-purple-500 mb-1" />
              <p className="text-xs text-muted-foreground">Active Policies</p>
              <p className="text-lg font-bold">{systemInfo.activePolicies}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <Users className="h-5 w-5 mx-auto text-orange-500 mb-1" />
              <p className="text-xs text-muted-foreground">Active Staff</p>
              <p className="text-lg font-bold">{systemInfo.activeStaff}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
