'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDate } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
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
import { Plus, Search, RefreshCw, Star, ShieldAlert, Phone, Mail, MapPin, Award, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Guest {
  id: string; firstName: string; lastName: string; email?: string | null;
  phone: string; address?: string | null; city?: string | null; state?: string | null; country?: string | null;
  gender?: string | null; idType?: string | null; idNumber?: string | null;
  loyaltyTier: string; loyaltyPoints: number; vip: boolean; isBlacklisted: boolean;
  totalStays: number; totalSpent: number; preferences?: string | null;
  _count?: { reservations: number; feedbacks: number };
}

const tierColors: Record<string, string> = {
  none: 'bg-gray-100 text-gray-600',
  silver: 'bg-slate-100 text-slate-600',
  gold: 'bg-amber-100 text-amber-700',
  platinum: 'bg-purple-100 text-purple-700',
};

const tierBadge: Record<string, string> = {
  none: 'Standard',
  silver: '🥈 Silver',
  gold: '🥇 Gold',
  platinum: '💎 Platinum',
};

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', city: '', state: '', gender: '', idType: '', idNumber: '', vip: false,
};

export function GuestsModule() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null);

  const fetchGuests = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/guests${params}`);
      if (res.ok) setGuests(await res.json());
    } catch {
      toast.error('Failed to load guests');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  const openCreateGuest = () => {
    setEditingGuest(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setForm({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email || '',
      phone: guest.phone,
      address: guest.address || '',
      city: guest.city || '',
      state: guest.state || '',
      gender: guest.gender || '',
      idType: guest.idType || '',
      idNumber: guest.idNumber || '',
      vip: guest.vip,
    });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Guest added successfully');
        setDialogOpen(false);
        setForm(emptyForm);
        fetchGuests();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add guest');
      }
    } catch {
      toast.error('Failed to add guest');
    }
  };

  const handleUpdate = async () => {
    if (!editingGuest || !form.firstName || !form.lastName || !form.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      const res = await fetch('/api/guests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingGuest.id, ...form }),
      });
      if (res.ok) {
        toast.success('Guest updated successfully');
        setDialogOpen(false);
        setEditingGuest(null);
        setForm(emptyForm);
        fetchGuests();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update guest');
      }
    } catch {
      toast.error('Failed to update guest');
    }
  };

  const handleDialogSubmit = () => {
    if (editingGuest) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  const confirmDeleteGuest = (guest: Guest) => {
    setDeleteTarget(guest);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/guests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        toast.success('Guest deleted successfully');
        setDeleteOpen(false);
        setDeleteTarget(null);
        setProfileOpen(false);
        fetchGuests();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete guest');
      }
    } catch {
      toast.error('Failed to delete guest');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or phone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchGuests}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingGuest(null); setForm(emptyForm); }
          }}>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={openCreateGuest}><Plus className="h-4 w-4 mr-1" /> Add Guest</Button>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingGuest ? 'Edit Guest' : 'Add New Guest'}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                  <div className="grid gap-2">
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>ID Type</Label>
                    <Select value={form.idType} onValueChange={(v) => setForm({ ...form, idType: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIN">NIN</SelectItem>
                        <SelectItem value="Passport">Passport</SelectItem>
                        <SelectItem value="Drivers License">Drivers License</SelectItem>
                        <SelectItem value="Voters Card">Voters Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>ID Number</Label><Input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} /></div>
                </div>
                <Button onClick={handleDialogSubmit} className="bg-amber-500 hover:bg-amber-600 text-white">
                  {editingGuest ? 'Update Guest' : 'Add Guest'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                  <TableHead>Guest</TableHead>
                  <TableHead className="hidden sm:table-cell">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Loyalty</TableHead>
                  <TableHead className="hidden lg:table-cell">Stays</TableHead>
                  <TableHead className="hidden lg:table-cell">Total Spent</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell>
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => { setSelectedGuest(guest); setProfileOpen(true); }}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                            {guest.firstName[0]}{guest.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{guest.firstName} {guest.lastName}</p>
                          <p className="text-xs text-muted-foreground">{guest.city ? `${guest.city}, ${guest.state}` : guest.country}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="text-xs space-y-0.5">
                        <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {guest.phone}</p>
                        {guest.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {guest.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge className={`text-[10px] px-2 py-0.5 h-5 ${tierColors[guest.loyaltyTier]}`}>
                        {tierBadge[guest.loyaltyTier]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{guest.totalStays}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm font-medium">{formatCurrency(guest.totalSpent)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {guest.vip && <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0 h-4">VIP</Badge>}
                        {guest.isBlacklisted && <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 h-4"><ShieldAlert className="h-2.5 w-2.5" /></Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditGuest(guest)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => confirmDeleteGuest(guest)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {guests.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No guests found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Guest Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Guest Profile</DialogTitle>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-amber-100 text-amber-700 text-lg font-semibold">
                    {selectedGuest.firstName[0]}{selectedGuest.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{selectedGuest.firstName} {selectedGuest.lastName}</h3>
                    {selectedGuest.vip && <Badge className="bg-amber-100 text-amber-700">VIP</Badge>}
                    {selectedGuest.isBlacklisted && <Badge className="bg-red-100 text-red-700">Blacklisted</Badge>}
                  </div>
                  <Badge className={`text-[10px] px-2 py-0.5 h-5 mt-1 ${tierColors[selectedGuest.loyaltyTier]}`}>
                    {tierBadge[selectedGuest.loyaltyTier]} • {selectedGuest.loyaltyPoints.toLocaleString()} pts
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {selectedGuest.phone}</div>
                {selectedGuest.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {selectedGuest.email}</div>}
                {selectedGuest.city && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {selectedGuest.city}, {selectedGuest.state}</div>}
                <div className="flex items-center gap-2"><Award className="h-4 w-4 text-muted-foreground" /> {selectedGuest.totalStays} stays</div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Spent</p><p className="text-lg font-bold text-amber-600">{formatCurrency(selectedGuest.totalSpent)}</p></Card>
                <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Loyalty Points</p><p className="text-lg font-bold text-amber-600">{selectedGuest.loyaltyPoints.toLocaleString()}</p></Card>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { if (profileOpen) { openEditGuest(selectedGuest); } setProfileOpen(false); }}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => { confirmDeleteGuest(selectedGuest); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.firstName} {deleteTarget?.lastName}? All associated data including reservations, bills, and feedback will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Delete Guest
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
