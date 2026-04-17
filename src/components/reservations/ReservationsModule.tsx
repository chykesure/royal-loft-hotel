'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Plus, RefreshCw, Search, CalendarIcon, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Guest { id: string; firstName: string; lastName: string; phone: string; email?: string | null; }
interface Room { id: string; roomNumber: string; roomType: { name: string; baseRate: number; }; }

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
};

export function ReservationsModule() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
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

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('guest', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/reservations?${params}`);
      if (res.ok) setReservations(await res.json());

      const guestsRes = await fetch('/api/guests');
      if (guestsRes.ok) setGuests(await guestsRes.json());

      const roomsRes = await fetch('/api/rooms');
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setAvailableRooms(roomsData.rooms.filter((r: Room) => r.roomNumber));
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.guestId || !form.roomId || !form.checkIn || !form.checkOut) {
      toast.error('Please fill all required fields');
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

  const handleStatusUpdate = async (id: string, status: string, cancelReason?: string) => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, cancelReason }),
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
      const res = await fetch('/api/reservations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        toast.success('Reservation deleted successfully');
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

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guest or code..."
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
          <Button size="sm" variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={openCreateReservation}>
            <Plus className="h-4 w-4 mr-1" /> New Reservation
          </Button>
        </div>
      </div>

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
                  {reservations.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{res.guest.firstName} {res.guest.lastName}</p>
                          <p className="text-xs text-muted-foreground">{res.guest.phone}</p>
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
                          <p className="text-muted-foreground">→ {formatDate(res.checkOut)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(res.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] px-2 py-0.5 h-5 ${statusBadge[res.status] || ''}`}>
                          {statusLabels[res.status] || res.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {res.status === 'confirmed' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusUpdate(res.id, 'checked_in')}>
                              Check-in
                            </Button>
                          )}
                          {res.status === 'checked_in' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusUpdate(res.id, 'checked_out')}>
                              Check-out
                            </Button>
                          )}
                          {['confirmed', 'pending'].includes(res.status) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleStatusUpdate(res.id, 'cancelled', 'Cancelled by staff')}>
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
                  ))}
                  {reservations.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No reservations found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Reservation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setEditingReservation(null); setForm(emptyForm); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingReservation ? 'Edit Reservation' : 'Create Reservation'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Guest *</Label>
              <Select value={form.guestId} onValueChange={(v) => setForm({ ...form, guestId: v })}>
                <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                <SelectContent>
                  {guests.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.firstName} {g.lastName} — {g.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Room *</Label>
              <Select value={form.roomId} onValueChange={(v) => setForm({ ...form, roomId: v })}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {availableRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.roomNumber} — {r.roomType.name} ({formatCurrency(r.roomType.baseRate)}/night)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Adults</Label>
                <Select value={form.adults} onValueChange={(v) => setForm({ ...form, adults: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Children</Label>
                <Select value={form.children} onValueChange={(v) => setForm({ ...form, children: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[0,1,2,3].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
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
              {editingReservation ? 'Update Reservation' : 'Create Reservation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel/delete reservation &quot;{deleteTarget?.confirmationCode}&quot; for {deleteTarget?.guest.firstName} {deleteTarget?.guest.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Delete Reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
