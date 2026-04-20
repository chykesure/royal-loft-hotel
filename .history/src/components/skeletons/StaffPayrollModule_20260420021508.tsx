'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Users, Clock, DollarSign, UserPlus, Search, Eye, RefreshCw,
  Wallet, Pencil, Trash2, CheckCircle2, XCircle, AlertCircle,
  Building2, CalendarDays, CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';

// ---- Types ----

interface StaffMember {
  id: string;
  userId: string;
  user: { name: string; email: string; phone: string | null; avatar: string | null; role: string; isActive: boolean; };
  employeeId: string;
  department: string;
  position: string;
  baseSalary: number;
  status: string;
  startDate: string;
  bankName?: string | null;
  bankAccount?: string | null;
  todayAttendance: { status: string; clockIn: string | null; clockOut: string | null; hoursWorked: number | null; } | null;
  currentPayroll: { id: string; basicSalary: number; overtimePay: number; bonus: number; deductions: number; taxAmount: number; netPay: number; status: string; paidAt: string | null; } | null;
}

interface StaffSummary {
  totalStaff: number; presentToday: number; onLeave: number; totalActive: number;
  monthlyPayroll: number; monthlyPayrollFormatted: string;
}

interface DeptPayroll { department: string; count: number; totalSalary: number; }

const DEPARTMENT_LABELS: Record<string, string> = {
  front_desk: 'Front Desk', housekeeping: 'Housekeeping', kitchen: 'Kitchen',
  security: 'Security', maintenance: 'Maintenance', management: 'Management', accounts: 'Accounts',
};
const DEPARTMENT_COLORS: Record<string, string> = {
  front_desk: 'bg-amber-100 text-amber-700', housekeeping: 'bg-teal-100 text-teal-700',
  kitchen: 'bg-orange-100 text-orange-700', security: 'bg-red-100 text-red-700',
  maintenance: 'bg-blue-100 text-blue-700', management: 'bg-violet-100 text-violet-700',
  accounts: 'bg-emerald-100 text-emerald-700',
};
const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700', on_leave: 'bg-orange-100 text-orange-700',
  suspended: 'bg-red-100 text-red-700', terminated: 'bg-gray-100 text-gray-700',
};
const ATTENDANCE_BADGE: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700', absent: 'bg-red-100 text-red-700',
  half_day: 'bg-yellow-100 text-yellow-700', on_leave: 'bg-orange-100 text-orange-700',
};
const DEPT_ACCENT: Record<string, string> = {
  front_desk: 'bg-amber-500', housekeeping: 'bg-teal-500', kitchen: 'bg-orange-500',
  security: 'bg-red-500', maintenance: 'bg-blue-500', management: 'bg-violet-500',
  accounts: 'bg-emerald-500',
};
const PAYROLL_STATUS: Record<string, { badge: string; label: string }> = {
  pending: { badge: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  processed: { badge: 'bg-sky-100 text-sky-700', label: 'Processed' },
  paid: { badge: 'bg-emerald-100 text-emerald-700', label: 'Paid' },
};

function formatLabel(str: string) { return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

export function StaffPayrollModule() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [summary, setSummary] = useState<StaffSummary | null>(null);
  const [payrollByDepartment, setPayrollByDepartment] = useState<DeptPayroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'staff' | 'payroll'>('staff');

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [editStaffOpen, setEditStaffOpen] = useState(false);
  const [addPayrollOpen, setAddPayrollOpen] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', password: '', department: 'front_desk', position: '', baseSalary: '', bankName: '', bankAccount: '' });
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', phone: '', department: '', position: '', baseSalary: '', status: '', bankName: '', bankAccount: '' });
  const [payrollForm, setPayrollForm] = useState({ staffId: '', basicSalary: '', overtimePay: '0', bonus: '0', deductions: '0', taxAmount: '0', netPay: '' });
  const [periodFilter, setPeriodFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const [payrollLoading, setPayrollLoading] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff);
        setSummary(data.summary);
        setPayrollByDepartment(data.payrollByDepartment);
      } else {
        toast.error('Failed to load staff data');
      }
    } catch {
      toast.error('Failed to load staff data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const fetchPayroll = useCallback(async () => {
    try {
      setPayrollLoading(true);
      const res = await fetch(`/api/payroll?period=${periodFilter}`);
      if (res.ok) {
        const data = await res.json();
        setPayrollRecords(data.records);
        setPayrollSummary(data.summary);
      }
    } catch {
      toast.error('Failed to load payroll');
    } finally {
      setPayrollLoading(false);
    }
  }, [periodFilter]);

  useEffect(() => {
    if (activeTab === 'payroll') fetchPayroll();
  }, [activeTab, fetchPayroll]);

  // ---- Actions ----

  const handleAddStaff = async () => {
    if (!addForm.name || !addForm.email || !addForm.position || !addForm.baseSalary) {
      toast.error('Name, email, position, and salary are required');
      return;
    }
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        toast.success('Staff member added successfully');
        setAddStaffOpen(false);
        setAddForm({ name: '', email: '', phone: '', password: '', department: 'front_desk', position: '', baseSalary: '', bankName: '', bankAccount: '' });
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add staff');
      }
    } catch {
      toast.error('Failed to add staff');
    }
  };

  const handleEditStaff = async () => {
    if (!editForm.id) return;
    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success('Staff updated successfully');
        setEditStaffOpen(false);
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update staff');
      }
    } catch {
      toast.error('Failed to update staff');
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchPayroll();
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to generate payroll');
      }
    } catch {
      toast.error('Failed to generate payroll');
    }
  };

  const handlePayStaff = async (id: string) => {
    try {
      const res = await fetch('/api/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'paid' }),
      });
      if (res.ok) {
        toast.success('Salary marked as paid');
        fetchPayroll();
        fetchStaff();
      } else {
        toast.error('Failed to process payment');
      }
    } catch {
      toast.error('Failed to process payment');
    }
  };

  const handlePayAll = async () => {
    try {
      const res = await fetch('/api/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulkAction: 'pay_all' }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchPayroll();
        fetchStaff();
      } else {
        toast.error('Failed to process bulk payment');
      }
    } catch {
      toast.error('Failed to process bulk payment');
    }
  };

  const handleDeletePayroll = async (id: string) => {
    try {
      const res = await fetch('/api/payroll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success('Payroll record deleted');
        fetchPayroll();
        fetchStaff();
      } else {
        toast.error('Failed to delete payroll record');
      }
    } catch {
      toast.error('Failed to delete payroll record');
    }
  };

  const handleAddPayrollRecord = async () => {
    if (!payrollForm.staffId || !payrollForm.netPay) {
      toast.error('Staff and net pay are required');
      return;
    }
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payrollForm, period: periodFilter }),
      });
      if (res.ok) {
        toast.success('Payroll record created');
        setAddPayrollOpen(false);
        setPayrollForm({ staffId: '', basicSalary: '', overtimePay: '0', bonus: '0', deductions: '0', taxAmount: '0', netPay: '' });
        fetchPayroll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create payroll record');
      }
    } catch {
      toast.error('Failed to create payroll record');
    }
  };

  const openDetail = (member: StaffMember) => { setSelectedStaff(member); setDetailOpen(true); };
  const openEdit = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditForm({
      id: member.id, name: member.user.name, email: member.user.email, phone: member.user.phone || '',
      department: member.department, position: member.position, baseSalary: String(member.baseSalary),
      status: member.status, bankName: member.bankName || '', bankAccount: member.bankAccount || '',
    });
    setEditStaffOpen(true);
  };

  const filteredStaff = search.trim()
    ? staff.filter((s) =>
        s.user.name.toLowerCase().includes(search.toLowerCase()) ||
        s.position.toLowerCase().includes(search.toLowerCase()) ||
        (DEPARTMENT_LABELS[s.department] || s.department).toLowerCase().includes(search.toLowerCase())
      )
    : staff;

  const totalDeptSalary = payrollByDepartment.reduce((s, d) => s + d.totalSalary, 0);

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">

      {/* ═══════════════ TABS ═══════════════ */}
      <div className="flex items-center gap-3">
        <Button
          variant={activeTab === 'staff' ? 'default' : 'outline'}
          className={activeTab === 'staff' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
          onClick={() => setActiveTab('staff')}
        >
          <Users className="h-4 w-4 mr-1.5" /> Staff Directory
        </Button>
        <Button
          variant={activeTab === 'payroll' ? 'default' : 'outline'}
          className={activeTab === 'payroll' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
          onClick={() => setActiveTab('payroll')}
        >
          <Wallet className="h-4 w-4 mr-1.5" /> Payroll Management
        </Button>
      </div>

      {/* ═══════════════ STAFF TAB ═══════════════ */}
      {activeTab === 'staff' && (
        <>
          {/* Summary Cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => (
                <Card key={i} className="border-none shadow-sm"><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-none shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2.5"><Users className="h-5 w-5 text-amber-600" /></div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Total Staff</p>
                    <p className="text-xl font-bold">{summary.totalStaff}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2.5"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Present Today</p>
                    <p className="text-xl font-bold text-emerald-600">{summary.presentToday}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-orange-100 p-2.5"><Clock className="h-5 w-5 text-orange-600" /></div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">On Leave</p>
                    <p className="text-xl font-bold text-orange-600">{summary.onLeave}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-violet-100 p-2.5"><DollarSign className="h-5 w-5 text-violet-600" /></div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Monthly Payroll</p>
                    <p className="text-xl font-bold text-violet-600">{summary.monthlyPayrollFormatted}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Staff List + Payroll by Dept */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Staff Directory */}
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
                <CardTitle className="text-sm font-semibold">Staff Directory</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-36 pl-8 text-xs" />
                  </div>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs" onClick={() => setAddStaffOpen(true)}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Staff
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
                  ) : filteredStaff.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No staff found</p>
                  ) : (
                    filteredStaff.map((member) => {
                      const initials = member.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
                      const attStatus = member.todayAttendance?.status || 'absent';
                      const deptColor = DEPT_ACCENT[member.department] || 'bg-gray-500';
                      return (
                        <div key={member.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => openDetail(member)}>
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-full ${deptColor} flex items-center justify-center text-white text-[11px] font-semibold shrink-0`}>{initials}</div>
                            <div>
                              <p className="text-sm font-medium">{member.user.name}</p>
                              <p className="text-[11px] text-muted-foreground">{member.position} &middot; {DEPARTMENT_LABELS[member.department] || member.department}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {member.todayAttendance && <Badge className={`text-[9px] px-1.5 py-0 h-4 border-0 ${ATTENDANCE_BADGE[attStatus] || ''}`}>{formatLabel(attStatus)}</Badge>}
                            <Badge className={`text-[9px] px-1.5 py-0 h-4 border-0 ${STATUS_BADGE[member.status] || ''}`}>{formatLabel(member.status)}</Badge>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); openEdit(member); }}><Pencil className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payroll by Department */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Payroll by Department</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payrollByDepartment.map((dept) => {
                    const pct = totalDeptSalary > 0 ? (dept.totalSalary / totalDeptSalary) * 100 : 0;
                    return (
                      <div key={dept.department} className="p-2.5 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${DEPT_ACCENT[dept.department] || 'bg-gray-400'}`} />
                            <div>
                              <p className="text-sm font-medium">{DEPARTMENT_LABELS[dept.department] || dept.department}</p>
                              <p className="text-[11px] text-muted-foreground">{dept.count} staff</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold">{formatCurrency(dept.totalSalary)}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${DEPT_ACCENT[dept.department] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <div>
                      <p className="text-sm font-bold text-amber-800">Total</p>
                      <p className="text-[11px] text-amber-600">{summary?.totalActive ?? 0} active staff</p>
                    </div>
                    <span className="text-sm font-bold text-amber-800">{formatCurrency(totalDeptSalary)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ═══════════════ PAYROLL TAB ═══════════════ */}
      {activeTab === 'payroll' && (
        <>
          {/* Payroll Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Total Payroll</p>
                <p className="text-lg font-bold">{payrollSummary ? formatCurrency(payrollSummary.totalNetPay) : '...'}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Paid</p>
                <p className="text-lg font-bold text-emerald-600">{payrollSummary ? `${payrollSummary.paid} staff` : '...'}</p>
                <p className="text-[10px] text-muted-foreground">{payrollSummary ? formatCurrency(payrollSummary.paidAmount) : ''}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-orange-600">{payrollSummary ? `${payrollSummary.pending} staff` : '...'}</p>
                <p className="text-[10px] text-muted-foreground">{payrollSummary ? formatCurrency(payrollSummary.pendingAmount) : ''}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center justify-center">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white w-full h-10 text-xs" onClick={handlePayAll} disabled={!payrollSummary || payrollSummary.pending === 0}>
                  <CreditCard className="h-4 w-4 mr-1.5" /> Pay All Pending
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Payroll Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="month" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="h-8 w-40 pl-8 text-xs" />
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={fetchPayroll}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs" onClick={handleGeneratePayroll}>
                <Wallet className="h-3.5 w-3.5 mr-1" /> Generate Payroll
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAddPayrollOpen(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Record
              </Button>
            </div>
          </div>

          {/* Payroll Table */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {payrollLoading ? (
                <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead className="hidden sm:table-cell">Dept</TableHead>
                        <TableHead>Basic</TableHead>
                        <TableHead className="hidden md:table-cell">OT</TableHead>
                        <TableHead className="hidden md:table-cell">Deductions</TableHead>
                        <TableHead>Net Pay</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRecords.map((record: any) => {
                        const cfg = PAYROLL_STATUS[record.status] || PAYROLL_STATUS.pending;
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{record.staff?.user?.name || 'Unknown'}</p>
                                <p className="text-[11px] text-muted-foreground">{record.staff?.employeeId || ''}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge className={`text-[9px] px-1.5 py-0 h-4 border-0 ${DEPARTMENT_COLORS[record.staff?.department] || ''}`}>
                                {DEPARTMENT_LABELS[record.staff?.department] || record.staff?.department || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{formatCurrency(record.basicSalary)}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{record.overtimePay > 0 ? <span className="text-emerald-600">+{formatCurrency(record.overtimePay)}</span> : '—'}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{record.deductions > 0 ? <span className="text-red-600">-{formatCurrency(record.deductions)}</span> : '—'}</TableCell>
                            <TableCell className="text-sm font-bold">{formatCurrency(record.netPay)}</TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] px-2 py-0.5 h-5 ${cfg.badge}`}>{cfg.label}</Badge>
                              {record.paidAt && <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(record.paidAt)}</p>}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {record.status === 'pending' && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2" onClick={() => handlePayStaff(record.id)}>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Pay
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDeletePayroll(record.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {payrollRecords.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No payroll records for this period</p>
                            <p className="text-xs opacity-60 mt-1">Click &quot;Generate Payroll&quot; to create records for all active staff</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════ ADD STAFF DIALOG ═══════════════ */}
      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-amber-500" /> Add New Staff</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Full Name *</Label><Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="John Doe" /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Email *</Label><Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="john@royalloft.com" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Phone</Label><Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="+234..." /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Password</Label><Input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="Default: Staff@123" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Department *</Label>
                <Select value={addForm.department} onValueChange={(v) => setAddForm({ ...addForm, department: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Position *</Label><Input value={addForm.position} onChange={(e) => setAddForm({ ...addForm, position: e.target.value })} placeholder="Receptionist" /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Base Salary (₦) *</Label><Input type="number" value={addForm.baseSalary} onChange={(e) => setAddForm({ ...addForm, baseSalary: e.target.value })} placeholder="150000" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Bank Name</Label><Input value={addForm.bankName} onChange={(e) => setAddForm({ ...addForm, bankName: e.target.value })} placeholder="GTBank" /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Account Number</Label><Input value={addForm.bankAccount} onChange={(e) => setAddForm({ ...addForm, bankAccount: e.target.value })} placeholder="0123456789" /></div>
            </div>
            <Button onClick={handleAddStaff} className="bg-amber-500 hover:bg-amber-600 text-white">
              <UserPlus className="h-4 w-4 mr-2" /> Add Staff Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ EDIT STAFF DIALOG ═══════════════ */}
      <Dialog open={editStaffOpen} onOpenChange={setEditStaffOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-amber-500" /> Edit Staff</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Full Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Email</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Department</Label>
                <Select value={editForm.department} onValueChange={(v) => setEditForm({ ...editForm, department: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Position</Label><Input value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Base Salary (₦)</Label><Input type="number" value={editForm.baseSalary} onChange={(e) => setEditForm({ ...editForm, baseSalary: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Bank Name</Label><Input value={editForm.bankName} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Account Number</Label><Input value={editForm.bankAccount} onChange={(e) => setEditForm({ ...editForm, bankAccount: e.target.value })} /></div>
            </div>
            <Button onClick={handleEditStaff} className="bg-amber-500 hover:bg-amber-600 text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ STAFF DETAIL DIALOG ═══════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {selectedStaff && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full ${DEPT_ACCENT[selectedStaff.department] || 'bg-gray-500'} flex items-center justify-center text-white text-sm font-semibold`}>
                    {selectedStaff.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p>{selectedStaff.user.name}</p>
                    <p className="text-sm font-normal text-muted-foreground">{selectedStaff.employeeId}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-[11px] text-muted-foreground">Department</p><Badge className={`mt-1 text-[10px] px-2 py-0.5 h-5 border-0 ${DEPARTMENT_COLORS[selectedStaff.department] || ''}`}>{DEPARTMENT_LABELS[selectedStaff.department] || selectedStaff.department}</Badge></div>
                  <div><p className="text-[11px] text-muted-foreground">Position</p><p className="font-medium mt-0.5">{selectedStaff.position}</p></div>
                  <div><p className="text-[11px] text-muted-foreground">Email</p><p className="font-medium mt-0.5 truncate">{selectedStaff.user.email}</p></div>
                  <div><p className="text-[11px] text-muted-foreground">Phone</p><p className="font-medium mt-0.5">{selectedStaff.user.phone || '—'}</p></div>
                  <div><p className="text-[11px] text-muted-foreground">Status</p><Badge className={`mt-1 text-[10px] px-2 py-0.5 h-5 border-0 ${STATUS_BADGE[selectedStaff.status] || ''}`}>{formatLabel(selectedStaff.status)}</Badge></div>
                  <div><p className="text-[11px] text-muted-foreground">Base Salary</p><p className="font-medium mt-0.5">{formatCurrency(selectedStaff.baseSalary)}</p></div>
                  {selectedStaff.bankName && <div><p className="text-[11px] text-muted-foreground">Bank</p><p className="font-medium mt-0.5">{selectedStaff.bankName} — {selectedStaff.bankAccount || ''}</p></div>}
                </div>

                {selectedStaff.todayAttendance && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Today&apos;s Attendance</p>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] px-2 py-0.5 h-5 border-0 ${ATTENDANCE_BADGE[selectedStaff.todayAttendance.status] || ''}`}>{formatLabel(selectedStaff.todayAttendance.status)}</Badge>
                          {selectedStaff.todayAttendance.hoursWorked && <span className="text-xs text-muted-foreground">{selectedStaff.todayAttendance.hoursWorked} hrs</span>}
                        </div>
                        {selectedStaff.todayAttendance.clockIn && (
                          <p className="text-xs text-muted-foreground">
                            In: {new Date(selectedStaff.todayAttendance.clockIn).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                            {selectedStaff.todayAttendance.clockOut ? ` — Out: ${new Date(selectedStaff.todayAttendance.clockOut).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedStaff.currentPayroll && (
                  <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-violet-700">This Month&apos;s Payroll</p>
                      <Badge className={`text-[10px] px-2 py-0.5 h-5 border-0 ${selectedStaff.currentPayroll.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{formatLabel(selectedStaff.currentPayroll.status)}</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Basic</span><span>{formatCurrency(selectedStaff.currentPayroll.basicSalary)}</span></div>
                      {selectedStaff.currentPayroll.overtimePay > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Overtime</span><span className="text-emerald-600">+{formatCurrency(selectedStaff.currentPayroll.overtimePay)}</span></div>}
                      {selectedStaff.currentPayroll.bonus > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Bonus</span><span className="text-emerald-600">+{formatCurrency(selectedStaff.currentPayroll.bonus)}</span></div>}
                      {selectedStaff.currentPayroll.deductions > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Deductions</span><span className="text-red-500">-{formatCurrency(selectedStaff.currentPayroll.deductions)}</span></div>}
                      <Separator />
                      <div className="flex justify-between font-bold"><span>Net Pay</span><span className="text-violet-700">{formatCurrency(selectedStaff.currentPayroll.netPay)}</span></div>
                    </div>
                  </div>
                )}

                {!selectedStaff.currentPayroll && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                    <p className="text-xs text-amber-600">No payroll record for this month</p>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => { setDetailOpen(false); setActiveTab('payroll'); }}>
                      Go to Payroll to generate
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════ ADD PAYROLL RECORD DIALOG ═══════════════ */}
      <Dialog open={addPayrollOpen} onOpenChange={setAddPayrollOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-violet-500" /> Add Payroll Record</DialogTitle>
            <DialogDescription>Period: {periodFilter}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label className="text-xs">Staff Member *</Label>
              <Select value={payrollForm.staffId} onValueChange={(v) => {
                const found = staff.find(s => s.id === v);
                setPayrollForm({ ...payrollForm, staffId: v, basicSalary: found ? String(found.baseSalary) : '', netPay: found ? String(found.baseSalary) : '' });
              }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staff.filter(s => s.status === 'active').map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.user.name} — {s.position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Basic Salary</Label><Input type="number" value={payrollForm.basicSalary} onChange={(e) => setPayrollForm({ ...payrollForm, basicSalary: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Overtime</Label><Input type="number" value={payrollForm.overtimePay} onChange={(e) => setPayrollForm({ ...payrollForm, overtimePay: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Bonus</Label><Input type="number" value={payrollForm.bonus} onChange={(e) => setPayrollForm({ ...payrollForm, bonus: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Deductions</Label><Input type="number" value={payrollForm.deductions} onChange={(e) => setPayrollForm({ ...payrollForm, deductions: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Tax</Label><Input type="number" value={payrollForm.taxAmount} onChange={(e) => setPayrollForm({ ...payrollForm, taxAmount: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Net Pay *</Label>
              <Input type="number" value={payrollForm.netPay} onChange={(e) => setPayrollForm({ ...payrollForm, netPay: e.target.value })} />
            </div>
            <Button onClick={handleAddPayrollRecord} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Wallet className="h-4 w-4 mr-2" /> Create Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}