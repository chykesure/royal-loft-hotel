'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrency, formatDate } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Plus, RefreshCw, Search, CalendarIcon, Pencil, Trash2,
  AlertTriangle, Bell, Clock, X, LogOut, UserMinus, Users,
  Upload, Loader2, Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
interface Guest { id: string; firstName: string; lastName: string; phone: string; email?: string | null; }
interface Room { id: string; roomNumber: string; floor: number; status: string; roomType: { name: string; baseRate: number; }; }

interface Reservation {
  id: string;
  confirmationCode: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  specialRequests?: string | null;
  notes?: string | null;
  roomRate: number;
  totalAmount: number;
  paidAmount: number;
  source: string;
  guest: Guest;
  guestId: string;
  roomId: string;
  room: Room;
  groupCode?: string | null;
  bill?: { id: string; status: string; totalAmount: number; paidAmount: number; } | null;
}

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  checked_in: 'bg-sky-100 text-sky-700',
  checked_out: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Checked In',
  checked_out: 'Checked Out', cancelled: 'Cancelled', no_show: 'No Show',
};

const emptyForm = {
  guestId: '', roomId: '', checkIn: '', checkOut: '',
  adults: '1', children: '0', source: 'walk_in', specialRequests: '', notes: '',
  multiRoom: false, selectedRoomIds: [] as string[],
};

/* ──────────────────────────────── Checkout Alert Helpers ──────────────────────────────── */

const CHECKOUT_HOUR = 12;
const ALERT_HOURS_BEFORE = 3;
const OVERDAY_LIMIT_HOURS = -168;

interface CheckoutAlert {
  reservation: Reservation;
  hoursLeft: number;
  isOverdue: boolean;
  urgencyText: string;
  urgencyColor: string;
}

function getCheckoutAlerts(reservations: Reservation[]): CheckoutAlert[] {
  const now = new Date();
  const alerts: CheckoutAlert[] = [];

  for (const r of reservations) {
    if (r.status !== 'checked_in') continue;

    const checkoutDate = new Date(r.checkOut);
    checkoutDate.setHours(CHECKOUT_HOUR, 0, 0, 0);

    const msLeft = checkoutDate.getTime() - now.getTime();
    const hoursLeft = msLeft / (1000 * 60 * 60);

    if (hoursLeft <= ALERT_HOURS_BEFORE && hoursLeft > OVERDAY_LIMIT_HOURS) {
      const isOverdue = hoursLeft < 0;
      let urgencyText: string;
      let urgencyColor: string;

      if (isOverdue) {
        const overdueMs = Math.abs(msLeft);
        const overdueDays = Math.floor(overdueMs / (1000 * 60 * 60 * 24));
        const overdueHours = Math.floor((overdueMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const overdueMins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));

        if (overdueDays > 0) {
          urgencyText = overdueHours > 0
            ? `Overdue by ${overdueDays}d ${overdueHours}h`
            : `Overdue by ${overdueDays}d`;
          urgencyColor = 'text-red-700 bg-red-50 border-red-200';
        } else if (overdueHours > 0) {
          urgencyText = overdueMins > 0
            ? `Overdue by ${overdueHours}h ${overdueMins}m`
            : `Overdue by ${overdueHours}h`;
          urgencyColor = 'text-red-700 bg-red-50 border-red-200';
        } else {
          urgencyText = `Overdue by ${overdueMins}m`;
          urgencyColor = 'text-red-700 bg-red-50 border-red-200';
        }
      } else if (hoursLeft < 1) {
        urgencyText = `Less than ${Math.ceil(hoursLeft * 60)} min left`;
        urgencyColor = 'text-red-600 bg-red-50 border-red-200';
      } else {
        const h = Math.floor(hoursLeft);
        const m = Math.round((hoursLeft - h) * 60);
        urgencyText = `${h}h ${m}m remaining`;
        urgencyColor = 'text-amber-700 bg-amber-50 border-amber-200';
      }

      alerts.push({ reservation: r, hoursLeft, isOverdue, urgencyText, urgencyColor });
    }
  }

  alerts.sort((a, b) => a.hoursLeft - b.hoursLeft);
  return alerts;
}

/* ──────────────────────────────── Component ──────────────────────────────── */

export function ReservationsModule() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const { navigateToFrontDeskTab } = useAppStore();
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);

  // ── Checkout Alert State ──
  const [checkoutAlerts, setCheckoutAlerts] = useState<CheckoutAlert[]>([]);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const initialAlertShown = useRef(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('guest', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/reservations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReservations(data);

        const alerts = getCheckoutAlerts(data);
        setCheckoutAlerts(alerts);

        if (alerts.length > 0 && !initialAlertShown.current) {
          initialAlertShown.current = true;
          setAlertDialogOpen(true);
          toast.warning(`${alerts.length} guest${alerts.length > 1 ? 's' : ''} approaching checkout!`, {
            description: 'Please review and process checkouts promptly.',
            duration: 6000,
          });
        }
      }

      const guestsRes = await fetch('/api/guests');
      if (guestsRes.ok) setGuests(await guestsRes.json());

      const roomsRes = await fetch('/api/rooms');
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setAllRooms(roomsData.rooms.filter((r: Room) => r.roomNumber));
      }
    } catch {
      if (!silent) toast.error('Failed to load data');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchData]);

  // ── Manual checkout from alert ──
  const handleAlertCheckout = async (reservationId: string, groupCode?: string | null) => {
    try {
      const payload = groupCode
        ? { groupCode, status: 'checked_out' }
        : { id: reservationId, status: 'checked_out' };

      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Guest checked out successfully');
        setAlertDialogOpen(false);
        fetchData();
      } else {
        toast.error('Failed to process checkout');
      }
    } catch {
      toast.error('Failed to process checkout');
    }
  };

  const openCreateReservation = () => {
    setEditingReservation(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditReservation = (res: Reservation) => {
    setEditingReservation(res);
    setForm({
      guestId: res.guestId,
      roomId: res.roomId,
      checkIn: res.checkIn,
      checkOut: res.checkOut,
      adults: String(res.adults),
      children: String(res.children),
      source: res.source,
      specialRequests: res.specialRequests || '',
      notes: res.notes || '',
      multiRoom: false,
      selectedRoomIds: [res.roomId],
    });
    setDialogOpen(true);
  };

  // ── Multi-Room helpers ──
  const toggleRoomSelection = (roomId: string) => {
    setForm(prev => {
      const selected = prev.selectedRoomIds.includes(roomId)
        ? prev.selectedRoomIds.filter(id => id !== roomId)
        : [...prev.selectedRoomIds, roomId];
      return { ...prev, selectedRoomIds: selected };
    });
  };

  const selectAllRooms = () => {
    setForm(prev => ({
      ...prev,
      selectedRoomIds: allRooms.map(r => r.id),
    }));
  };

  const clearRoomSelection = () => {
    setForm(prev => ({ ...prev, selectedRoomIds: [] }));
  };

  // Calculate estimated total for multi-room
  const getEstimatedTotal = () => {
    if (!form.checkIn || !form.checkOut) return 0;
    const nights = Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return 0;

    if (form.multiRoom) {
      return form.selectedRoomIds.reduce((sum, roomId) => {
        const room = allRooms.find(r => r.id === roomId);
        return sum + (room ? room.roomType.baseRate * nights : 0);
      }, 0);
    } else {
      const room = allRooms.find(r => r.id === form.roomId);
      return room ? room.roomType.baseRate * nights : 0;
    }
  };

  const getEstimatedNights = () => {
    if (!form.checkIn || !form.checkOut) return 0;
    return Math.max(1, Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
  };

  const handleCreate = async () => {
    if (!form.guestId || !form.checkIn || !form.checkOut) {
      toast.error('Please fill all required fields');
      return;
    }

    // ── Multi-Room Create ──
    if (form.multiRoom) {
      if (form.selectedRoomIds.length < 2) {
        toast.error('Please select at least 2 rooms for multi-room booking');
        return;
      }

      try {
        const res = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestId: form.guestId,
            roomIds: form.selectedRoomIds,
            checkIn: form.checkIn,
            checkOut: form.checkOut,
            adults: parseInt(form.adults),
            children: parseInt(form.children),
            source: form.source,
            specialRequests: form.specialRequests,
            notes: form.notes,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          toast.success(`Multi-room booking created! ${data.reservations.length} rooms reserved (${data.groupCode})`);
          setDialogOpen(false);
          setForm(emptyForm);
          fetchData();
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to create multi-room booking');
        }
      } catch {
        toast.error('Failed to create multi-room booking');
      }
      return;
    }

    // ── Single-Room Create ──
    if (!form.roomId) {
      toast.error('Please select a room');
      return;
    }

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          adults: parseInt(form.adults),
          children: parseInt(form.children),
        }),
      });
      if (res.ok) {
        toast.success('Reservation created successfully');
        setDialogOpen(false);
        setForm(emptyForm);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create reservation');
      }
    } catch {
      toast.error('Failed to create reservation');
    }
  };

  const handleUpdate = async () => {
    if (!editingReservation || !form.guestId || !form.roomId || !form.checkIn || !form.checkOut) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingReservation.id,
          guestId: form.guestId,
          roomId: form.roomId,
          checkIn: new Date(form.checkIn).toISOString(),
          checkOut: new Date(form.checkOut).toISOString(),
          adults: parseInt(form.adults),
          children: parseInt(form.children),
          source: form.source,
          specialRequests: form.specialRequests,
          notes: form.notes,
        }),
      });
      if (res.ok) {
        toast.success('Reservation updated successfully');
        setDialogOpen(false);
        setEditingReservation(null);
        setForm(emptyForm);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update reservation');
      }
    } catch {
      toast.error('Failed to update reservation');
    }
  };

  const handleDialogSubmit = () => {
    if (editingReservation) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  const handleStatusUpdate = async (id: string, status: string, cancelReason?: string, groupCode?: string | null) => {
    try {
      const payload = groupCode
        ? { groupCode, status, cancelReason }
        : { id, status, cancelReason };

      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Reservation updated');
        fetchData();
      }
    } catch {
      toast.error('Failed to update reservation');
    }
  };

  const confirmDeleteReservation = (res: Reservation) => {
    setDeleteTarget(res);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const payload = deleteTarget.groupCode
        ? { groupCode: deleteTarget.groupCode }
        : { id: deleteTarget.id };

      const res = await fetch('/api/reservations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(deleteTarget.groupCode
          ? 'Group booking deleted successfully'
          : 'Reservation deleted successfully');
        setDeleteOpen(false);
        setDeleteTarget(null);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete reservation');
      }
    } catch {
      toast.error('Failed to delete reservation');
    }
  };

  // ── Group helpers ──
  const getGroupReservations = (groupCode: string) => {
    return reservations.filter(r => r.groupCode === groupCode);
  };

  const isGroupLeader = (res: Reservation) => {
    if (!res.groupCode) return false;
    const group = getGroupReservations(res.groupCode);
    return group.length > 0 && group[0].id === res.id;
  };

  // ── Derived ──
  const overdueCount = checkoutAlerts.filter(a => a.isOverdue).length;
  const approachingCount = checkoutAlerts.filter(a => !a.isOverdue).length;
  const showBanner = checkoutAlerts.length > 0 && !bannerDismissed;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">

      {/* ═══════════════ CHECKOUT ALERT BANNER ═══════════════ */}
      {showBanner && (
        <div className={`rounded-xl border-2 p-4 transition-all ${overdueCount > 0 ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className={`rounded-full p-2 mt-0.5 ${overdueCount > 0 ? 'bg-red-100' : 'bg-amber-100'}`}>
                <Bell className={`h-5 w-5 ${overdueCount > 0 ? 'text-red-600 animate-pulse' : 'text-amber-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-bold text-sm ${overdueCount > 0 ? 'text-red-800' : 'text-amber-800'}`}>
                    {overdueCount > 0 ? 'Checkout Overdue Alert!' : 'Checkout Reminder'}
                  </h3>
                  <Badge variant="outline" className={`text-[10px] ${overdueCount > 0 ? 'border-red-300 text-red-700' : 'border-amber-300 text-amber-700'}`}>
                    {checkoutAlerts.length} guest{checkoutAlerts.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className={`text-xs mb-3 ${overdueCount > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {overdueCount > 0
                    ? `${overdueCount} guest${overdueCount > 1 ? 's have' : ' has'} passed the checkout time. Please process immediately.`
                    : approachingCount > 0
                      ? `${approachingCount} guest${approachingCount > 1 ? 's are' : ' is'} within ${ALERT_HOURS_BEFORE} hours of checkout. Please prepare for departure.`
                      : ''
                  }
                </p>

                <div className="space-y-2">
                  {checkoutAlerts.map((alert) => (
                    <div
                      key={alert.reservation.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${alert.urgencyColor}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {alert.isOverdue ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold truncate block">
                            {alert.reservation.guest.firstName} {alert.reservation.guest.lastName}
                            {alert.reservation.groupCode && (
                              <Badge variant="outline" className="text-[9px] ml-1 px-1 py-0 h-3.5 bg-violet-50 text-violet-600 border-violet-200">
                                {alert.reservation.groupCode}
                              </Badge>
                            )}
                          </span>
                          <span className="text-[10px] opacity-75">
                            Room {alert.reservation.room.roomNumber} &middot; Checkout: {formatDate(alert.reservation.checkOut)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`font-bold text-[11px] ${alert.isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                          {alert.urgencyText}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-6 text-[10px] px-2 ${alert.isOverdue ? 'border-red-300 text-red-700 hover:bg-red-100' : 'border-amber-300 text-amber-700 hover:bg-amber-100'}`}
                          onClick={() => handleAlertCheckout(alert.reservation.id, alert.reservation.groupCode)}
                        >
                          <LogOut className="h-3 w-3 mr-1" /> Checkout
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setBannerDismissed(true)}
              title="Dismiss notifications"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════ TOOLBAR ═══════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guest, code, or group..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fetchData()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {checkoutAlerts.length > 0 && bannerDismissed && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => { setBannerDismissed(false); setAlertDialogOpen(true); }}
            >
              <Bell className="h-4 w-4 mr-1" />
              {checkoutAlerts.length} Alert{checkoutAlerts.length > 1 ? 's' : ''}
            </Button>
          )}
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigateToFrontDeskTab('walkin')}>
            <Plus className="h-4 w-4 mr-1" /> New Reservation
          </Button>
        </div>
      </div>

      {/* ═══════════════ RESERVATIONS TABLE ═══════════════ */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Confirmation</TableHead>
                    <TableHead className="hidden sm:table-cell">Room</TableHead>
                    <TableHead className="hidden md:table-cell">Dates</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((res) => {
                    const hasAlert = checkoutAlerts.find(a => a.reservation.id === res.id);
                    const groupReservations = res.groupCode ? getGroupReservations(res.groupCode) : [];
                    const isLeader = isGroupLeader(res);

                    return (
                      <TableRow key={res.id} className={hasAlert ? (hasAlert.isOverdue ? 'bg-red-50/50' : 'bg-amber-50/50') : ''}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {hasAlert && (
                              <span title={hasAlert.urgencyText}>
                                {hasAlert.isOverdue ? (
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                )}
                              </span>
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                {res.guest.firstName} {res.guest.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{res.guest.phone}</p>
                              {isLeader && res.groupCode && (
                                <Badge variant="outline" className="text-[9px] mt-0.5 px-1.5 py-0 h-4 bg-violet-50 text-violet-600 border-violet-200 font-mono">
                                  <Users className="h-2.5 w-2.5 mr-0.5" />
                                  {res.groupCode} ({groupReservations.length} rooms)
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{res.confirmationCode}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm">{res.room.roomNumber}</span>
                          <span className="text-xs text-muted-foreground ml-1">({res.room.roomType.name})</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-xs">
                            <p>{formatDate(res.checkIn)}</p>
                            <p className="text-muted-foreground">&rarr; {formatDate(res.checkOut)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{formatCurrency(res.totalAmount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge className={`text-[10px] px-2 py-0.5 h-5 ${statusBadge[res.status] || ''}`}>
                              {statusLabels[res.status] || res.status}
                            </Badge>
                            {hasAlert && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${hasAlert.isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {hasAlert.urgencyText}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {res.status === 'confirmed' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusUpdate(res.id, 'checked_in', undefined, res.groupCode)}>
                                Check-in
                              </Button>
                            )}
                            {res.status === 'checked_in' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className={`h-7 text-xs ${hasAlert?.isOverdue ? 'border-red-300 text-red-700 hover:bg-red-50' : ''}`}
                                onClick={() => handleStatusUpdate(res.id, 'checked_out', undefined, res.groupCode)}
                              >
                                Check-out
                              </Button>
                            )}
                            {['confirmed', 'pending'].includes(res.status) && (
                              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleStatusUpdate(res.id, 'cancelled', 'Cancelled by staff', res.groupCode)}>
                                Cancel
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditReservation(res)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => confirmDeleteReservation(res)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {reservations.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No reservations found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════ CREATE / EDIT RESERVATION DIALOG ═══════════════ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setEditingReservation(null); setForm(emptyForm); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReservation ? 'Edit Reservation' : 'Create Reservation'}</DialogTitle>
            <DialogDescription>
              {editingReservation
                ? 'Update the reservation details below.'
                : 'Fill in the details to create a new reservation. Toggle Multi-Room to book multiple rooms at once.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Guest *</Label>
              <Select value={form.guestId} onValueChange={(v) => setForm({ ...form, guestId: v })}>
                <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                <SelectContent>
                  {guests.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.firstName} {g.lastName} &mdash; {g.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Multi-Room Toggle ── */}
            {!editingReservation && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-600" />
                  <div>
                    <Label className="text-sm font-medium">Multi-Room Booking</Label>
                    <p className="text-[11px] text-muted-foreground">Book multiple rooms for the same guest at once</p>
                  </div>
                </div>
                <Switch
                  checked={form.multiRoom}
                  onCheckedChange={(checked) => setForm({
                    ...form,
                    multiRoom: checked,
                    selectedRoomIds: checked ? [] : [],
                    roomId: '',
                  })}
                />
              </div>
            )}

            {/* ── Single Room Select ── */}
            {!form.multiRoom && (
              <div className="grid gap-2">
                <Label>Room *</Label>
                <Select value={form.roomId} onValueChange={(v) => setForm({ ...form, roomId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    {allRooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        Room {r.roomNumber} &mdash; {r.roomType.name} ({formatCurrency(r.roomType.baseRate)}/night)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── Multi-Room Selection ── */}
            {form.multiRoom && !editingReservation && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Select Rooms * <span className="text-muted-foreground font-normal text-xs">(min 2)</span></Label>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={selectAllRooms}>
                      Select All
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={clearRoomSelection}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {allRooms.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 text-center">No rooms available</p>
                  ) : (
                    allRooms.map((r) => {
                      const isSelected = form.selectedRoomIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleRoomSelection(r.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm border-b last:border-b-0 transition-colors ${isSelected
                              ? 'bg-violet-50 border-l-2 border-l-violet-500'
                              : 'hover:bg-muted/50'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-muted-foreground/30'
                              }`}>
                              {isSelected && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="font-medium">Room {r.roomNumber}</span>
                            <span className="text-muted-foreground">({r.roomType.name})</span>
                          </div>
                          <span className="font-medium text-amber-600">{formatCurrency(r.roomType.baseRate)}/nt</span>
                        </button>
                      );
                    })
                  )}
                </div>
                {form.selectedRoomIds.length > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-violet-50 border border-violet-200">
                    <span className="text-xs text-violet-700 font-medium">
                      {form.selectedRoomIds.length} room{form.selectedRoomIds.length > 1 ? 's' : ''} selected
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {form.selectedRoomIds.map(id => {
                        const r = allRooms.find(rm => rm.id === id);
                        return r ? r.roomNumber : '';
                      }).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Check-in *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.checkIn ? formatDate(form.checkIn) : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={form.checkIn ? new Date(form.checkIn) : undefined}
                      onSelect={(d) => setForm({ ...form, checkIn: d ? d.toISOString() : '' })} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>Check-out *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.checkOut ? formatDate(form.checkOut) : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={form.checkOut ? new Date(form.checkOut) : undefined}
                      onSelect={(d) => setForm({ ...form, checkOut: d ? d.toISOString() : '' })} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* ── Estimate Summary ── */}
            {form.checkIn && form.checkOut && (form.roomId || form.selectedRoomIds.length > 0) && getEstimatedNights() > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700 font-medium">
                    {form.multiRoom
                      ? `${form.selectedRoomIds.length} room${form.selectedRoomIds.length > 1 ? 's' : ''} x ${getEstimatedNights()} night${getEstimatedNights() > 1 ? 's' : ''}`
                      : `${getEstimatedNights()} night${getEstimatedNights() > 1 ? 's' : ''} at ${formatCurrency(allRooms.find(r => r.id === form.roomId)?.roomType.baseRate || 0)}/nt`
                    }
                  </span>
                  <span className="text-amber-800 font-bold text-base">{formatCurrency(getEstimatedTotal())}</span>
                </div>
                {form.multiRoom && form.selectedRoomIds.length > 1 && (
                  <div className="mt-1 text-[11px] text-amber-600">
                    Breakdown: {form.selectedRoomIds.map(id => {
                      const r = allRooms.find(rm => rm.id === id);
                      if (!r) return '';
                      return `${r.roomNumber}: ${formatCurrency(r.roomType.baseRate * getEstimatedNights())}`;
                    }).join(' + ')}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Adults</Label>
                <Select value={form.adults} onValueChange={(v) => setForm({ ...form, adults: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Children</Label>
                <Select value={form.children} onValueChange={(v) => setForm({ ...form, children: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[0, 1, 2, 3].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['walk_in', 'website', 'phone', 'whatsapp', 'ota_booking'].map(s => (
                      <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Special Requests</Label>
              <Textarea value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} placeholder="Any special requests..." />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." />
            </div>
            <Button onClick={handleDialogSubmit} className="bg-amber-500 hover:bg-amber-600 text-white">
              {editingReservation ? 'Update Reservation' : form.multiRoom ? `Create Multi-Room Booking (${form.selectedRoomIds.length} rooms)` : 'Create Reservation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ CHECKOUT ALERT POPUP DIALOG ═══════════════ */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className={`rounded-full p-1.5 ${overdueCount > 0 ? 'bg-red-100' : 'bg-amber-100'}`}>
                <Bell className={`h-5 w-5 ${overdueCount > 0 ? 'text-red-600' : 'text-amber-600'}`} />
              </div>
              <DialogTitle className={overdueCount > 0 ? 'text-red-800' : 'text-amber-800'}>
                {overdueCount > 0 ? 'Checkout Overdue!' : 'Checkout Approaching'}
              </DialogTitle>
            </div>
            <DialogDescription className={overdueCount > 0 ? 'text-red-600' : 'text-amber-600'}>
              {overdueCount > 0
                ? `The following guest${overdueCount > 1 ? 's have' : ' has'} exceeded the checkout time. Please process checkout immediately.`
                : `The following guest${approachingCount > 1 ? 's are' : ' is'} within ${ALERT_HOURS_BEFORE} hours of checkout. Please prepare for their departure.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {checkoutAlerts.map((alert) => (
              <div
                key={alert.reservation.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${alert.urgencyColor}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {alert.isOverdue ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {alert.reservation.guest.firstName} {alert.reservation.guest.lastName}
                    </p>
                    <p className="text-[10px] opacity-75">
                      Room {alert.reservation.room.roomNumber} &middot; Code: {alert.reservation.confirmationCode}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className={`font-bold text-xs ${alert.isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                    {alert.urgencyText}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-6 text-[10px] px-2 mt-1 ${alert.isOverdue ? 'border-red-300 text-red-700 hover:bg-red-100' : 'border-amber-300 text-amber-700 hover:bg-amber-100'}`}
                    onClick={() => handleAlertCheckout(alert.reservation.id, alert.reservation.groupCode)}
                  >
                    <UserMinus className="h-3 w-3 mr-1" /> Checkout
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => setAlertDialogOpen(false)}>
              Dismiss
            </Button>
            <Button
              size="sm"
              className={overdueCount > 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}
              onClick={() => {
                setAlertDialogOpen(false);
                setBannerDismissed(false);
              }}
            >
              View in Table
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ DELETE CONFIRMATION ═══════════════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget?.groupCode ? 'Delete Group Booking' : 'Cancel Reservation'}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.groupCode
                ? `This will delete ALL reservations in group "${deleteTarget.groupCode}" for ${deleteTarget.guest.firstName} ${deleteTarget.guest.lastName}. Are you sure?`
                : `Are you sure you want to cancel/delete reservation "${deleteTarget?.confirmationCode}" for ${deleteTarget?.guest.firstName} ${deleteTarget?.guest.lastName}? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              {deleteTarget?.groupCode ? 'Delete All in Group' : 'Delete Reservation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
