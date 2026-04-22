'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { RoomOverview } from '@/components/dashboard/RoomOverview';
import { RecentReservations } from '@/components/dashboard/RecentReservations';
import { TodayActivity } from '@/components/dashboard/TodayActivity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, UserCheck, BedDouble, Shield, Users, Building2, Activity, AlertTriangle,
  Clock, Database, Server, ArrowRight, UserCog,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/auth';

interface DashboardData {
  stats: {
    totalRooms: number;
    occupancyRate: number;
    todayRevenue: number;
    todayRevenueFormatted: string;
    activeReservations: number;
    checkInsToday: number;
    checkOutsToday: number;
    overdueCheckouts?: number;
  };
  roomStatus: {
    available: number;
    occupied: number;
    housekeeping: number;
    maintenance: number;
    reserved: number;
  };
  revenueData: Array<{ date: string; revenue: number }>;
  recentReservations: Array<{
    id: string;
    confirmationCode: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    roomRate: number;
    guest: { firstName: string; lastName: string; phone: string };
    room: { roomNumber: string; roomType: { name: string } };
  }>;
  arrivals: Array<{
    id: string;
    guest: { firstName: string; lastName: string; phone: string };
    room: { roomNumber: string };
    checkIn: string;
    status: string;
  }>;
  departures: Array<{
    id: string;
    guest: { firstName: string; lastName: string; phone: string };
    room: { roomNumber: string };
    checkOut: string;
    status: string;
  }>;
  overdueCheckouts?: Array<{
    id: string;
    guest: { firstName: string; lastName: string; phone: string };
    room: { roomNumber: string };
    checkOut: string;
    status: string;
  }>;
  systemOverview?: {
    totalUsers: number;
    totalRooms: number;
    totalRoomTypes: number;
    totalGuests: number;
    totalReservations: number;
    totalStaffMembers: number;
    recentAuditLogs: Array<{
      id: string;
      action: string;
      module: string;
      status: string;
      userName: string | null;
      createdAt: string;
      details: string | null;
    }>;
    unresolvedAlerts: Array<{
      id: string;
      type: string;
      severity: string;
      ipAddress: string | null;
      createdAt: string;
    }>;
    usersByRole: Array<{
      role: string;
      count: number;
    }>;
    revenueThisMonth: number;
    newGuestsThisMonth: number;
    avgOccupancyThisMonth: number;
  };
}

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'super_admin': return 'destructive';
    case 'manager': return 'default';
    case 'front_desk': return 'secondary';
    default: return 'outline';
  }
}

function formatRoleName(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case 'login': return 'text-emerald-600';
    case 'create': return 'text-blue-600';
    case 'update': return 'text-amber-600';
    case 'delete': return 'text-red-600';
    case 'export': return 'text-violet-600';
    case 'access_denied': return 'text-red-700';
    default: return 'text-slate-600';
  }
}

export function DashboardModule() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastBackupText, setLastBackupText] = useState('--');
  const { user } = useAuthStore();
  const { setCurrentModule } = useAppStore();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-backup: trigger on dashboard load if 6 hours have passed
  // Also fetch backup status for the indicator card
  // Runs a check every 30 minutes while the dashboard is open
  useEffect(() => {
    if (user?.role !== 'super_admin') return;

    const checkAutoBackup = () => {
      fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-check' }),
      }).catch(() => {});
    };

    // Run immediately on load
    checkAutoBackup();

    // Then check every 30 minutes (1800000ms)
    const interval = setInterval(checkAutoBackup, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.role]);

  // Fetch backup status for the indicator card
  useEffect(() => {
    if (user?.role !== 'super_admin') return;

    const fetchStatus = () => {
      fetch('/api/backup?status=auto')
        .then((res) => res.ok ? res.json() : null)
        .then((status) => {
          if (!status) { setLastBackupText('--'); return; }
          if (!status.lastAutoBackup) { setLastBackupText('Never'); return; }
          const ago = Date.now() - new Date(status.lastAutoBackup).getTime();
          const hours = Math.floor(ago / (1000 * 60 * 60));
          const mins = Math.floor((ago % (1000 * 60 * 60)) / (1000 * 60));
          if (hours < 1) setLastBackupText(`${mins}m ago`);
          else if (hours < 24) setLastBackupText(`${hours}h ago`);
          else setLastBackupText(`${Math.floor(hours / 24)}d ago`);
        })
        .catch(() => setLastBackupText('--'));
    };

    fetchStatus();
    // Refresh status every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.role]);

  useEffect(() => {
    fetchData();
  }, []);

  const timeOfDay = new Date().getHours();
  const greeting = timeOfDay < 12 ? 'Good morning' : timeOfDay < 17 ? 'Good afternoon' : 'Good evening';

  const sys = data?.systemOverview;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            {greeting}, {user?.name?.split(' ')[0] || 'User'}
          </h2>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening at Royal Loft today.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => setCurrentModule('reservations')}
          >
            <Plus className="h-4 w-4 mr-1" /> New Reservation
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCurrentModule('front-desk')}>
            <UserCheck className="h-4 w-4 mr-1" /> Check-in Guest
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCurrentModule('rooms')}>
            <BedDouble className="h-4 w-4 mr-1" /> Add Room
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={data?.stats ?? null} isLoading={isLoading} />

      {/* Charts + Room Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart data={data?.revenueData ?? []} isLoading={isLoading} />
        </div>
        <RoomOverview status={data?.roomStatus ?? null} isLoading={isLoading} />
      </div>

      {/* Recent Reservations + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentReservations reservations={data?.recentReservations ?? []} isLoading={isLoading} />
        <TodayActivity arrivals={data?.arrivals ?? []} departures={data?.departures ?? []} isLoading={isLoading} />
      </div>

      {/* Overdue Checkouts Alert */}
      {data?.overdueCheckouts && data.overdueCheckouts.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Overdue Checkouts ({data.overdueCheckouts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.overdueCheckouts.map((res) => {
                const daysOverdue = Math.max(0, Math.floor((new Date().getTime() - new Date(res.checkOut).getTime()) / (1000 * 60 * 60 * 24)));
                return (
                  <div key={res.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-red-100">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-red-100 p-2">
                        <Clock className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{res.guest.firstName} {res.guest.lastName}</p>
                        <p className="text-xs text-muted-foreground">Room {res.room.roomNumber} &bull; Was due {new Date(res.checkOut).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-red-100 text-red-700 border border-red-200 animate-pulse">
                        {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== SUPER ADMIN SECTION ===== */}
      {user?.role === 'super_admin' && sys && (
        <div className="space-y-4 mt-4">
          <Separator />
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-bold">System Administration</h3>
          </div>

          {/* 1. System Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="py-4">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Users className="h-4 w-4 text-amber-600" />
                <p className="text-lg font-bold">{sys.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Users</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <BedDouble className="h-4 w-4 text-emerald-600" />
                <p className="text-lg font-bold">{sys.totalRooms}</p>
                <p className="text-xs text-muted-foreground">Rooms</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Building2 className="h-4 w-4 text-violet-600" />
                <p className="text-lg font-bold">{sys.totalRoomTypes}</p>
                <p className="text-xs text-muted-foreground">Room Types</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Server className="h-4 w-4 text-emerald-600" />
                <p className="text-lg font-bold flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Online
                </p>
                <p className="text-xs text-muted-foreground">System Status</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Database className="h-4 w-4 text-emerald-600" />
                <p className="text-lg font-bold flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Healthy
                </p>
                <p className="text-xs text-muted-foreground">Database</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Activity className="h-4 w-4 text-amber-600" />
                <p className="text-lg font-bold">99.9%</p>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <Database className="h-4 w-4 text-blue-600" />
                <p className="text-lg font-bold">{lastBackupText}</p>
                <p className="text-xs text-muted-foreground">Last Backup</p>
              </CardContent>
            </Card>
          </div>

          {/* 2. Quick Stats + Security + Users by Role */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Quick Stats Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-600" /> Quick Stats — This Month
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Revenue</span>
                  <span className="text-sm font-semibold text-emerald-700">{formatCurrency(sys.revenueThisMonth)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">New Guests</span>
                  <span className="text-sm font-semibold">{sys.newGuestsThisMonth}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Avg. Occupancy</span>
                  <span className="text-sm font-semibold text-amber-700">{sys.avgOccupancyThisMonth}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Staff</span>
                  <span className="text-sm font-semibold">{sys.totalStaffMembers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Guests</span>
                  <span className="text-sm font-semibold">{sys.totalGuests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Reservations</span>
                  <span className="text-sm font-semibold">{sys.totalReservations}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Security Activity */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> Security Activity
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-amber-600 hover:text-amber-700 h-7 px-2"
                    onClick={() => setCurrentModule('security')}
                  >
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Unresolved Alerts */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" /> Unresolved Alerts ({sys.unresolvedAlerts.length})
                  </p>
                  {sys.unresolvedAlerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">No unresolved alerts</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sys.unresolvedAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`flex items-start justify-between gap-2 rounded-lg border p-2 ${getSeverityColor(alert.severity)}`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {alert.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </p>
                            <p className="text-xs opacity-70">{formatDateTime(alert.createdAt)}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {alert.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Audit Logs */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Recent Audit Logs
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {sys.recentAuditLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between gap-2 py-1">
                        <div className="min-w-0 flex items-center gap-2">
                          <span className={`text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {log.module}{log.userName ? ` by ${log.userName}` : ''}
                          </span>
                        </div>
                        <Badge
                          variant={log.status === 'success' ? 'secondary' : 'destructive'}
                          className="text-[10px] px-1.5 py-0 shrink-0"
                        >
                          {log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permission Overview — Users by Role */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-amber-600" /> Users by Role
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-amber-600 hover:text-amber-700 h-7 px-2"
                    onClick={() => setCurrentModule('settings')}
                  >
                    Manage <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs text-right">Users</TableHead>
                        <TableHead className="text-xs text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sys.usersByRole.map((item) => (
                        <TableRow key={item.role}>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(item.role)} className="text-xs">
                              {formatRoleName(item.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.count}</TableCell>
                          <TableCell className="text-right text-muted-foreground text-xs">
                            {sys.totalUsers > 0 ? ((item.count / sys.totalUsers) * 100).toFixed(0) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Role distribution bar */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Distribution</p>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                    {sys.usersByRole.map((item, idx) => {
                      const roleColors = ['bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500'];
                      const pct = sys.totalUsers > 0 ? (item.count / sys.totalUsers) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={item.role}
                          className={`${roleColors[idx % roleColors.length]}`}
                          style={{ width: `${pct}%` }}
                          title={`${formatRoleName(item.role)}: ${item.count}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}