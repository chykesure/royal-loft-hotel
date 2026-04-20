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
  DollarSign, AlertTriangle
} from 'lucide-react';

// ============ TYPES ============
interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

interface StaffProfileItem {
  id: string;
  userId: string;
  employeeId: string;
  department: string;
  position: string;
  baseSalary: number;
  startDate: string;
  endDate: string | null;
  status: string;
  bankName: string | null;
  bankAccount: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  user: StaffUser;
}

interface PayrollRecordItem {
  id: string;
  staffId: string;
  period: string;
  basicSalary: number;
  overtimePay: number;
  bonus: number;
  deductions: number;
  taxAmount: number;
  netPay: number;
  status: string;
  paymentMethod: string | null;
  paidAt: string | null;
  processedBy: string | null;
  createdAt: string;
  staff: StaffProfileItem;
}

interface PayrollData {
  staff: StaffProfileItem[];
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

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    half_day: 'Half Day',
    on_leave: 'On Leave',
    holiday: 'Holiday'
  };
  return labels[status] || status;
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'pos', label: 'POS', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { id: 'opay', label: 'OPay', icon: Smartphone },
  { id: 'palmpay', label: 'PalmPay', icon: Smartphone },
  { id: 'moniepoint', label: 'Moniepoint', icon: Wallet },
];

const ATTENDANCE_OPTIONS = [
  { value: 'present', label: 'Present', color: 'green' },
  { value: 'on_leave', label: 'On Leave', color: 'amber' },
  { value: 'half_day', label: 'Half Day', color: 'blue' },
  { value: 'absent', label: 'Absent', color: 'red' },
];

// ============ MAIN COMPONENT ============
export function StaffPayrollModule() {
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
      toast.success(`Staff marked as ${getStatusLabel(status)}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchAttendance = async (status: string) => {
    if (!data) return;
    const target = status === 'remove'
      ? data.staff
      : data.staff.filter(s => !data.attendance[s.id]);

    if (target.length === 0) {
      toast.info(status === 'remove' ? 'No marks to clear' : 'All staff already marked');
      return;
    }

    try {
      setActionLoading('batch');
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: true,
          status,
          staffIds: target.map(s => s.id)
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Batch action failed');
      }
      toast.success(
        status === 'remove'
          ? `${target.length} attendance marks cleared`
          : `${target.length} staff marked as ${getStatusLabel(status)}`
      );
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
    const eligibleStaff = data.staff.filter(s => s.baseSalary > 0);
    if (eligibleStaff.length === 0) {
      toast.error('No eligible staff found (staff must have a base salary set)');
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
  const safe = {
    staff: data?.staff || [],
    attendance: data?.attendance || {},
    presentCount: data?.presentCount || 0,
    leaveCount: data?.leaveCount || 0,
    totalStaff: data?.totalStaff || 0,
    payrollRecords: data?.payrollRecords || [],
    totalPayroll: data?.totalPayroll || 0,
    paidPayroll: data?.paidPayroll || 0,
    period: data?.period || period,
  };

   const filteredStaff = safe.staff.filter(s => {
    const name = s.user?.name?.toLowerCase() || '';
    const dept = (s.department || '').toLowerCase();
    const pos = (s.position || '').toLowerCase();
    const empId = (s.employeeId || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || dept.includes(q) || pos.includes(q) || empId.includes(q);
  });

  const pendingRecords = safe.payrollRecords.filter(r => r.status === 'pending');
  const paidRecords = safe.payrollRecords.filter(r => r.status === 'paid');

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
                onClick={() => handleBatchAttendance('present')}
                disabled={actionLoading === 'batch'}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Mark All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchAttendance('remove')}
                disabled={actionLoading === 'batch'}
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
              placeholder="Search by name, department, position, or employee ID..."
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
                  <th className="text-left p-3 font-medium hidden md:table-cell">Employee ID</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Department</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Position</th>
                  <th className="text-right p-3 font-medium">Base Salary</th>
                  <th className="text-center p-3 font-medium">Today&apos;s Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      {search ? 'No staff match your search' : 'No staff profiles found. Create staff profiles first.'}
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const status = data.attendance[staff.id] || null;
                    const isLoading = actionLoading === staff.id;
                    return (
                      <tr
                        key={staff.id}
                        className={`border-b last:border-b-0 transition-colors ${status === 'present' || status === 'half_day'
                          ? 'bg-green-50/50'
                          : status === 'on_leave'
                            ? 'bg-amber-50/50'
                            : status === 'absent'
                              ? 'bg-red-50/30'
                              : 'hover:bg-muted/30'
                          }`}
                      >
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{staff.user?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {staff.employeeId} | {staff.department}
                            </p>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground text-xs font-mono">
                          {staff.employeeId}
                        </td>
                        <td className="p-3 hidden lg:table-cell text-muted-foreground">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {staff.department?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-3 hidden sm:table-cell text-muted-foreground">
                          {staff.position}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(staff.baseSalary)}
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
                          ) : status === 'half_day' ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                              Present (Half)
                            </Badge>
                          ) : status === 'absent' ? (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                              Absent
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
                              className={`h-7 text-xs px-2 ${status === 'present'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                }`}
                              disabled={isLoading}
                              onClick={() => handleMarkAttendance(staff.id, 'present')}
                            >
                              {isLoading ? '...' : 'P'}
                            </Button>
                            <Button
                              size="sm"
                              variant={status === 'on_leave' ? 'default' : 'outline'}
                              className={`h-7 text-xs px-2 ${status === 'on_leave'
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                }`}
                              disabled={isLoading}
                              onClick={() => handleMarkAttendance(staff.id, 'on_leave')}
                            >
                              {isLoading ? '...' : 'L'}
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
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Showing {filteredStaff.length} of {(data?.staff || []).length} staff
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" /> Present
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-2 mr-1" /> On Leave
              <span className="inline-block w-2 h-2 rounded-full bg-red-400 ml-2 mr-1" /> Absent
              <span className="inline-block w-2 h-2 rounded-full bg-gray-300 ml-2 mr-1" /> Not Marked
            </p>
          </div>
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
          {(data?.payrollRecords || []).length > 0 && (
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
                  <th className="text-right p-3 font-medium hidden md:table-cell">Deductions</th>
                  <th className="text-right p-3 font-medium">Net Pay</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium hidden lg:table-cell">Paid Via</th>
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
                      className={`border-b last:border-b-0 ${record.status === 'paid' ? 'bg-green-50/30' : 'hover:bg-muted/30'
                        }`}
                    >
                      <td className="p-3">
                        <p className="font-medium">{record.staff?.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.staff?.position || ''} {record.staff?.department ? `| ${record.staff.department?.replace(/_/g, ' ')}` : ''}
                        </p>
                      </td>
                      <td className="p-3 text-right hidden sm:table-cell text-muted-foreground">
                        {formatCurrency(record.basicSalary)}
                      </td>
                      <td className="p-3 text-right hidden md:table-cell">
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
                        ) : record.status === 'processed' ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                            Processed
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-center hidden lg:table-cell">
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
                        {record.status === 'pending' || record.status === 'processed' ? (
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
              Generate salary records for staff. Adjust deductions for each staff member before generating.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-2 text-xs text-muted-foreground flex justify-between">
                <span>{data.staff.length} active staff profiles</span>
                <span>Only staff with base salary &gt; 0 are included</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="text-left p-2 font-medium">Staff Name</th>
                    <th className="text-left p-2 font-medium hidden sm:table-cell">Dept</th>
                    <th className="text-right p-2 font-medium">Base Salary</th>
                    <th className="text-right p-2 font-medium">Deductions</th>
                    <th className="text-right p-2 font-medium">Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {data.staff.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-4 text-muted-foreground">
                        No staff profiles found. Create staff profiles in the Staff module first.
                      </td>
                    </tr>
                  ) : (
                    data.staff.map((staff) => {
                      const hasSalary = staff.baseSalary > 0;
                      const deductions = Number(staffDeductions[staff.id]) || 0;
                      const netPay = hasSalary ? staff.baseSalary - deductions : 0;
                      return (
                        <tr key={staff.id} className={`border-b last:border-b-0 ${!hasSalary ? 'opacity-40' : ''}`}>
                          <td className="p-2">
                            <p className="font-medium">{staff.user?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{staff.department}</p>
                          </td>
                          <td className="p-2 text-muted-foreground hidden sm:table-cell text-xs">
                            {staff.department?.replace(/_/g, ' ')}
                          </td>
                          <td className="p-2 text-right">
                            {hasSalary ? formatCurrency(staff.baseSalary) : 'No salary'}
                          </td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={staffDeductions[staff.id] || ''}
                              onChange={(e) =>
                                setStaffDeductions((prev: Record<string, string>) => ({
                                  ...prev,
                                  [staff.id]: e.target.value
                                }))
                              }
                              disabled={!hasSalary}
                              className="w-24 h-8 text-right ml-auto"
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">
                            {hasSalary ? formatCurrency(netPay) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {data.staff.some(s => s.baseSalary > 0) && (
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">
                  Total Payroll ({data.staff.filter(s => s.baseSalary > 0).length} staff)
                </span>
                <span className="text-lg font-bold">
                  {formatCurrency(
                    data.staff
                      .filter(s => s.baseSalary > 0)
                      .reduce(
                        (sum, s) => sum + s.baseSalary - (Number(staffDeductions[s.id]) || 0),
                        0
                      )
                  )}
                </span>
              </div>
            )}

            {data.staff.length > 0 && !data.staff.some(s => s.baseSalary > 0) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                <strong>Note:</strong> No staff members have a base salary set. Update their staff profile to include a salary.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePayroll}
              disabled={generating || !data.staff.some(s => s.baseSalary > 0)}
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
              Record salary payment for {selectedRecord?.staff?.user?.name || 'staff'}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Staff</span>
                  <span className="font-medium">{selectedRecord.staff?.user?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Employee ID</span>
                  <span className="font-mono text-xs">{selectedRecord.staff?.employeeId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium">{formatPeriod(selectedRecord.period)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Basic Salary</span>
                  <span>{formatCurrency(selectedRecord.basicSalary)}</span>
                </div>
                {selectedRecord.overtimePay > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Overtime</span>
                    <span className="text-green-600">+{formatCurrency(selectedRecord.overtimePay)}</span>
                  </div>
                )}
                {selectedRecord.bonus > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Bonus</span>
                    <span className="text-green-600">+{formatCurrency(selectedRecord.bonus)}</span>
                  </div>
                )}
                {selectedRecord.deductions > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deductions</span>
                    <span className="text-red-600">-{formatCurrency(selectedRecord.deductions)}</span>
                  </div>
                )}
                {selectedRecord.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-red-600">-{formatCurrency(selectedRecord.taxAmount)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Net Pay</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(selectedRecord.netPay)}
                  </span>
                </div>
                {selectedRecord.staff?.bankName && (
                  <div className="flex justify-between text-sm text-muted-foreground pt-1">
                    <span>Bank</span>
                    <span>{selectedRecord.staff.bankName} - {selectedRecord.staff.bankAccount || '****'}</span>
                  </div>
                )}
              </div>

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
                        className={`h-auto py-3 flex flex-col items-center gap-1 ${isSelected
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