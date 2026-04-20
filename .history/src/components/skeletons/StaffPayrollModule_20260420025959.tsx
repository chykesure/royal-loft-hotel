'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/auth';
import {
  Users, UserCheck, UserMinus, Wallet, CheckCircle,
  CreditCard, Building2, Smartphone, Banknote,
  Search, Calendar, Plus, Trash2, RefreshCw,
  DollarSign, AlertTriangle, ChevronDown
} from 'lucide-react';

// ============ TYPES ============
interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  salary: number | null;
  phone: string | null;
}

interface PayrollRecordItem {
  id: string;
  staffId: string;
  period: string;
  basicSalary: number;
  deductions: number;
  netPay: number;
  status: string;
  paymentMethod: string | null;
  paidAt: string | null;
  staff: StaffMember;
}

interface PayrollData {
  staff: StaffMember[];
  attendance: Record<string, string>;
  presentCount: number;
  leaveCount: number;
  totalStaff: number;
  payrollRecords: PayrollRecordItem[];
  totalPayroll: number;
  paidPayroll: number;
  period: string;
}

// ============ HELPERS ============
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getPeriodOptions(): string[] {
  const periods: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return periods;
}

function getMethodIcon(method: string) {
  switch (method) {
    case 'cash': return <Banknote className="w-4 h-4" />;
    case 'pos': return <CreditCard className="w-4 h-4" />;
    case 'bank_transfer': return <Building2 className="w-4 h-4" />;
    case 'opay': return <Smartphone className="w-4 h-4" />;
    case 'palmpay': return <Smartphone className="w-4 h-4" />;
    case 'moniepoint': return <Wallet className="w-4 h-4" />;
    default: return <Wallet className="w-4 h-4" />;
  }
}

function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    pos: 'POS',
    bank_transfer: 'Bank Transfer',
    opay: 'OPay',
    palmpay: 'PalmPay',
    moniepoint: 'Moniepoint'
  };
  return labels[method] || method;
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'pos', label: 'POS', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { id: 'opay', label: 'OPay', icon: Smartphone },
  { id: 'palmpay', label: 'PalmPay', icon: Smartphone },
  { id: 'moniepoint', label: 'Moniepoint', icon: Wallet },
];

// ============ MAIN COMPONENT ============
export default function StaffPayrollModule() {
  const [data, setData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [search, setSearch] = useState('');

  // Generate dialog
  const [showGenDialog, setShowGenDialog] = useState(false);
  const [genPeriod, setGenPeriod] = useState(getCurrentPeriod());
  const [staffDeductions, setStaffDeductions] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  // Pay dialog
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecordItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paying, setPaying] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ---- FETCH DATA ----
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch payroll data');
      const json = await res.json();
      setData(json);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- ATTENDANCE HANDLERS ----
  const handleMarkAttendance = async (staffId: string, status: string) => {
    try {
      setActionLoading(staffId);
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, status })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to mark attendance');
      }
      const label = status === 'present' ? 'Present' : status === 'on_leave' ? 'On Leave' : 'Mark removed';
      toast.success(`Staff marked as ${label}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!data) return;
    const unmarked = data.staff.filter(s => !data.attendance[s.id]);
    if (unmarked.length === 0) {
      toast.info('All staff are already marked for today');
      return;
    }
    try {
      setActionLoading('all');
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: true,
          status: 'present',
          staffIds: unmarked.map(s => s.id)
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to mark all');
      }
      toast.success(`${unmarked.length} staff marked as Present`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetAttendance = async () => {
    if (!data) return;
    const marked = data.staff.filter(s => data.attendance[s.id]);
    if (marked.length === 0) {
      toast.info('No staff marks to reset');
      return;
    }
    try {
      setActionLoading('reset');
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: true,
          status: 'remove',
          staffIds: marked.map(s => s.id)
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reset');
      }
      toast.success('All attendance marks cleared');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ---- PAYROLL HANDLERS ----
  const handleGeneratePayroll = async () => {
    if (!data) return;
    const eligibleStaff = data.staff.filter(s => s.salary && s.salary > 0);
    if (eligibleStaff.length === 0) {
      toast.error('No eligible staff found (staff must have a salary set)');
      return;
    }

    const staffList = eligibleStaff.map(s => ({
      staffId: s.id,
      deductions: Number(staffDeductions[s.id]) || 0
    }));

    try {
      setGenerating(true);
      const res = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: genPeriod, staff: staffList })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate payroll');

      toast.success(
        `Payroll generated for ${formatPeriod(genPeriod)} - ${json.count} records, Total: ${formatCurrency(json.totalAmount)}`
      );
      setShowGenDialog(false);
      setStaffDeductions({});
      setPeriod(genPeriod);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeletePending = async () => {
    try {
      const res = await fetch(`/api/payroll?period=${period}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');

      toast.success(`${json.deleted} pending payroll records deleted`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleOpenPay = (record: PayrollRecordItem) => {
    setSelectedRecord(record);
    setPaymentMethod('');
    setShowPayDialog(true);
  };

  const handleConfirmPay = async () => {
    if (!selectedRecord || !paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    try {
      setPaying(true);
      const res = await fetch('/api/payroll/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollId: selectedRecord.id,
          paymentMethod
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Payment failed');

      toast.success(json.message || 'Payment recorded successfully');
      setShowPayDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPaying(false);
    }
  };

  // ---- COMPUTED ----
  const filteredStaff = data?.staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.department || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.role || '').toLowerCase().includes(search.toLowerCase())
  ) || [];

  const eligibleStaff = data?.staff.filter(s => s.salary && s.salary > 0) || [];
  const pendingRecords = data?.payrollRecords.filter(r => r.status === 'pending') || [];
  const paidRecords = data?.payrollRecords.filter(r => r.status === 'paid') || [];

  // ---- LOADING STATE ----
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Staff & Payroll</h2>
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* ============ HEADER ============ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff & Payroll</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage staff attendance, generate payroll, and process salary payments
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ============ SUMMARY CARDS ============ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Staff */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold mt-1">{data.totalStaff}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Present Today */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present Today</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{data.presentCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* On Leave */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{data.leaveCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <UserMinus className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Payroll */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(data.totalPayroll)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            {data.totalPayroll > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(data.paidPayroll)} paid of {formatCurrency(data.totalPayroll)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ STAFF ATTENDANCE ============ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg">Staff Attendance</CardTitle>
              <Badge variant="secondary" className="text-xs">
                Today
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllPresent}
                disabled={actionLoading === 'all' || actionLoading === 'reset'}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                {actionLoading === 'all' ? 'Marking...' : 'Mark All Present'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetAttendance}
                disabled={actionLoading === 'all' || actionLoading === 'reset'}
                className="text-red-600 hover:text-red-700"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Reset All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search staff by name, department, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Staff Table */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left p-3 font-medium">Staff Name</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Department</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Role</th>
                  <th className="text-right p-3 font-medium">Salary</th>
                  <th className="text-center p-3 font-medium">Today&apos;s Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      {search ? 'No staff match your search' : 'No staff found'}
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const status = data.attendance[staff.id] || null;
                    const isLoading = actionLoading === staff.id;
                    return (
                      <tr
                        key={staff.id}
                        className={`border-b last:border-b-0 transition-colors ${
                          status === 'present'
                            ? 'bg-green-50/50'
                            : status === 'on_leave'
                            ? 'bg-amber-50/50'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{staff.department || staff.role}</p>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">
                          {staff.department || '-'}
                        </td>
                        <td className="p-3 hidden sm:table-cell text-muted-foreground">
                          {staff.role || '-'}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {staff.salary ? formatCurrency(staff.salary) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {status === 'present' ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Present
                            </Badge>
                          ) : status === 'on_leave' ? (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                              <UserMinus className="w-3 h-3 mr-1" />
                              On Leave
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-muted-foreground">
                              Not Marked
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant={status === 'present' ? 'default' : 'outline'}
                              className={`h-7 text-xs px-2 ${
                                status === 'present'
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              }`}
                              disabled={isLoading}
                              onClick={() => handleMarkAttendance(staff.id, 'present')}
                            >
                              {isLoading ? '...' : 'Present'}
                            </Button>
                            <Button
                              size="sm"
                              variant={status === 'on_leave' ? 'default' : 'outline'}
                              className={`h-7 text-xs px-2 ${
                                status === 'on_leave'
                                  ? 'bg-amber-500 hover:bg-amber-600'
                                  : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                              }`}
                              disabled={isLoading}
                              onClick={() => handleMarkAttendance(staff.id, 'on_leave')}
                            >
                              {isLoading ? '...' : 'Leave'}
                            </Button>
                            {status && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                                disabled={isLoading}
                                onClick={() => handleMarkAttendance(staff.id, 'remove')}
                                title="Remove mark"
                              >
                                <span className="text-xs">x</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Showing {filteredStaff.length} of {data.staff.length} staff
          </p>
        </CardContent>
      </Card>

      {/* ============ PAYROLL MANAGEMENT ============ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-lg">Payroll Management</CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Period Selector */}
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[170px] h-9 text-sm">
                  <Calendar className="w-4 h-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPeriodOptions().map((p) => (
                    <SelectItem key={p} value={p}>
                      {formatPeriod(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Generate Button */}
              <Button
                size="sm"
                onClick={() => {
                  setGenPeriod(period);
                  setStaffDeductions({});
                  setShowGenDialog(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Generate Payroll
              </Button>

              {/* Delete Pending */}
              {pendingRecords.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleDeletePending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Pending ({pendingRecords.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Payroll Summary Bar */}
          {data.payrollRecords.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-4 p-3 bg-muted/50 rounded-lg text-sm">
              <div>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-semibold">{formatCurrency(data.totalPayroll)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Paid: </span>
                <span className="font-semibold text-green-600">{formatCurrency(data.paidPayroll)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Outstanding: </span>
                <span className="font-semibold text-amber-600">
                  {formatCurrency(data.totalPayroll - data.paidPayroll)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Records: </span>
                <span className="font-semibold">
                  {paidRecords.length} paid / {pendingRecords.length} pending
                </span>
              </div>
            </div>
          )}

          {/* Payroll Table */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left p-3 font-medium">Staff Name</th>
                  <th className="text-right p-3 font-medium hidden sm:table-cell">Basic Salary</th>
                  <th className="text-right p-3 font-medium hidden sm:table-cell">Deductions</th>
                  <th className="text-right p-3 font-medium">Net Pay</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium hidden md:table-cell">Paid Via</th>
                  <th className="text-center p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.payrollRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No payroll records for {formatPeriod(period)}</p>
                      <p className="text-xs mt-1">
                        Click &quot;Generate Payroll&quot; to create salary records for this period
                      </p>
                    </td>
                  </tr>
                ) : (
                  data.payrollRecords.map((record) => (
                    <tr
                      key={record.id}
                      className={`border-b last:border-b-0 ${
                        record.status === 'paid' ? 'bg-green-50/30' : 'hover:bg-muted/30'
                      }`}
                    >
                      <td className="p-3">
                        <p className="font-medium">{record.staff?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{record.staff?.department || ''}</p>
                      </td>
                      <td className="p-3 text-right hidden sm:table-cell text-muted-foreground">
                        {formatCurrency(record.basicSalary)}
                      </td>
                      <td className="p-3 text-right hidden sm:table-cell">
                        {record.deductions > 0 ? (
                          <span className="text-red-600">-{formatCurrency(record.deductions)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {formatCurrency(record.netPay)}
                      </td>
                      <td className="p-3 text-center">
                        {record.status === 'paid' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-center hidden md:table-cell">
                        {record.paymentMethod ? (
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            {getMethodIcon(record.paymentMethod)}
                            <span className="text-xs">{getMethodLabel(record.paymentMethod)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {record.status === 'pending' ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() => handleOpenPay(record)}
                          >
                            <Wallet className="w-3 h-3 mr-1" />
                            Pay
                          </Button>
                        ) : record.paidAt ? (
                          <span className="text-xs text-muted-foreground">
                            {new Date(record.paidAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ============ GENERATE PAYROLL DIALOG ============ */}
      <Dialog open={showGenDialog} onOpenChange={setShowGenDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Generate Payroll
            </DialogTitle>
            <DialogDescription>
              Generate salary records for staff. You can adjust deductions for each staff member before generating.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Period Selector */}
            <div>
              <label className="text-sm font-medium mb-1 block">Payroll Period</label>
              <Select value={genPeriod} onValueChange={setGenPeriod}>
                <SelectTrigger>
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPeriodOptions().map((p) => (
                    <SelectItem key={p} value={p}>
                      {formatPeriod(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Staff List with Deductions */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-2 font-medium">Staff Name</th>
                    <th className="text-left p-2 font-medium hidden sm:table-cell">Dept</th>
                    <th className="text-right p-2 font-medium">Basic Salary</th>
                    <th className="text-right p-2 font-medium">Deductions</th>
                    <th className="text-right p-2 font-medium">Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleStaff.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-4 text-muted-foreground">
                        No eligible staff found. Staff must have a salary set to be included in payroll.
                      </td>
                    </tr>
                  ) : (
                    eligibleStaff.map((staff) => {
                      const deductions = Number(staffDeductions[staff.id]) || 0;
                      const netPay = (staff.salary || 0) - deductions;
                      return (
                        <tr key={staff.id} className="border-b last:border-b-0">
                          <td className="p-2 font-medium">{staff.name}</td>
                          <td className="p-2 text-muted-foreground hidden sm:table-cell">
                            {staff.department || '-'}
                          </td>
                          <td className="p-2 text-right">{formatCurrency(staff.salary || 0)}</td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={staffDeductions[staff.id] || ''}
                              onChange={(e) =>
                                setStaffDeductions((prev: any) => ({
                                  ...prev,
                                  [staff.id]: e.target.value
                                }))
                              }
                              className="w-24 h-8 text-right ml-auto"
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">
                            {formatCurrency(netPay)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Total */}
            {eligibleStaff.length > 0 && (
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">Total Payroll ({eligibleStaff.length} staff)</span>
                <span className="text-lg font-bold">
                  {formatCurrency(
                    eligibleStaff.reduce(
                      (sum, s) => sum + (s.salary || 0) - (Number(staffDeductions[s.id]) || 0),
                      0
                    )
                  )}
                </span>
              </div>
            )}

            {eligibleStaff.length === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                <strong>Note:</strong> Some staff members may not appear because they don&apos;t have a salary set. 
                Please update their salary in the staff settings to include them in payroll.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePayroll}
              disabled={generating || eligibleStaff.length === 0}
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Generate for {formatPeriod(genPeriod)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ PAY SALARY DIALOG ============ */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Process Salary Payment
            </DialogTitle>
            <DialogDescription>
              Record salary payment for {selectedRecord?.staff?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              {/* Payment Details */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Staff</span>
                  <span className="font-medium">{selectedRecord.staff?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium">{formatPeriod(selectedRecord.period)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Basic Salary</span>
                  <span>{formatCurrency(selectedRecord.basicSalary)}</span>
                </div>
                {selectedRecord.deductions > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deductions</span>
                    <span className="text-red-600">-{formatCurrency(selectedRecord.deductions)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Net Pay</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(selectedRecord.netPay)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <Button
                        key={method.id}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        className={`h-auto py-3 flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'hover:border-green-300'
                        }`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{method.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPay}
              disabled={paying || !paymentMethod}
              className="bg-green-600 hover:bg-green-700"
            >
              {paying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}