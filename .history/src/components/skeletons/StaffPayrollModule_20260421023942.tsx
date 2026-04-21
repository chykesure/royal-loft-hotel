'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,   // ← ADD THIS
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Clock,
  DollarSign,
  UserPlus,
  Search,
  Eye,
  CalendarCheck,
  Banknote,
  Loader2,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ---- Types ----

interface StaffMember {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    role: string;
    isActive: boolean;
  };
  employeeId: string;
  department: string;
  position: string;
  baseSalary: number;
  status: string;
  startDate: string;
  todayAttendance: {
    status: string;
    clockIn: string | null;
    clockOut: string | null;
    hoursWorked: number | null;
  } | null;
  currentPayroll: {
    id: string;
    basicSalary: number;
    overtimePay: number;
    bonus: number;
    deductions: number;
    taxAmount: number;
    netPay: number;
    status: string;
    paidAt: string | null;
  } | null;
}

interface StaffSummary {
  totalStaff: number;
  presentToday: number;
  onLeave: number;
  totalActive: number;
  monthlyPayroll: number;
  monthlyPayrollFormatted: string;
}

interface DeptPayroll {
  department: string;
  count: number;
  totalSalary: number;
}

interface AddStaffForm {
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  baseSalary: string;
  employeeId: string;
  bankName: string;
  bankAccount: string;
  password: string;
}

// ---- Helpers ----

const DEPARTMENT_LABELS: Record<string, string> = {
  front_desk: 'Front Desk',
  housekeeping: 'Housekeeping',
  kitchen: 'Kitchen',
  security: 'Security',
  maintenance: 'Maintenance',
  management: 'Management',
  accounts: 'Accounts',
};

const DEPARTMENT_COLORS: Record<string, string> = {
  front_desk: 'bg-amber-100 text-amber-700',
  housekeeping: 'bg-teal-100 text-teal-700',
  kitchen: 'bg-orange-100 text-orange-700',
  security: 'bg-red-100 text-red-700',
  maintenance: 'bg-blue-100 text-blue-700',
  management: 'bg-violet-100 text-violet-700',
  accounts: 'bg-emerald-100 text-emerald-700',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-orange-100 text-orange-700',
  suspended: 'bg-red-100 text-red-700',
  terminated: 'bg-gray-100 text-gray-700',
};

const ATTENDANCE_BADGE: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  half_day: 'bg-yellow-100 text-yellow-700',
  on_leave: 'bg-orange-100 text-orange-700',
  holiday: 'bg-sky-100 text-sky-700',
};

const DEPT_ACCENT: Record<string, string> = {
  front_desk: 'bg-amber-500',
  housekeeping: 'bg-teal-500',
  kitchen: 'bg-orange-500',
  security: 'bg-red-500',
  maintenance: 'bg-blue-500',
  management: 'bg-violet-500',
  accounts: 'bg-emerald-500',
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'pos', label: 'POS' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'opay', label: 'OPay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'moniepoint', label: 'Moniepoint' },
];

const DEPARTMENTS = [
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'security', label: 'Security' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'management', label: 'Management' },
  { value: 'accounts', label: 'Accounts' },
];

const emptyForm: AddStaffForm = {
  name: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  baseSalary: '',
  employeeId: '',
  bankName: '',
  bankAccount: '',
  password: '',
};

function formatLabel(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ---- Component ----

export function StaffPayrollModule() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [summary, setSummary] = useState<StaffSummary | null>(null);
  const [payrollByDepartment, setPayrollByDepartment] = useState<DeptPayroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Add Staff dialog
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddStaffForm>(emptyForm);
  const [isAdding, setIsAdding] = useState(false);

  // Generate Payroll dialog
  const [generateOpen, setGenerateOpen] = useState(false);
  const [payrollDeductions, setPayrollDeductions] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Pay Salary dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<StaffMember | null>(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [isPaying, setIsPaying] = useState(false);

  // Attendance loading tracker
  const [attendanceLoading, setAttendanceLoading] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
        setSummary(data.summary || null);
        setPayrollByDepartment(data.payrollByDepartment || []);
      } else {
        toast.error('Failed to load staff data');
      }
    } catch {
      toast.error('Failed to load staff data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Handlers ----

  const openDetail = (member: StaffMember) => {
    setSelectedStaff(member);
    setDetailOpen(true);
  };

  const openPayDialog = (member: StaffMember) => {
    setPayTarget(member);
    setPayMethod('cash');
    setPayOpen(true);
  };

  // Add Staff
  const handleAddStaff = async () => {
    if (!addForm.name || !addForm.email || !addForm.department || !addForm.position || !addForm.baseSalary || !addForm.employeeId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${addForm.name} added successfully!`);
        setAddStaffOpen(false);
        setAddForm(emptyForm);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to add staff');
      }
    } catch {
      toast.error('Failed to add staff');
    } finally {
      setIsAdding(false);
    }
  };

  // Mark Attendance
  const handleAttendance = async (staffId: string, status: string) => {
    setAttendanceLoading((prev) => ({ ...prev, [staffId]: true }));
    try {
      const res = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, status }),
      });
      if (res.ok) {
        toast.success(`Marked as ${formatLabel(status)}`);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update attendance');
      }
    } catch {
      toast.error('Failed to update attendance');
    } finally {
      setAttendanceLoading((prev) => ({ ...prev, [staffId]: false }));
    }
  };

  // Mark all present
  const handleMarkAllPresent = async () => {
    const activeStaff = staff.filter((s) => s.status === 'active' && (!s.todayAttendance || s.todayAttendance.status !== 'present'));
    if (activeStaff.length === 0) {
      toast.info('All active staff are already marked present');
      return;
    }
    try {
      for (const s of activeStaff) {
        await fetch('/api/staff/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId: s.id, status: 'present' }),
        });
      }
      toast.success(`${activeStaff.length} staff marked present`);
      fetchData();
    } catch {
      toast.error('Failed to mark attendance');
    }
  };

  // Generate Payroll
  const handleGeneratePayroll = async () => {
    const activeStaff = staff.filter((s) => s.status === 'active');
    if (activeStaff.length === 0) {
      toast.error('No active staff to generate payroll for');
      return;
    }

    setIsGenerating(true);
    try {
      const staffList = activeStaff.map((s) => ({
        staffId: s.id,
        deductions: payrollDeductions[s.id] || '0',
      }));

      const res = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: getCurrentPeriod(), staffList }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Payroll generated for ${data.created} staff${data.skipped > 0 ? ` (${data.skipped} skipped)` : ''}`);
        setGenerateOpen(false);
        setPayrollDeductions({});
        fetchData();
      } else {
        toast.error(data.error || 'Failed to generate payroll');
      }
    } catch {
      toast.error('Failed to generate payroll');
    } finally {
      setIsGenerating(false);
    }
  };

  // Pay Salary
  const handlePaySalary = async () => {
    if (!payTarget?.currentPayroll) return;
    setIsPaying(true);
    try {
      const res = await fetch('/api/payroll/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollId: payTarget.currentPayroll.id, paymentMethod: payMethod }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Salary paid to ${payTarget.user.name} via ${formatLabel(payMethod)}`);
        setPayOpen(false);
        setPayTarget(null);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to process payment');
      }
    } catch {
      toast.error('Failed to process payment');
    } finally {
      setIsPaying(false);
    }
  };

  const filteredStaff = search.trim()
    ? staff.filter(
        (s) =>
          s.user.name.toLowerCase().includes(search.toLowerCase()) ||
          s.position.toLowerCase().includes(search.toLowerCase()) ||
          s.employeeId.toLowerCase().includes(search.toLowerCase()) ||
          (DEPARTMENT_LABELS[s.department] || s.department)
            .toLowerCase()
            .includes(search.toLowerCase())
      )
    : staff;

  const totalDeptSalary = payrollByDepartment.reduce((s, d) => s + d.totalSalary, 0);

  // ---- Skeletons ----

  const SummarySkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-10" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const StaffListSkeleton = () => (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-24" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const PayrollSkeleton = () => (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <Skeleton className="h-5 w-56" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // ---- Render ----

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Summary Cards */}
      {isLoading ? (
        <SummarySkeletons />
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2.5">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Staff</p>
                <p className="text-xl font-bold">{summary.totalStaff}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Present Today</p>
                <p className="text-xl font-bold text-emerald-600">
                  {summary.presentToday}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2.5">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">On Leave</p>
                <p className="text-xl font-bold text-orange-600">
                  {summary.onLeave}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2.5">
                <DollarSign className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Payroll</p>
                <p className="text-xl font-bold">
                  {summary.monthlyPayrollFormatted}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Staff Directory */}
        {isLoading ? (
          <StaffListSkeleton />
        ) : (
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Staff Directory</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-44 pl-8 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={handleMarkAllPresent}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> All Present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    setPayrollDeductions({});
                    setGenerateOpen(true);
                  }}
                >
                  <CalendarCheck className="h-3.5 w-3.5 mr-1" /> Generate Payroll
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white h-8"
                  onClick={() => {
                    setAddForm(emptyForm);
                    setAddStaffOpen(true);
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Staff
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filteredStaff.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {staff.length === 0 ? 'No staff members yet' : 'No staff match your search'}
                    </p>
                    {staff.length === 0 && (
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => {
                          setAddForm(emptyForm);
                          setAddStaffOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-1" /> Create Staff Profile
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredStaff.map((member) => {
                    const initials = member.user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2);
                    const attStatus = member.todayAttendance?.status || 'absent';
                    const deptColor =
                      DEPT_ACCENT[member.department] || 'bg-gray-500';
                    const isLoadingAtt = attendanceLoading[member.id];

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={() => openDetail(member)}
                        >
                          {member.user.avatar ? (
                            <img
                              src={member.user.avatar}
                              alt={member.user.name}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={`h-9 w-9 rounded-full ${deptColor} flex items-center justify-center text-white text-xs font-semibold shrink-0`}
                            >
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.position} &middot;{' '}
                              {DEPARTMENT_LABELS[member.department] ||
                                member.department}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {/* Attendance P / L buttons */}
                          {member.status === 'active' && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant={attStatus === 'present' ? 'default' : 'outline'}
                                className={`h-6 w-6 p-0 text-xs ${
                                  attStatus === 'present'
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                    : 'text-emerald-600 border-emerald-300'
                                }`}
                                disabled={isLoadingAtt}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttendance(member.id, 'present');
                                }}
                              >
                                {isLoadingAtt ? <Loader2 className="h-3 w-3 animate-spin" /> : 'P'}
                              </Button>
                              <Button
                                size="sm"
                                variant={attStatus === 'on_leave' ? 'default' : 'outline'}
                                className={`h-6 w-6 p-0 text-xs ${
                                  attStatus === 'on_leave'
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                    : 'text-orange-600 border-orange-300'
                                }`}
                                disabled={isLoadingAtt}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttendance(member.id, 'on_leave');
                                }}
                              >
                                L
                              </Button>
                            </div>
                          )}

                          {/* Attendance badge */}
                          <Badge
                            className={`text-[10px] px-2 py-0.5 h-5 border-0 ${
                              ATTENDANCE_BADGE[attStatus] || ''
                            }`}
                          >
                            {formatLabel(attStatus)}
                          </Badge>

                          {/* Status badge */}
                          <Badge
                            className={`text-[10px] px-2 py-0.5 h-5 border-0 ${
                              STATUS_BADGE[member.status] || ''
                            }`}
                          >
                            {formatLabel(member.status)}
                          </Badge>

                          {/* View detail */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => openDetail(member)}
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payroll Summary by Department */}
        {isLoading ? (
          <PayrollSkeleton />
        ) : (
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Payroll Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payrollByDepartment.map((dept) => {
                  const pct =
                    totalDeptSalary > 0
                      ? (dept.totalSalary / totalDeptSalary) * 100
                      : 0;
                  return (
                    <div
                      key={dept.department}
                      className="p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              DEPT_ACCENT[dept.department] || 'bg-gray-400'
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {DEPARTMENT_LABELS[dept.department] ||
                                dept.department}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {dept.count} staff
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatCurrency(dept.totalSalary)}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            DEPT_ACCENT[dept.department] || 'bg-gray-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Total row */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div>
                    <p className="text-sm font-bold text-amber-800">Total</p>
                    <p className="text-xs text-amber-600">
                      {summary?.totalActive ?? 0} active staff
                    </p>
                  </div>
                  <span className="text-sm font-bold text-amber-800">
                    {formatCurrency(totalDeptSalary)}
                  </span>
                </div>
              </div>

              {/* Payroll Status Breakdown */}
              {summary && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {
                        staff.filter(
                          (s) =>
                            s.currentPayroll &&
                            s.currentPayroll.status === 'paid'
                        ).length
                      }{' '}
                      of {summary.totalStaff}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-sm font-semibold text-orange-600">
                      {
                        staff.filter(
                          (s) =>
                            s.currentPayroll &&
                            s.currentPayroll.status === 'pending'
                        ).length
                      }{' '}
                      of {summary.totalStaff}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── ADD STAFF DIALOG ─── */}
      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-500" />
              Add New Staff
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Full Name *</Label>
              <Input
                placeholder="e.g. John Doe"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email *</Label>
              <Input
                type="email"
                placeholder="staff@royalloft.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input
                placeholder="08012345678"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Employee ID *</Label>
              <Input
                placeholder="e.g. RL-001"
                value={addForm.employeeId}
                onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Department *</Label>
              <Select
                value={addForm.department}
                onValueChange={(val) => setAddForm({ ...addForm, department: val })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Position *</Label>
              <Input
                placeholder="e.g. Receptionist"
                value={addForm.position}
                onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Base Salary (₦) *</Label>
              <Input
                type="number"
                placeholder="e.g. 150000"
                value={addForm.baseSalary}
                onChange={(e) => setAddForm({ ...addForm, baseSalary: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bank Name</Label>
              <Input
                placeholder="e.g. GTBank"
                value={addForm.bankName}
                onChange={(e) => setAddForm({ ...addForm, bankName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bank Account</Label>
              <Input
                placeholder="Account number"
                value={addForm.bankAccount}
                onChange={(e) => setAddForm({ ...addForm, bankAccount: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Password</Label>
              <Input
                type="password"
                placeholder="Default: RoyalLoft@123"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setAddStaffOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleAddStaff}
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" /> Add Staff
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── GENERATE PAYROLL DIALOG ─── */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-violet-500" />
              Generate Payroll — {getCurrentPeriod()}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Set deductions per staff member. Base salary will be used for net pay calculation.
          </p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {staff
              .filter((s) => s.status === 'active')
              .map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`h-7 w-7 rounded-full ${
                        DEPT_ACCENT[member.department] || 'bg-gray-500'
                      } flex items-center justify-center text-white text-[10px] font-semibold shrink-0`}
                    >
                      {member.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Base: {formatCurrency(member.baseSalary)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Deductions (₦)</span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={payrollDeductions[member.id] || ''}
                      onChange={(e) =>
                        setPayrollDeductions({
                          ...payrollDeductions,
                          [member.id]: e.target.value,
                        })
                      }
                      className="h-8 w-24 text-xs text-right"
                    />
                  </div>
                </div>
              ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-violet-500 hover:bg-violet-600 text-white"
              onClick={handleGeneratePayroll}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <CalendarCheck className="h-4 w-4 mr-1" /> Generate Payroll
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PAY SALARY DIALOG ─── */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-500" />
              Pay Salary
            </DialogTitle>
          </DialogHeader>
          {payTarget && payTarget.currentPayroll && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium">{payTarget.user.name}</p>
                <p className="text-xs text-muted-foreground">{payTarget.position} &middot; {DEPARTMENT_LABELS[payTarget.department]}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Basic Salary</p>
                  <p className="font-medium">{formatCurrency(payTarget.currentPayroll.basicSalary)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deductions</p>
                  <p className="font-medium text-red-500">
                    -{formatCurrency(payTarget.currentPayroll.deductions)}
                  </p>
                </div>
                <div className="col-span-2 border-t pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Net Pay</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {formatCurrency(payTarget.currentPayroll.netPay)}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Payment Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handlePaySalary}
              disabled={isPaying || !payTarget?.currentPayroll || payTarget.currentPayroll.status === 'paid'}
            >
              {isPaying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...
                </>
              ) : payTarget?.currentPayroll?.status === 'paid' ? (
                'Already Paid'
              ) : (
                <>
                  <Banknote className="h-4 w-4 mr-1" /> Pay {formatCurrency(payTarget?.currentPayroll?.netPay)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── STAFF DETAIL DIALOG ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedStaff && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full ${
                      DEPT_ACCENT[selectedStaff.department] || 'bg-gray-500'
                    } flex items-center justify-center text-white text-sm font-semibold`}
                  >
                    {selectedStaff.user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p>{selectedStaff.user.name}</p>
                    <p className="text-sm font-normal text-muted-foreground">
                      {selectedStaff.employeeId}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <Badge
                      className={`mt-1 text-[10px] px-2 py-0.5 h-5 border-0 ${
                        DEPARTMENT_COLORS[selectedStaff.department] || ''
                      }`}
                    >
                      {DEPARTMENT_LABELS[selectedStaff.department] ||
                        selectedStaff.department}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Position</p>
                    <p className="font-medium mt-0.5">
                      {selectedStaff.position}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium mt-0.5 truncate">
                      {selectedStaff.user.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium mt-0.5">
                      {selectedStaff.user.phone || '\u2014'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge
                      className={`mt-1 text-[10px] px-2 py-0.5 h-5 border-0 ${
                        STATUS_BADGE[selectedStaff.status] || ''
                      }`}
                    >
                      {formatLabel(selectedStaff.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Base Salary</p>
                    <p className="font-medium mt-0.5">
                      {formatCurrency(selectedStaff.baseSalary)}
                    </p>
                  </div>
                </div>

                {/* Today's Attendance */}
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Today&apos;s Attendance
                  </p>
                  {selectedStaff.todayAttendance ? (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[10px] px-2 py-0.5 h-5 border-0 ${
                              ATTENDANCE_BADGE[
                                selectedStaff.todayAttendance.status
                              ] || ''
                            }`}
                          >
                            {formatLabel(selectedStaff.todayAttendance.status)}
                          </Badge>
                          {selectedStaff.todayAttendance.hoursWorked && (
                            <span className="text-xs text-muted-foreground">
                              {selectedStaff.todayAttendance.hoursWorked} hrs
                            </span>
                          )}
                        </div>
                        {selectedStaff.todayAttendance.clockIn && (
                          <p className="text-xs text-muted-foreground">
                            In:{' '}
                            {new Date(
                              selectedStaff.todayAttendance.clockIn
                            ).toLocaleTimeString('en-NG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {selectedStaff.todayAttendance.clockOut &&
                              ` \u2014 Out: ${new Date(
                                selectedStaff.todayAttendance.clockOut
                              ).toLocaleTimeString('en-NG', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`}
                          </p>
                        )}
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No attendance recorded today
                    </p>
                  )}
                </div>

                {/* Payroll Details */}
                {selectedStaff.currentPayroll && (
                  <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-violet-700">
                        This Month&apos;s Payroll
                      </p>
                      <Badge
                        className={`text-[10px] px-2 py-0.5 h-5 border-0 ${
                          selectedStaff.currentPayroll.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {formatLabel(selectedStaff.currentPayroll.status)}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Basic</span>
                        <span>
                          {formatCurrency(
                            selectedStaff.currentPayroll.basicSalary
                          )}
                        </span>
                      </div>
                      {selectedStaff.currentPayroll.overtimePay > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Overtime</span>
                          <span className="text-emerald-600">
                            +
                            {formatCurrency(
                              selectedStaff.currentPayroll.overtimePay
                            )}
                          </span>
                        </div>
                      )}
                      {selectedStaff.currentPayroll.bonus > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bonus</span>
                          <span className="text-emerald-600">
                            +{formatCurrency(selectedStaff.currentPayroll.bonus)}
                          </span>
                        </div>
                      )}
                      {selectedStaff.currentPayroll.deductions > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Deductions</span>
                          <span className="text-red-500">
                            -{formatCurrency(
                              selectedStaff.currentPayroll.deductions
                            )}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-violet-200 pt-1 mt-1 flex justify-between font-semibold">
                        <span>Net Pay</span>
                        <span>
                          {formatCurrency(selectedStaff.currentPayroll.netPay)}
                        </span>
                      </div>
                    </div>
                    {/* Pay button or status */}
                    <div className="mt-3">
                      {selectedStaff.currentPayroll.status === 'pending' ? (
                        <Button
                          size="sm"
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => {
                            openPayDialog(selectedStaff);
                            setDetailOpen(false);
                          }}
                        >
                          <Banknote className="h-4 w-4 mr-1" /> Pay Salary
                        </Button>
                      ) : selectedStaff.currentPayroll.status === 'paid' ? (
                        <div className="flex items-center justify-center gap-1 text-xs text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Paid{selectedStaff.currentPayroll.paidAt
                            ? ` on ${new Date(selectedStaff.currentPayroll.paidAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`
                            : ''}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* No payroll yet */}
                {!selectedStaff.currentPayroll && (
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground">
                      No payroll generated for this month yet.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs"
                      onClick={() => {
                        setGenerateOpen(true);
                        setDetailOpen(false);
                      }}
                    >
                      <CalendarCheck className="h-3.5 w-3.5 mr-1" /> Generate Payroll
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}