'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Code2, Database, Trash2, RefreshCw, AlertTriangle, ShieldCheck,
  HardDrive, Users, BedDouble, CalendarDays, Receipt, Package, FileText,
  CheckCircle, RotateCcw, Eye, TrendingDown, Download, Upload, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface DbStats {
  users: number; rooms: number; roomTypes: number; guests: number;
  reservations: number; bills: number; payments: number;
  housekeepingTasks: number; maintenanceRequests: number;
  inventoryItems: number; stockMovements: number; hotelPolicies: number;
  expenses: number; cloudFiles: number; notifications: number;
  auditLogs: number; securityAlerts: number; guestFeedbacks: number;
  roles: number; permissions: number; sessions: number;
}

const resetOptions = [
  { key: 'reservations', label: 'Reservations', description: 'All reservations and associated bills/payments' },
  { key: 'guests', label: 'Guests', description: 'All guest profiles and their data' },
  { key: 'billing', label: 'Billing & Payments', description: 'All bills and payment records' },
  { key: 'housekeeping', label: 'Housekeeping Tasks', description: 'All housekeeping tasks' },
  { key: 'maintenance', label: 'Maintenance Requests', description: 'All maintenance requests' },
  { key: 'inventory', label: 'Inventory & Stock', description: 'All inventory items and stock movements' },
  { key: 'rooms', label: 'Rooms & IoT', description: 'All rooms, IoT devices, linked reservations and tasks' },
  { key: 'expenses', label: 'Expenses', description: 'All expense records' },
  { key: 'feedbacks', label: 'Guest Feedbacks', description: 'All guest feedback entries' },
  { key: 'policies', label: 'Hotel Policies', description: 'All hotel policy rules' },
  { key: 'notifications', label: 'Notifications', description: 'All notification records' },
  { key: 'audit-logs', label: 'Audit Logs', description: 'All audit log entries' },
  { key: 'security-alerts', label: 'Security Alerts', description: 'All security alert records' },
  { key: 'roles-permissions', label: 'Roles & Permissions', description: 'All custom roles and permission settings' },
];

export function DeveloperToolsModule() {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resetKey, setResetKey] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/developer-tools');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleReset = async () => {
    if (resetKey !== 'RESET') {
      toast.error('Please type RESET to confirm');
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/developer-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: selectedSection }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setShowConfirm(false);
        setResetKey('');
        setSelectedSection('all');
        fetchStats();
      } else {
        toast.error(data.message || 'Reset failed');
      }
    } catch {
      toast.error('Failed to perform reset');
    } finally {
      setIsResetting(false);
    }
  };

  const handleReseed = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        toast.success('Database re-seeded with sample data');
        fetchStats();
      } else {
        toast.error('Failed to re-seed database');
      }
    } catch {
      toast.error('Failed to re-seed database');
    } finally {
      setIsResetting(false);
    }
  };

  const totalRecords = stats ? Object.values(stats).reduce((sum, val) => sum + val, 0) : 0;

  const statItems = stats ? [
    { label: 'Users', value: stats.users, color: 'text-sky-600' },
    { label: 'Rooms', value: stats.rooms, color: 'text-emerald-600' },
    { label: 'Room Types', value: stats.roomTypes, color: 'text-teal-600' },
    { label: 'Guests', value: stats.guests, color: 'text-purple-600' },
    { label: 'Reservations', value: stats.reservations, color: 'text-amber-600' },
    { label: 'Bills', value: stats.bills, color: 'text-green-600' },
    { label: 'Payments', value: stats.payments, color: 'text-emerald-600' },
    { label: 'HK Tasks', value: stats.housekeepingTasks, color: 'text-yellow-600' },
    { label: 'Maintenance', value: stats.maintenanceRequests, color: 'text-orange-600' },
    { label: 'Inventory', value: stats.inventoryItems, color: 'text-indigo-600' },
    { label: 'Stock Moves', value: stats.stockMovements, color: 'text-violet-600' },
    { label: 'Policies', value: stats.hotelPolicies, color: 'text-slate-600' },
    { label: 'Expenses', value: stats.expenses, color: 'text-red-500' },
    { label: 'Cloud Files', value: stats.cloudFiles, color: 'text-blue-600' },
    { label: 'Notifications', value: stats.notifications, color: 'text-pink-600' },
    { label: 'Audit Logs', value: stats.auditLogs, color: 'text-gray-600' },
    { label: 'Security', value: stats.securityAlerts, color: 'text-red-600' },
    { label: 'Feedbacks', value: stats.guestFeedbacks, color: 'text-cyan-600' },
    { label: 'Roles', value: stats.roles, color: 'text-fuchsia-600' },
    { label: 'Permissions', value: stats.permissions, color: 'text-rose-600' },
    { label: 'Sessions', value: stats.sessions, color: 'text-stone-600' },
  ] : [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
          <Code2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Developer Tools</h2>
          <p className="text-sm text-muted-foreground">System maintenance &amp; data management</p>
        </div>
        <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-200">Developer Access</Badge>
      </div>

      {/* Warning Banner */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-orange-800 text-sm">Caution: System Maintenance Panel</h4>
              <p className="text-xs text-orange-700 mt-1">
                Actions here directly affect the database. Data resets are permanent and cannot be undone.
                The Admin and Developer user accounts will always be preserved during resets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Statistics */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Database Statistics</CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={fetchStats} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>Current state of all data tables</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {statItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className={`p-2 rounded-md bg-muted ${item.color}`}>
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{item.value.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Total records in database</span>
                <span className="text-lg font-bold text-amber-600">{totalRecords.toLocaleString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Reset Panel */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            <CardTitle className="text-base">Data Reset</CardTitle>
          </div>
          <CardDescription>
            Selectively clear data from the system. Admin and Developer accounts are always preserved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">What to Reset</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-80"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <option value="all">Reset Everything (except Admin &amp; Developer)</option>
              {resetOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            {selectedSection !== 'all' && (
              <p className="text-xs text-muted-foreground">
                {resetOptions.find((o) => o.key === selectedSection)?.description}
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Always Preserved
            </h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                Admin User (Pascal Manager)
              </Badge>
              <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                Developer User (Technical Developer)
              </Badge>
            </div>
          </div>

          {!showConfirm ? (
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => setShowConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Data
            </Button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border-2 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 text-sm">Confirm Data Reset</h4>
                  <p className="text-xs text-red-700 mt-1">
                    You are about to permanently delete:{' '}
                    <strong>
                      {selectedSection === 'all'
                        ? 'ALL DATA (except Admin &amp; Developer users)'
                        : resetOptions.find((o) => o.key === selectedSection)?.label}
                    </strong>
                    . This cannot be undone.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <Label htmlFor="dev-confirm-reset" className="text-xs text-red-700">
                      Type <code className="font-mono font-bold">RESET</code> to confirm
                    </Label>
                    <Input
                      id="dev-confirm-reset"
                      placeholder="RESET"
                      value={resetKey}
                      onChange={(e) => setResetKey(e.target.value.toUpperCase())}
                      className="font-mono h-9"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="destructive" onClick={handleReset} disabled={resetKey !== 'RESET' || isResetting} className="bg-red-600 hover:bg-red-700">
                      {isResetting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      Confirm Reset
                    </Button>
                    <Button variant="outline" onClick={() => { setShowConfirm(false); setResetKey(''); }}>Cancel</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <Button variant="outline" onClick={handleReseed} disabled={isResetting}>
            <RotateCcw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
            Re-seed Sample Data
          </Button>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">System Info</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <span className="text-xs text-muted-foreground">Database</span>
              <span className="text-xs font-medium">SQLite (Prisma ORM)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <span className="text-xs text-muted-foreground">Framework</span>
              <span className="text-xs font-medium">Next.js 16 + TypeScript</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <span className="text-xs text-muted-foreground">UI Library</span>
              <span className="text-xs font-medium">shadcn/ui + Tailwind CSS</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <span className="text-xs text-muted-foreground">Active Sessions</span>
              <span className="text-xs font-medium">{stats ? String(stats.sessions) : '...'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <span className="text-xs text-muted-foreground">System Status</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium">Online</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
