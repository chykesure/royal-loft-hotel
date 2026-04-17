'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Settings, Bell, Palette, Globe, Building, Save } from 'lucide-react';

export function SettingsModule() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building className="h-4 w-4" /> Hotel Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Hotel Name</Label><Input defaultValue="Royal Loft Hotel" /></div>
            <div className="grid gap-2"><Label>Brand Name</Label><Input defaultValue="Royal Loft" /></div>
            <div className="grid gap-2"><Label>Email</Label><Input type="email" defaultValue="info@royalloft.com" /></div>
            <div className="grid gap-2"><Label>Phone</Label><Input defaultValue="+234 801 234 5678" /></div>
          </div>
          <div className="grid gap-2"><Label>Address</Label><Input defaultValue="15 Victoria Island, Lagos, Nigeria" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Currency</Label>
              <Select defaultValue="NGN"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="NGN">Nigerian Naira (₦)</SelectItem><SelectItem value="USD">US Dollar ($)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Timezone</Label>
              <Select defaultValue="WAT"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="WAT">WAT (UTC+1)</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white"><Save className="h-4 w-4 mr-2" />Save Profile</Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notification Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'New reservation alerts', desc: 'Get notified when a new reservation is made', defaultChecked: true },
            { label: 'Check-in/Check-out reminders', desc: 'Daily summary of arrivals and departures', defaultChecked: true },
            { label: 'Payment alerts', desc: 'Notify on new payments and overdue bills', defaultChecked: true },
            { label: 'Low stock alerts', desc: 'Alert when inventory items are below minimum', defaultChecked: true },
            { label: 'Security alerts', desc: 'Failed logins and suspicious activities', defaultChecked: true },
            { label: 'Maintenance requests', desc: 'New and updated maintenance requests', defaultChecked: false },
          ].map((pref, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.desc}</p>
              </div>
              <Switch defaultChecked={pref.defaultChecked} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {['Light', 'Dark', 'System'].map((theme) => (
              <button key={theme} className="p-4 rounded-lg border-2 border-amber-500 bg-white hover:bg-amber-50 transition-colors text-center">
                <div className={`w-full h-12 rounded-md mb-2 ${theme === 'Light' ? 'bg-white border' : theme === 'Dark' ? 'bg-slate-900' : 'bg-gradient-to-r from-white to-slate-900'}`} />
                <span className="text-xs font-medium">{theme}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
