'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Clock,
  DollarSign,
  UserPlus,
  Edit3,
  Trash2,
  Loader2,
  Search,
  Building2,
  Phone,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';

// ---- Types ----
interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar: string | null;
  isActive: boolean;
}

interface StaffProfile {
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

interface Summary {
  totalStaff: number;
  presentToday: number;
  onLeave: number;
  monthlyPayroll: number;
}

interface Department {
  department: string;
  label: string;
  staffCount: number;
  totalSalary: number;
}

interface StaffData {
  staff: StaffProfile[];
  summary: Summary;
  departments: Department[];
}

// ---- Constants ----
const DEPARTMENT_LABELS: Record<string, string> = {
  front_desk: 'Front Desk',
  housekeeping: 'Housekeeping',
  kitchen: 'Kitchen',
  security: 'Security',
  maintenance: 'Maintenance',
  management: 'Management',
  accounts: 'Accounts',
};

const DEPARTMENTS = [
  'front_desk',
  'housekeeping',
  'kitchen',
  'security',
  'maintenance',
  'management',
  'accounts',
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_leave: 'bg-orange-100 text-orange-700',
  suspended: 'bg-red-100 text-red-700',
  terminated: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  suspended: 'Suspended',
  terminated: 'Terminated',
};

function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  department: '',
  position: '',
  baseSalary: '',
  bankName: '',
  bankAccount: '',
  emergencyContact: '',
  emergencyPhone: '',
  role: 'staff',
};

export function StaffPayrollModule() {
  const [data, setData] = useState<StaffData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/staff');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Failed to load staff data');
      }
    } catch {
      toast.error('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ---- Filter logic ----
  const filteredStaff = data?.staff.filter((s) => {
    const matchSearch =
      !searchQuery ||
      s.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept =
      filterDept === 'all' || s.department === filterDept;
    return matchSearch && matchDept;
  }) ?? [];

  // ---- Open Add Dialog ----
  const openAddDialog = () => {
    setEditingStaff(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  // ---- Open Edit Dialog ----
  const openEditDialog = (staff: StaffProfile) => {
    setEditingStaff(staff);
    setForm({
      name: staff.user.name,
      email: staff.user.email,
      password: '',
      phone: staff.user.phone || '',
      department: staff.department,
      position: staff.position,
      baseSalary: String(staff.baseSalary),
      bankName: staff.bankName || '',
      bankAccount: staff.bankAccount || '',
      emergencyContact: staff.emergencyContact || '',
      emergencyPhone: staff.emergencyPhone || '',
      role: staff.user.role,
    });
    setDialogOpen(true);
  };

  // ---- Submit (Create or Update) ----
  const handleSubmit = async () => {
    // Validate
    if (!form.name || !form.email || !form.department || !form.position || !form.baseSalary) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!editingStaff && !form.password) {
      toast.error('Password is required for new staff');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        // Update existing
        const updateData: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          department: form.department,
          position: form.position,
          baseSalary: parseFloat(form.baseSalary),
          bankName: form.bankName || null,
          bankAccount: form.bankAccount || null,
          emergencyContact: form.emergencyContact || null,
          emergencyPhone: form.emergencyPhone || null,
          role: form.role,
        };

        const res = await fetch(`/api/staff?id=${editingStaff.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (res.ok) {
          toast.success('Staff member updated successfully');
          setDialogOpen(false);
          fetchStaff();
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to update staff member');
        }
      } else {
        // Create new
        const res = await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });

        if (res.ok) {
          toast.success('Staff member added successfully');
          setDialogOpen(false);
          setForm(emptyForm);
          fetchStaff();
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to add staff member');
        }
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Delete (Archive) ----
  const confirmDelete = (staff: StaffProfile) => {
    setDeleteTarget(staff);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/staff?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`${deleteTarget.user.name} has been archived`);
        setDeleteOpen(false);
        setDeleteTarget(null);
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to archive staff member');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- Loading State ----
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Main content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const summary = data?.summary ?? { totalStaff: 0, presentToday: 0, onLeave: 0, monthlyPayroll: 0 };
  const departments = data?.departments ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Staff &amp; Payroll</h2>
          <p className="text-sm text-muted-foreground">Manage staff members and payroll information</p>
        </div>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={openAddDialog}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-xl font-bold text-emerald-600">{summary.presentToday}</p>
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
              <p className="text-xl font-bold text-orange-600">{summary.onLeave}</p>
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
              <p className="text-lg font-bold">{formatNaira(summary.monthlyPayroll)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main 2-column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Staff Directory */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff Directory
            </CardTitle>
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-8 text-sm w-full sm:w-36">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DEPARTMENT_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No staff found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data?.staff.length === 0
                    ? 'Add your first staff member to get started.'
                    : 'Try adjusting your search or filter.'}
                </p>
                {data?.staff.length === 0 && (
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white mt-3"
                    onClick={openAddDialog}
                  >
                    <UserPlus className="h-4 w-4 mr-1" /> Add Staff
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-semibold shrink-0">
                        {getInitials(staff.user.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{staff.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {staff.position} &middot; {DEPARTMENT_LABELS[staff.department] || staff.department}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{staff.employeeId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        className={`text-[10px] px-2 py-0.5 h-5 ${STATUS_COLORS[staff.status] || ''}`}
                      >
                        {STATUS_LABELS[staff.status] || staff.status}
                      </Badge>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => openEditDialog(staff)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          onClick={() => confirmDelete(staff)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Payroll Summary */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payroll Summary
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Monthly breakdown by department (active staff only)
            </p>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No payroll data</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add active staff to see department payroll breakdown.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {departments.map((dept) => (
                  <div
                    key={dept.department}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{dept.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {dept.staffCount} staff member{dept.staffCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {formatNaira(dept.totalSalary)}
                    </span>
                  </div>
                ))}
                {/* Total */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200 mt-2">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Total Monthly Payroll</p>
                    <p className="text-xs text-amber-600">
                      {summary.totalStaff} staff member{summary.totalStaff !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-base font-bold text-amber-700">
                    {formatNaira(summary.monthlyPayroll)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Add/Edit Staff Dialog ---- */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingStaff(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="e.g., John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="email@royalloft.com"
                    className="pl-9"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    readOnly={!!editingStaff}
                  />
                </div>
              </div>
            </div>

            {/* Password (new only) */}
            {!editingStaff && (
              <div className="grid gap-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            )}

            {/* Phone & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="+234 xxx xxx xxxx"
                    className="pl-9"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="front_desk">Front Desk</SelectItem>
                    <SelectItem value="housekeeping">Housekeeping</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Department & Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Department *</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm({ ...form, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {DEPARTMENT_LABELS[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Position *</Label>
                <Input
                  placeholder="e.g., Front Desk Agent"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>
            </div>

            {/* Base Salary */}
            <div className="grid gap-2">
              <Label>Base Salary (Monthly) *</Label>
              <Input
                type="number"
                placeholder="e.g., 150000"
                value={form.baseSalary}
                onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
              />
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Bank Details */}
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bank Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Bank Name</Label>
                <Input
                  placeholder="e.g., GTBank"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Account Number</Label>
                <Input
                  placeholder="e.g., 0123456789"
                  value={form.bankAccount}
                  onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2">Emergency Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Contact Name</Label>
                <Input
                  placeholder="e.g., Jane Doe"
                  value={form.emergencyContact}
                  onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Contact Phone</Label>
                <Input
                  placeholder="+234 xxx xxx xxxx"
                  value={form.emergencyPhone}
                  onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingStaff(null);
                setForm(emptyForm);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingStaff ? 'Updating...' : 'Creating...'}
                </>
              ) : editingStaff ? (
                'Update Staff'
              ) : (
                'Add Staff'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.user.name}
              </span>
              ({deleteTarget?.employeeId})? They will be marked as terminated and
              their account will be deactivated. This action can be reversed by an
              administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                'Archive Staff'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
