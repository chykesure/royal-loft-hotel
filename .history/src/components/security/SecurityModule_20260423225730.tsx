'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Search, Plus, RefreshCw, Shield, CheckCircle, AlertTriangle, Users,
  FileText, Pencil, Trash2, Save, KeyRound, Lock, Eye, RotateCcw, Code,
  Database, HardDrive, Upload, Download, Clock,
} from 'lucide-react';
import { formatDateTime } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { useRoleAccessStore, CONFIGURABLE_ROLES, ALL_MODULE_KEYS, type ConfigurableRole, type ModuleKey } from '@/store/role-access-store';
import { toast } from 'sonner';

interface User {
  id: string; email: string; name: string; phone?: string | null;
  role: string; department?: string | null; isActive: boolean;
  lastLogin?: string | null; createdAt: string;
  _count?: { auditLogs: number };
}

interface AuditLog {
  id: string; userId?: string | null; userName?: string | null;
  action: string; module: string; recordId?: string | null;
  details?: string | null; ipAddress?: string | null;
  status: string; createdAt: string;
}

interface SecurityAlert {
  id: string; type: string; severity: string;
  userId?: string | null; ipAddress?: string | null;
  details?: string | null; isResolved: boolean;
  resolvedAt?: string | null; createdAt: string;
}

interface RoleWithPerms {
  id: string;
  name: string;
  description?: string | null;
  permissions: { permissionId: string; permission: { id: string; module: string; action: string } }[];
}

interface BackupRecord {
  id: string;
  filename: string;
  type: string;
  status: string;
  size: number;
  recordCount: number;
  storagePath?: string | null;
  createdAt: string;
}

const roleColors: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  developer: 'bg-orange-100 text-orange-700',
  manager: 'bg-purple-100 text-purple-700',
  front_desk: 'bg-sky-100 text-sky-700',
  housekeeping: 'bg-teal-100 text-teal-700',
  accountant: 'bg-emerald-100 text-emerald-700',
  auditor: 'bg-amber-100 text-amber-700',
  staff: 'bg-gray-100 text-gray-700',
};

const severityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  front_desk: 'Front Desk',
  reservations: 'Reservations',
  rooms: 'Rooms',
  guests: 'Guests',
  billing: 'Billing',
  invoices: 'Invoices',           // FIX #2: was missing
  expenses: 'Expenses',
  accounts: 'Accounts',
  staff: 'Staff & Payroll',
  inventory: 'Inventory',
  reports: 'Reports',
  rules: 'Hotel Rules',
  security: 'Security',
  cloud: 'Cloud Storage',
  settings: 'Settings',
  developer_tools: 'Dev Tools',
};

// FIX #1: added 'invoices' — was missing
const ALL_MODULES = [
  'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
  'billing', 'invoices', 'expenses', 'accounts', 'staff', 'inventory', 'reports',
  'rules', 'security', 'cloud', 'settings', 'developer_tools',
];

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete'];

const ACTION_LABELS: Record<string, string> = {
  view: 'V',
  create: 'C',
  edit: 'E',
  delete: 'D',
};

type PermState = Record<string, Record<string, Record<string, boolean>>>;

const ROLE_OPTIONS = ['super_admin', 'developer', 'manager', 'front_desk', 'housekeeping', 'accountant', 'auditor', 'staff'];

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function SecurityModule() {
  const { user } = useAuthStore();
  const canManageUsers = user?.role === 'super_admin' || user?.role === 'developer';
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', role: 'staff', department: '',
  });
  const [editForm, setEditForm] = useState({
    id: '', name: '', email: '', phone: '', role: '', department: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const [permRoles, setPermRoles] = useState<RoleWithPerms[]>([]);
  const [permState, setPermState] = useState<PermState>({});
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupCreating, setBackupCreating] = useState(false);
  const [autoBackupStatus, setAutoBackupStatus] = useState<{ enabled: boolean; lastBackup: string | null; nextBackup: string | null } | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<BackupRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersRes, logsRes, alertsRes] = await Promise.all([
        fetch('/api/security?section=users'),
        fetch('/api/security?section=audit-log&limit=50'),
        fetch('/api/security?section=alerts'),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
    } catch {
      toast.error('Failed to load security data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchBackups = useCallback(async () => {
    try {
      setBackupLoading(true);
      const res = await fetch('/api/backup');
      if (res.ok) {
        const data = await res.json();
        setBackups(Array.isArray(data) ? data : data.backups || []);
      }
    } catch {
      toast.error('Failed to load backups');
    } finally {
      setBackupLoading(false);
    }
  }, []);

  const fetchAutoBackupStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/backup?status=auto');
      if (res.ok) {
        const data = await res.json();
        setAutoBackupStatus(data);
      }
    } catch {
      // silent
    }
  }, []);

  const handleCreateBackup = async () => {
    try {
      setBackupCreating(true);
      toast.info('Creating backup...');
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-manual' }),
      });
      if (res.ok) {
        toast.success('Backup created successfully');
        fetchBackups();
        fetchAutoBackupStatus();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create backup');
      }
    } catch {
      toast.error('Failed to create backup');
    } finally {
      setBackupCreating(false);
    }
  };

  const handleDownloadBackup = async (backup: BackupRecord) => {
    try {
      const res = await fetch(`/api/backup?id=${backup.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = backup.filename || `backup-${backup.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Backup downloaded');
      } else {
        toast.error('Failed to download backup');
      }
    } catch {
      toast.error('Failed to download backup');
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      const res = await fetch('/api/backup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: backupId }),
      });
      if (res.ok) {
        toast.success('Backup deleted');
        fetchBackups();
      } else {
        toast.error('Failed to delete backup');
      }
    } catch {
      toast.error('Failed to delete backup');
    }
  };

  const handleRestoreBackup = async (backup: BackupRecord) => {
    try {
      toast.info('Restoring backup... This may take a moment.');
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backupId: backup.id }),
      });
      if (res.ok) {
        toast.success('Backup restored successfully! Please refresh the page.');
        fetchData();
        fetchBackups();
        setRestoreConfirm(null);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to restore backup');
      }
    } catch {
      toast.error('Failed to restore backup');
    }
  };

  const handleUploadRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.info('Uploading and restoring backup...');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/backup', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        toast.success('Backup restored from uploaded file! Please refresh the page.');
        fetchData();
        fetchBackups();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to restore from upload');
      }
    } catch {
      toast.error('Failed to restore from upload');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchPermissions = useCallback(async () => {
    try {
      setPermLoading(true);
      await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init-roles' }),
      });

      const res = await fetch('/api/security?section=permission-matrix');
      if (res.ok) {
        const data = await res.json();
        setPermRoles(data.roles);
        const state: PermState = {};
        for (const role of data.roles) {
          state[role.id] = {};
          for (const mod of ALL_MODULES) {
            state[role.id][mod] = {};
            for (const act of ALL_ACTIONS) {
              state[role.id][mod][act] = role.permissions.some(
                (rp: { permission: { module: string; action: string } }) =>
                  rp.permission.module === mod && rp.permission.action === act
              );
            }
          }
          if (role.name === 'Super Admin') {
            for (const mod of ALL_MODULES) {
              for (const act of ALL_ACTIONS) {
                state[role.id][mod][act] = true;
              }
            }
          }
        }
        setPermState(state);
      }
    } catch {
      toast.error('Failed to load permissions');
    } finally {
      setPermLoading(false);
    }
  }, []);

  const handleCreateUser = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Name, email, and password are required');
      return;
    }
    try {
      const res = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-user', ...form }),
      });
      if (res.ok) {
        toast.success('User created successfully');
        setCreateDialogOpen(false);
        setForm({ name: '', email: '', password: '', phone: '', role: 'staff', department: '' });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create user');
      }
    } catch {
      toast.error('Failed to create user');
    }
  };

  const handleEditUser = (user: User) => {
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      department: user.department || '',
    });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.email) {
      toast.error('Name and email are required');
      return;
    }
    try {
      const res = await fetch('/api/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editForm.id,
          action: 'update-user',
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          role: editForm.role,
          department: editForm.department,
        }),
      });
      if (res.ok) {
        toast.success('User updated successfully');
        setEditDialogOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update user');
      }
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('All password fields are required to change password');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      const res = await fetch('/api/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editForm.id,
          action: 'change-password',
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (res.ok) {
        toast.success('Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to change password');
      }
    } catch {
      toast.error('Failed to change password');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch('/api/security', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingUser.id, action: 'delete-user' }),
      });
      if (res.ok) {
        toast.success('User deleted successfully');
        setDeletingUser(null);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete user');
      }
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleToggleUser = async (user: User) => {
    try {
      const res = await fetch('/api/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, action: 'update-user', isActive: !user.isActive }),
      });
      if (res.ok) {
        toast.success(`User ${!user.isActive ? 'enabled' : 'disabled'}`);
        fetchData();
      }
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId, action: 'resolve-alert' }),
      });
      if (res.ok) {
        toast.success('Alert resolved');
        fetchData();
      }
    } catch {
      toast.error('Failed to resolve alert');
    }
  };

  const handlePermToggle = (roleId: string, module: string, action: string) => {
    const role = permRoles.find(r => r.id === roleId);
    if (role?.name === 'Super Admin') return;

    setPermState(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [module]: {
          ...prev[roleId][module],
          [action]: !prev[roleId][module][action],
        },
      },
    }));
  };

  const handleSavePermissions = async () => {
    try {
      setPermSaving(true);
      for (const role of permRoles) {
        if (role.name === 'Super Admin') continue;

        const modulePermissions: { module: string; actions: string[] }[] = [];
        for (const mod of ALL_MODULES) {
          const actions: string[] = [];
          for (const act of ALL_ACTIONS) {
            if (permState[role.id]?.[mod]?.[act]) {
              actions.push(act);
            }
          }
          if (actions.length > 0) {
            modulePermissions.push({ module: mod, actions });
          }
        }

        const res = await fetch('/api/security', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save-permissions',
            roleId: role.id,
            modulePermissions,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || 'Failed to save permissions');
          return;
        }
      }
      toast.success('Permissions saved successfully');
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setPermSaving(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const unresolvedAlerts = alerts.filter((a) => !a.isResolved);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Tabs defaultValue="users">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" /> Users</TabsTrigger>
          <TabsTrigger value="audit"><FileText className="h-4 w-4 mr-1.5" /> Audit Log</TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-1.5" /> Alerts
            {unresolvedAlerts.length > 0 && (
              <Badge className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 h-4">{unresolvedAlerts.length}</Badge>
            )}
          </TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="permissions"><Shield className="h-4 w-4 mr-1.5" /> Permissions</TabsTrigger>
          )}
          {canManageUsers && (
            <TabsTrigger value="module-access"><Eye className="h-4 w-4 mr-1.5" /> Module Access</TabsTrigger>
          )}
          {canManageUsers && (
            <TabsTrigger value="backup"><Database className="h-4 w-4 mr-1.5" /> Backup</TabsTrigger>
          )}
        </TabsList>

        {/* ==================== USERS TAB ==================== */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
              {canManageUsers && (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"><Plus className="h-4 w-4 mr-1" /> Add User</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-2">
                      <div className="grid gap-2"><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                      <div className="grid gap-2"><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Role</Label>
                          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map(r => (
                                <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                      </div>
                      <div className="grid gap-2"><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                      <Button onClick={handleCreateUser} className="bg-amber-500 hover:bg-amber-600 text-white">Create User</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden sm:table-cell">Role</TableHead>
                      <TableHead className="hidden md:table-cell">Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={`text-[10px] px-2 py-0.5 h-5 ${roleColors[user.role] || ''}`}>
                            {user.role.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5 h-5">
                            {user.isActive ? 'Active' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {canManageUsers && (
                            <Switch checked={user.isActive} onCheckedChange={() => handleToggleUser(user)} />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {canManageUsers && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                onClick={() => handleEditUser(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {user.role !== 'developer' && (
                                <AlertDialog open={deletingUser?.id === user.id} onOpenChange={(open) => { if (!open) setDeletingUser(null); else setDeletingUser(user); }}>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete <span className="font-semibold">{user.name}</span>? This action cannot be undone. All associated data including sessions, staff profile, and audit logs references will be removed.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={handleDeleteUser}
                                        className="bg-red-500 hover:bg-red-600 text-white"
                                      >
                                        Delete User
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                          </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== EDIT USER DIALOG ==================== */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-4 w-4" /> Edit User
              </DialogTitle>
              <DialogDescription>
                Update user details. Leave the password section empty to keep the current password unchanged.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Full Name *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Email *</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(r => (
                        <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Department</Label>
                <Input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  Change Password
                </div>
                <p className="text-xs text-muted-foreground">Leave all fields empty to keep the current password unchanged.</p>
                <div className="grid gap-2">
                  <Label className="text-xs">Current Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label className="text-xs">New Password</Label>
                    <Input
                      type="password"
                      placeholder="New password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Confirm Password</Label>
                    <Input
                      type="password"
                      placeholder="Confirm new"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                {(passwordForm.currentPassword || passwordForm.newPassword || passwordForm.confirmPassword) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={handleChangePassword}
                  >
                    <Lock className="h-3.5 w-3.5 mr-1.5" /> Update Password
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} className="bg-amber-500 hover:bg-amber-600 text-white">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== AUDIT LOG TAB ==================== */}
        <TabsContent value="audit" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Audit Log</CardTitle>
                <Button size="sm" variant="outline" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                      <div className={`mt-0.5 rounded-full p-1 ${log.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {log.status === 'success'
                          ? <CheckCircle className="h-3 w-3 text-emerald-600" />
                          : <AlertTriangle className="h-3 w-3 text-red-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.userName || 'System'}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{log.action}</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{log.module}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {log.details
                            ? (() => { try { return JSON.parse(log.details).action || log.details.slice(0, 100); } catch { return log.details.slice(0, 100); } })()
                            : ''
                          }
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                    </div>
                  ))}
                  {auditLogs.length === 0 && <p className="text-center text-muted-foreground py-4">No audit logs found</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== ALERTS TAB ==================== */}
        <TabsContent value="alerts" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Security Alerts</CardTitle>
                <Button size="sm" variant="outline" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${alert.isResolved ? 'bg-muted/20 opacity-60' : 'bg-red-50/50'}`}>
                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${alert.isResolved ? 'text-gray-400' : 'text-red-500'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-[10px] px-2 py-0.5 h-5 ${severityColors[alert.severity]}`}>{alert.severity}</Badge>
                          <span className="text-sm font-medium">{alert.type.replace(/_/g, ' ')}</span>
                          {alert.userId && <span className="text-xs text-muted-foreground">(User ID: {alert.userId.slice(0, 8)}...)</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.details}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(alert.createdAt)}</p>
                      </div>
                      {!alert.isResolved && (
                        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => handleResolveAlert(alert.id)}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  ))}
                  {alerts.length === 0 && <p className="text-center text-muted-foreground py-4">No security alerts</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== PERMISSIONS TAB ==================== */}
        <TabsContent value="permissions" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600" />
                Role Permission Matrix
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure module-level access for each role. Super Admin has full access and cannot be modified.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchPermissions}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleSavePermissions}
                disabled={permSaving}
              >
                <Save className="h-4 w-4 mr-1.5" />
                {permSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {permLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">Role</TableHead>
                        {ALL_MODULES.map(mod => (
                          <TableHead key={mod} className="min-w-[120px] text-center">
                            <span className="text-[10px] font-medium uppercase tracking-wider">
                              {MODULE_LABELS[mod] || mod}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permRoles.map((role) => {
                        const isSuperAdmin = role.name === 'Super Admin';
                        return (
                          <TableRow key={role.id} className={isSuperAdmin ? 'bg-amber-50/50' : ''}>
                            <TableCell className="sticky left-0 bg-background z-10">
                              <div className="flex items-center gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${isSuperAdmin ? 'bg-amber-500' : 'bg-gray-300'}`} />
                                <div>
                                  <p className="font-medium text-sm">{role.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{role.description || ''}</p>
                                </div>
                              </div>
                            </TableCell>
                            {ALL_MODULES.map(mod => (
                              <TableCell key={mod} className="text-center p-1">
                                <div className="flex items-center justify-center gap-1">
                                  {ALL_ACTIONS.map(act => (
                                    <div
                                      key={`${mod}-${act}`}
                                      className="flex flex-col items-center"
                                      title={`${MODULE_LABELS[mod]} — ${act}`}
                                    >
                                      <Checkbox
                                        checked={permState[role.id]?.[mod]?.[act] || false}
                                        disabled={isSuperAdmin}
                                        onCheckedChange={() => handlePermToggle(role.id, mod, act)}
                                        className="h-3.5 w-3.5 rounded"
                                      />
                                      <span className="text-[8px] text-muted-foreground leading-none mt-0.5">
                                        {ACTION_LABELS[act]}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                      {permRoles.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={ALL_MODULES.length + 1} className="text-center py-8 text-muted-foreground">
                            No roles found. Click refresh to initialize default roles.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-6 text-xs text-muted-foreground px-1">
            <div className="flex items-center gap-1.5">
              <Checkbox checked disabled className="h-3.5 w-3.5 rounded" />
              <span>Enabled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox className="h-3.5 w-3.5 rounded" />
              <span>Disabled</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="font-mono text-[10px]">V</span> View</span>
              <span className="flex items-center gap-1"><span className="font-mono text-[10px]">C</span> Create</span>
              <span className="flex items-center gap-1"><span className="font-mono text-[10px]">E</span> Edit</span>
              <span className="flex items-center gap-1"><span className="font-mono text-[10px]">D</span> Delete</span>
            </div>
          </div>
        </TabsContent>

        {/* ==================== MODULE ACCESS TAB ==================== */}
        <TabsContent value="module-access" className="mt-4 space-y-4">
          <ModuleAccessTab />
        </TabsContent>

        {/* ==================== BACKUP TAB ==================== */}
        <TabsContent value="backup" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Database className="h-5 w-5 text-amber-600" />
                Database Backup
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Automatic backups every 6 hours. Keep the last 10 backups. Manual backup and restore available.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { fetchBackups(); fetchAutoBackupStatus(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleCreateBackup}
                disabled={backupCreating}
              >
                <Database className="h-4 w-4 mr-1.5" />
                {backupCreating ? 'Creating...' : 'Create Backup'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Auto-Backup</p>
                  <p className="text-sm font-medium">
                    {autoBackupStatus?.enabled ? (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 h-5">Enabled</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 h-5">Disabled</Badge>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <HardDrive className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Backup</p>
                  <p className="text-sm font-medium">
                    {autoBackupStatus?.lastBackup
                      ? formatDateTime(autoBackupStatus.lastBackup)
                      : 'Never'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Database className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Backups</p>
                  <p className="text-sm font-medium">{backups.length} / 10</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Restore from file:</span>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleUploadRestore}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1.5" />
                    Choose .json File
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Warning: Restore will overwrite all current data.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Backup History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {backupLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No backups yet</p>
                  <p className="text-xs mt-1">Click &quot;Create Backup&quot; to create your first backup</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 text-sm"
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${backup.type === 'auto'
                          ? 'bg-blue-100'
                          : 'bg-amber-100'
                        }`}>
                        <Database className={`h-4 w-4 ${backup.type === 'auto' ? 'text-blue-600' : 'text-amber-600'
                          }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{backup.filename}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{backup.type}</Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 ${backup.status === 'completed'
                                ? 'border-emerald-300 text-emerald-700'
                                : backup.status === 'failed'
                                  ? 'border-red-300 text-red-700'
                                  : ''
                              }`}
                          >
                            {backup.status}
                          </Badge>
                          {backup.storagePath && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-300 text-blue-700">Cloud</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span>{formatDateTime(backup.createdAt)}</span>
                          <span>{formatBytes(backup.size)}</span>
                          <span>{backup.recordCount} records</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => handleDownloadBackup(backup)} title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={restoreConfirm?.id === backup.id} onOpenChange={(open) => { if (!open) setRestoreConfirm(null); else setRestoreConfirm(backup); }}>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" title="Restore">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore Backup</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to restore from <span className="font-semibold">{backup.filename}</span>?
                                This will replace ALL current data with the backup data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRestoreBackup(backup)} className="bg-emerald-500 hover:bg-emerald-600 text-white">Restore Now</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Backup</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <span className="font-semibold">{backup.filename}</span>? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteBackup(backup.id)} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

/* ==================== MODULE ACCESS SUB-COMPONENT ==================== */
function ModuleAccessTab() {
  const { accessMap, toggleModule, grantAll, revokeAll, resetToDefaults, saveToServer, isSaving } = useRoleAccessStore();

  const ROLE_LABELS: Record<string, string> = {
    manager: 'Manager',
    front_desk: 'Front Desk',
    housekeeping: 'Housekeeping',
    accountant: 'Accountant',
    auditor: 'Auditor',
    staff: 'Staff',
  };

  const ROLE_BADGE_COLORS: Record<string, string> = {
    manager: 'bg-purple-100 text-purple-700',
    front_desk: 'bg-sky-100 text-sky-700',
    housekeeping: 'bg-teal-100 text-teal-700',
    accountant: 'bg-emerald-100 text-emerald-700',
    auditor: 'bg-amber-100 text-amber-700',
    staff: 'bg-gray-100 text-gray-700',
  };

  // FIX #3: only hide developer_tools — cloud and security are now configurable
  const VISIBLE_MODULES = ALL_MODULE_KEYS.filter(
    (m) => m !== 'developer_tools'
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-600" />
            Module Visibility Control
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose which modules each role can see in the sidebar. Changes take effect immediately.
            Developer and Super Admin are not configurable — they have fixed access.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => saveToServer()} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button size="sm" variant="outline" onClick={async () => { resetToDefaults(); await saveToServer(); }} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset Defaults
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
          <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Code className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Developer</p>
            <p className="text-xs text-muted-foreground">Full access to ALL modules (including Cloud Storage &amp; Dev Tools)</p>
          </div>
          <Badge className="bg-amber-500 text-white text-[10px]">ALL MODULES</Badge>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50">
          <div className="h-8 w-8 rounded-lg bg-red-500 flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Super Admin</p>
            <p className="text-xs text-muted-foreground">All modules EXCEPT Developer Tools</p>
          </div>
          <Badge className="bg-red-500 text-white text-[10px]">MOST MODULES</Badge>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Role</TableHead>
                  {VISIBLE_MODULES.map((mod) => (
                    <TableHead key={mod} className="min-w-[100px] text-center">
                      <span className="text-[10px] font-medium uppercase tracking-wider">{MODULE_LABELS[mod] || mod}</span>
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[100px] text-center">
                    <span className="text-[10px] font-medium uppercase tracking-wider">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CONFIGURABLE_ROLES.map((role) => {
                  const modules = accessMap[role];
                  const moduleCount = modules ? modules.size : 0;
                  return (
                    <TableRow key={role}>
                      <TableCell className="sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] px-2 py-0.5 h-5 ${ROLE_BADGE_COLORS[role] || ''}`}>
                            {ROLE_LABELS[role] || role}
                          </Badge>
                          <span className="text-xs text-muted-foreground">({moduleCount})</span>
                        </div>
                      </TableCell>
                      {VISIBLE_MODULES.map((mod) => (
                        <TableCell key={mod} className="text-center p-1.5">
                          <Checkbox
                            checked={modules?.has(mod) || false}
                            onCheckedChange={() => toggleModule(role, mod)}
                            disabled={mod === 'dashboard'}
                            className="h-4 w-4 rounded"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center p-1">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => grantAll(role)} title="Grant all modules">All</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => revokeAll(role)} title="Revoke all (except Dashboard)">None</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-6 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <Checkbox checked disabled className="h-4 w-4 rounded" />
          <span>Visible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox className="h-4 w-4 rounded" />
          <span>Hidden</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox checked disabled className="h-4 w-4 rounded opacity-50" />
          <span>Dashboard (always visible)</span>
        </div>
      </div>

      {/* FIX #3b: corrected the note text */}
      <p className="text-xs text-muted-foreground px-1">
        Note: Developer Tools are restricted to the Developer role only. All other modules can be granted to any configurable role.
      </p>
    </div>
  );
}