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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  UserCheck,
  UserMinus,
  AlertCircle,
  Search,
  CalendarIcon,
  RefreshCw,
  Users,
  LogOut,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
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

/* ──────────────────────────────── Component ──────────────────────────────── */

export function FrontDeskModule() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const { frontDeskTab, setFrontDeskTab } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // ── Walk-in Form State ──
  const [walkinGuestMode, setWalkinGuestMode] = useState<'select' | 'new'>('new');
  const [walkinForm, setWalkinForm] = useState({
    // Guest fields (for new guest)
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    // Existing guest
    guestId: '',
    // Reservation fields
    multiRoom: false,
    selectedRoomIds: [] as string[],
    roomId: '',
    checkIn: '',
    checkOut: '',
    adults: '1',
    children: '0',
    specialRequests: '',
    notes: '',
    discount: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Check-in Tab ──
  const [checkinSearch, setCheckinSearch] = useState('');

  // ── Check-out Tab ──
  const [checkoutSearch, setCheckoutSearch] = useState('');

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch('/api/reservations');
      if (res.ok) setReservations(await res.json());

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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived Stats ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const expectedArrivals = reservations.filter(r =>
    r.status === 'confirmed' && new Date(r.checkIn) <= tomorrow
  );
  const expectedDepartures = reservations.filter(r =>
    r.status === 'checked_in' && new Date(r.checkOut) <= tomorrow
  );
  const overdueCheckouts = reservations.filter(r => {
    if (r.status !== 'checked_in') return false;
    const checkoutDate = new Date(r.checkOut);
    checkoutDate.setHours(12, 0, 0, 0);
    return checkoutDate < new Date();
  });

  // Unique group leaders (don't double-count multi-room)
  const getUniqueGuests = (list: Reservation[]) => {
    const seen = new Set<string>();
    return list.filter(r => {
      const key = r.groupCode || r.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // ── Available rooms for walk-in ──
  const availableRooms = allRooms.filter(r => r.status === 'available');

  // ── Walk-in Helpers ──
  const toggleRoomSelection = (roomId: string) => {
    setWalkinForm(prev => {
      const selected = prev.selectedRoomIds.includes(roomId)
        ? prev.selectedRoomIds.filter(id => id !== roomId)
        : [...prev.selectedRoomIds, roomId];
      return { ...prev, selectedRoomIds: selected };
    });
  };

  const getEstimatedTotal = () => {
    if (!walkinForm.checkIn || !walkinForm.checkOut) return 0;
    const nights = Math.ceil((new Date(walkinForm.checkOut).getTime() - new Date(walkinForm.checkIn).getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return 0;

    let total = 0;
    if (walkinForm.multiRoom) {
      total = walkinForm.selectedRoomIds.reduce((sum, roomId) => {
        const room = allRooms.find(r => r.id === roomId);
        return sum + (room ? room.roomType.baseRate * nights : 0);
      }, 0);
    } else {
      const room = allRooms.find(r => r.id === walkinForm.roomId);
      total = room ? room.roomType.baseRate * nights : 0;
    }

    const discount = parseFloat(walkinForm.discount) || 0;
    return Math.max(0, total - discount);
  };

  const getDiscountAmount = () => {
    return parseFloat(walkinForm.discount) || 0;
  };

  const getSubtotalBeforeDiscount = () => {
    if (!walkinForm.checkIn || !walkinForm.checkOut) return 0;
    const nights = Math.ceil((new Date(walkinForm.checkOut).getTime() - new Date(walkinForm.checkIn).getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return 0;

    if (walkinForm.multiRoom) {
      return walkinForm.selectedRoomIds.reduce((sum, roomId) => {
        const room = allRooms.find(r => r.id === roomId);
        return sum + (room ? room.roomType.baseRate * nights : 0);
      }, 0);
    } else {
      const room = allRooms.find(r => r.id === walkinForm.roomId);
      return room ? room.roomType.baseRate * nights : 0;
    }
  };

  const getEstimatedNights = () => {
    if (!walkinForm.checkIn || !walkinForm.checkOut) return 0;
    return Math.max(1, Math.ceil((new Date(walkinForm.checkOut).getTime() - new Date(walkinForm.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
  };

  // ── Walk-in Submit ──
  const handleWalkinSubmit = async () => {
    if (walkinGuestMode === 'new') {
      if (!walkinForm.firstName || !walkinForm.lastName || !walkinForm.phone) {
        toast.error('Please enter guest name and phone number');
        return;
      }
    } else {
      if (!walkinForm.guestId) {
        toast.error('Please select an existing guest');
        return;
      }
    }

    if (!walkinForm.checkIn || !walkinForm.checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (walkinForm.multiRoom) {
      if (walkinForm.selectedRoomIds.length < 2) {
        toast.error('Please select at least 2 rooms for multi-room booking');
        return;
      }
    } else {
      if (!walkinForm.roomId) {
        toast.error('Please select a room');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // If new guest, create them first
      let guestId = walkinForm.guestId;
      if (walkinGuestMode === 'new') {
        const guestRes = await fetch('/api/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: walkinForm.firstName,
            lastName: walkinForm.lastName,
            phone: walkinForm.phone,
            email: walkinForm.email || undefined,
          }),
        });
        if (guestRes.ok) {
          const guest = await guestRes.json();
          guestId = guest.id;
        } else {
          const err = await guestRes.json();
          toast.error(err.error || 'Failed to create guest');
          setIsSubmitting(false);
          return;
        }
      }

      // Create reservation(s) + bill
      const discountAmount = parseFloat(walkinForm.discount) || 0;
      const reservationPayload: Record<string, unknown> = {
        guestId,
        checkIn: walkinForm.checkIn,
        checkOut: walkinForm.checkOut,
        adults: parseInt(walkinForm.adults),
        children: parseInt(walkinForm.children),
        source: 'walk_in',
        specialRequests: walkinForm.specialRequests || undefined,
        notes: walkinForm.notes || undefined,
        discountAmount,
      };

      if (walkinForm.multiRoom) {
        reservationPayload.roomIds = walkinForm.selectedRoomIds;
      } else {
        reservationPayload.roomId = walkinForm.roomId;
      }

      const resRes = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservationPayload),
      });

      if (resRes.ok) {
        const data = await resRes.json();
        if (walkinForm.multiRoom && data.reservations) {
          toast.success(`Walk-in registered! ${data.reservations.length} rooms booked (${data.groupCode}). Bill created for invoice.`);
        } else {
          toast.success('Walk-in guest registered & checked in! Bill created for invoice.');
        }
        // Reset form
        setWalkinForm({
          firstName: '', lastName: '', phone: '', email: '', guestId: '',
          multiRoom: false, selectedRoomIds: [], roomId: '',
          checkIn: '', checkOut: '', adults: '1', children: '0',
          specialRequests: '', notes: '', discount: '',
        });
        fetchData();
      } else {
        const err = await resRes.json();
        toast.error(err.error || 'Failed to create reservation');
      }
    } catch {
      toast.error('Walk-in registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Check-in Handler ──
  const handleCheckin = async (res: Reservation) => {
    const payload = res.groupCode
      ? { groupCode: res.groupCode, status: 'checked_in' }
      : { id: res.id, status: 'checked_in' };

    try {
      const r = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        toast.success(res.groupCode
          ? 'Group checked in successfully'
          : 'Guest checked in successfully');
        fetchData();
      } else {
        const err = await r.json();
        toast.error(err.error || 'Check-in failed');
      }
    } catch {
      toast.error('Check-in failed');
    }
  };

  // ── Check-out Handler ──
  const handleCheckout = async (res: Reservation) => {
    const payload = res.groupCode
      ? { groupCode: res.groupCode, status: 'checked_out' }
      : { id: res.id, status: 'checked_out' };

    try {
      const r = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        toast.success(res.groupCode
          ? 'Group checked out successfully'
          : 'Guest checked out successfully');
        fetchData();
      } else {
        const err = await r.json();
        toast.error(err.error || 'Check-out failed');
      }
    } catch {
      toast.error('Check-out failed');
    }
  };

  // ── Group Helpers ──
  const getGroupReservations = (groupCode: string) => {
    return reservations.filter(r => r.groupCode === groupCode);
  };

  const isGroupLeader = (res: Reservation) => {
    if (!res.groupCode) return false;
    const group = getGroupReservations(res.groupCode);
    return group.length > 0 && group[0].id === res.id;
  };

  // ── Filtered lists for tabs ──
  const confirmedReservations = reservations
    .filter(r => r.status === 'confirmed')
    .filter(r => {
      if (!checkinSearch) return true;
      const s = checkinSearch.toLowerCase();
      return (
        r.guest.firstName.toLowerCase().includes(s) ||
        r.guest.lastName.toLowerCase().includes(s) ||
        r.confirmationCode.toLowerCase().includes(s) ||
        r.room.roomNumber.includes(s)
      );
    });

  const checkedinReservations = reservations
    .filter(r => r.status === 'checked_in')
    .filter(r => {
      if (!checkoutSearch) return true;
      const s = checkoutSearch.toLowerCase();
      return (
        r.guest.firstName.toLowerCase().includes(s) ||
        r.guest.lastName.toLowerCase().includes(s) ||
        r.confirmationCode.toLowerCase().includes(s) ||
        r.room.roomNumber.includes(s)
      );
    });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">

      {/* ═══════════════ SUMMARY CARDS ═══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-teal-100 p-2.5"><ArrowDownCircle className="h-5 w-5 text-teal-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Expected Arrivals</p>
              <p className="text-xl font-bold text-teal-600">{isLoading ? '...' : getUniqueGuests(expectedArrivals).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2.5"><ArrowUpCircle className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Expected Departures</p>
              <p className="text-xl font-bold text-orange-600">{isLoading ? '...' : getUniqueGuests(expectedDepartures).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2.5"><Clock className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Overdue Checkouts</p>
              <p className="text-xl font-bold text-red-600">{isLoading ? '...' : getUniqueGuests(overdueCheckouts).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ TABS ═══════════════ */}
      <Tabs defaultValue="walkin">
        <TabsList>
          <TabsTrigger value="checkin"><UserCheck className="h-4 w-4 mr-1.5" /> Check-in</TabsTrigger>
          <TabsTrigger value="checkout"><UserMinus className="h-4 w-4 mr-1.5" /> Check-out</TabsTrigger>
          <TabsTrigger value="walkin"><AlertCircle className="h-4 w-4 mr-1.5" /> Walk-in</TabsTrigger>
          <Tabs value={frontDeskTab} onValueChange={(v) => setFrontDeskTab(v)}></Tabs>
        </TabsList>

        {/* ═════════════ CHECK-IN TAB ═══════════════ */}
        <TabsContent value="checkin" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Guest Check-in</h3>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search guest, code, room..." className="pl-9 h-9" value={checkinSearch} onChange={(e) => setCheckinSearch(e.target.value)} />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => fetchData()}><RefreshCw className="h-4 w-4" /></Button>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : confirmedReservations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No pending check-ins found</p>
                </div>
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
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {confirmedReservations.map((res) => {
                        const groupRes = res.groupCode ? getGroupReservations(res.groupCode) : [];
                        const leader = isGroupLeader(res);
                        return (
                          <TableRow key={res.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{res.guest.firstName} {res.guest.lastName}</p>
                                <p className="text-xs text-muted-foreground">{res.guest.phone}</p>
                                {leader && res.groupCode && (
                                  <Badge variant="outline" className="text-[9px] mt-0.5 px-1.5 py-0 h-4 bg-violet-50 text-violet-600 border-violet-200 font-mono">
                                    <Users className="h-2.5 w-2.5 mr-0.5" />
                                    {res.groupCode} ({groupRes.length} rooms)
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="font-mono text-xs">{res.confirmationCode}</Badge></TableCell>
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
                              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-7 text-xs" onClick={() => handleCheckin(res)}>
                                <UserCheck className="h-3.5 w-3.5 mr-1" />
                                {res.groupCode ? 'Group Check-in' : 'Check-in'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════ CHECK-OUT TAB ═══════════════ */}
        <TabsContent value="checkout" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Guest Check-out</h3>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search guest, code, room..." className="pl-9 h-9" value={checkoutSearch} onChange={(e) => setCheckoutSearch(e.target.value)} />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => fetchData()}><RefreshCw className="h-4 w-4" /></Button>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : checkedinReservations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserMinus className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No guests currently checked in</p>
                </div>
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
                      {checkedinReservations.map((res) => {
                        const groupRes = res.groupCode ? getGroupReservations(res.groupCode) : [];
                        const leader = isGroupLeader(res);
                        const isOverdue = new Date(res.checkOut).setHours(12, 0, 0, 0) < Date.now();

                        return (
                          <TableRow key={res.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{res.guest.firstName} {res.guest.lastName}</p>
                                <p className="text-xs text-muted-foreground">{res.guest.phone}</p>
                                {leader && res.groupCode && (
                                  <Badge variant="outline" className="text-[9px] mt-0.5 px-1.5 py-0 h-4 bg-violet-50 text-violet-600 border-violet-200 font-mono">
                                    <Users className="h-2.5 w-2.5 mr-0.5" />
                                    {res.groupCode} ({groupRes.length} rooms)
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="font-mono text-xs">{res.confirmationCode}</Badge></TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <span className="text-sm">{res.room.roomNumber}</span>
                              <span className="text-xs text-muted-foreground ml-1">({res.room.roomType.name})</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="text-xs">
                                <p>{formatDate(res.checkIn)}</p>
                                <p className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                                  &rarr; {formatDate(res.checkOut)}
                                  {isOverdue && ' (Overdue)'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{formatCurrency(res.totalAmount)}</TableCell>
                            <TableCell>
                              {isOverdue ? (
                                <Badge className="text-[10px] px-2 py-0.5 h-5 bg-red-100 text-red-700">Overdue</Badge>
                              ) : (
                                <Badge className="text-[10px] px-2 py-0.5 h-5 bg-sky-100 text-sky-700">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" className={`h-7 text-xs ${isOverdue ? 'border-red-300 text-red-700 hover:bg-red-50' : ''}`} onClick={() => handleCheckout(res)}>
                                <LogOut className="h-3.5 w-3.5 mr-1" />
                                {res.groupCode ? 'Group Out' : 'Check-out'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════ WALK-IN TAB ═══════════════ */}
        <TabsContent value="walkin" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: Guest Info ── */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-sm">Walk-in Registration</h3>

                {/* Guest Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={walkinGuestMode === 'new' ? 'default' : 'outline'}
                    className={walkinGuestMode === 'new' ? 'bg-amber-500 hover:bg-amber-600 text-white text-xs' : 'text-xs'}
                    onClick={() => setWalkinGuestMode('new')}
                  >New Guest</Button>
                  <Button
                    size="sm"
                    variant={walkinGuestMode === 'select' ? 'default' : 'outline'}
                    className={walkinGuestMode === 'select' ? 'bg-amber-500 hover:bg-amber-600 text-white text-xs' : 'text-xs'}
                    onClick={() => setWalkinGuestMode('select')}
                  >Existing Guest</Button>
                </div>

                {walkinGuestMode === 'new' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">First Name *</Label>
                        <Input placeholder="First name" className="h-9" value={walkinForm.firstName} onChange={(e) => setWalkinForm({ ...walkinForm, firstName: e.target.value })} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Last Name *</Label>
                        <Input placeholder="Last name" className="h-9" value={walkinForm.lastName} onChange={(e) => setWalkinForm({ ...walkinForm, lastName: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Phone *</Label>
                        <Input placeholder="Phone number" className="h-9" value={walkinForm.phone} onChange={(e) => setWalkinForm({ ...walkinForm, phone: e.target.value })} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Email</Label>
                        <Input placeholder="Email (optional)" type="email" className="h-9" value={walkinForm.email} onChange={(e) => setWalkinForm({ ...walkinForm, email: e.target.value })} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Select Guest *</Label>
                    <Select value={walkinForm.guestId} onValueChange={(v) => setWalkinForm({ ...walkinForm, guestId: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Choose a guest..." /></SelectTrigger>
                      <SelectContent>
                        {guests.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.firstName} {g.lastName} &mdash; {g.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Adults</Label>
                    <Input type="number" min="1" className="h-9" value={walkinForm.adults} onChange={(e) => setWalkinForm({ ...walkinForm, adults: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Children</Label>
                    <Input type="number" min="0" className="h-9" value={walkinForm.children} onChange={(e) => setWalkinForm({ ...walkinForm, children: e.target.value })} />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs">Special Requests</Label>
                  <Textarea placeholder="Any special requests..." className="min-h-[60px] text-sm" value={walkinForm.specialRequests} onChange={(e) => setWalkinForm({ ...walkinForm, specialRequests: e.target.value })} />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs">Discount (&#8358;)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="h-9"
                    value={walkinForm.discount}
                    onChange={(e) => setWalkinForm({ ...walkinForm, discount: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Right: Room Selection & Dates ── */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-sm">Room & Dates</h3>

                {/* ── Multi-Room Toggle ── */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-violet-600" />
                    <div>
                      <Label className="text-sm font-medium">Multi-Room Booking</Label>
                      <p className="text-[11px] text-muted-foreground">Book multiple rooms for the same guest</p>
                    </div>
                  </div>
                  <Switch
                    checked={walkinForm.multiRoom}
                    onCheckedChange={(checked) => setWalkinForm({
                      ...walkinForm,
                      multiRoom: checked,
                      selectedRoomIds: [],
                      roomId: '',
                    })}
                  />
                </div>

                {/* ── Single Room Select ── */}
                {!walkinForm.multiRoom && (
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Room *</Label>
                    <Select value={walkinForm.roomId} onValueChange={(v) => setWalkinForm({ ...walkinForm, roomId: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select room" /></SelectTrigger>
                      <SelectContent>
                        {availableRooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            Room {r.roomNumber} &mdash; {r.roomType.name} ({formatCurrency(r.roomType.baseRate)}/night)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableRooms.length === 0 && (
                      <p className="text-xs text-amber-600">No available rooms. All rooms are occupied.</p>
                    )}
                  </div>
                )}

                {/* ── Multi-Room Selection ── */}
                {walkinForm.multiRoom && (
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Select Rooms * <span className="text-muted-foreground font-normal">(min 2)</span></Label>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      {allRooms.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-3 text-center">No rooms found</p>
                      ) : (
                        allRooms.map((r) => {
                          const isSelected = walkinForm.selectedRoomIds.includes(r.id);
                          const isAvailable = r.status === 'available';
                          return (
                            <button
                              key={r.id}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => isAvailable && toggleRoomSelection(r.id)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm border-b last:border-b-0 transition-colors ${
                                isSelected
                                  ? 'bg-violet-50 border-l-2 border-l-violet-500'
                                  : isAvailable
                                    ? 'hover:bg-muted/50'
                                    : 'opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-violet-500 border-violet-500' : isAvailable ? 'border-muted-foreground/30' : 'border-muted-foreground/20'
                                }`}>
                                  {isSelected && (
                                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="font-medium">Room {r.roomNumber}</span>
                                <span className="text-muted-foreground">({r.roomType.name})</span>
                                {!isAvailable && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-red-50 text-red-600 border-red-200">
                                    {r.status}
                                  </Badge>
                                )}
                              </div>
                              <span className="font-medium text-amber-600">{formatCurrency(r.roomType.baseRate)}/nt</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {walkinForm.selectedRoomIds.length > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-violet-50 border border-violet-200">
                        <span className="text-xs text-violet-700 font-medium">
                          {walkinForm.selectedRoomIds.length} room{walkinForm.selectedRoomIds.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center gap-1">
                          {walkinForm.selectedRoomIds.length > 0 && (
                            <Button type="button" size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 text-violet-600" onClick={() => setWalkinForm({ ...walkinForm, selectedRoomIds: [] })}>
                              <X className="h-3 w-3 mr-0.5" /> Clear
                            </Button>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {walkinForm.selectedRoomIds.map(id => {
                              const r = allRooms.find(rm => rm.id === id);
                              return r ? r.roomNumber : '';
                            }).join(', ')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Dates ── */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Check-in *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-9 justify-start text-left font-normal text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {walkinForm.checkIn ? formatDate(walkinForm.checkIn) : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={walkinForm.checkIn ? new Date(walkinForm.checkIn) : undefined} onSelect={(d) => setWalkinForm({ ...walkinForm, checkIn: d ? d.toISOString() : '' })} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Check-out *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-9 justify-start text-left font-normal text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {walkinForm.checkOut ? formatDate(walkinForm.checkOut) : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={walkinForm.checkOut ? new Date(walkinForm.checkOut) : undefined} onSelect={(d) => setWalkinForm({ ...walkinForm, checkOut: d ? d.toISOString() : '' })} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* ── Cost Estimate ── */}
                {walkinForm.checkIn && walkinForm.checkOut && (walkinForm.roomId || walkinForm.selectedRoomIds.length > 0) && getEstimatedNights() > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-amber-700 font-medium">
                        {walkinForm.multiRoom
                          ? `${walkinForm.selectedRoomIds.length} room${walkinForm.selectedRoomIds.length > 1 ? 's' : ''} x ${getEstimatedNights()} night${getEstimatedNights() > 1 ? 's' : ''}`
                          : `${getEstimatedNights()} night${getEstimatedNights() > 1 ? 's' : ''} at ${formatCurrency(allRooms.find(r => r.id === walkinForm.roomId)?.roomType.baseRate || 0)}/nt`
                        }
                      </span>
                      <span className="text-amber-800 font-bold text-base">{formatCurrency(getEstimatedTotal())}</span>
                    </div>
                    {walkinForm.multiRoom && (
                      <div className="mt-2 space-y-1">
                        {walkinForm.selectedRoomIds.map(id => {
                          const room = allRooms.find(r => r.id === id);
                          if (!room) return null;
                          return (
                            <div key={id} className="flex justify-between text-xs text-amber-600">
                              <span>Room {room.roomNumber} ({room.roomType.name})</span>
                              <span>{formatCurrency(room.roomType.baseRate * getEstimatedNights())}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {getDiscountAmount() > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600 mt-1">
                        <span>Discount</span>
                        <span>-{formatCurrency(getDiscountAmount())}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs mt-1 pt-1 border-t border-amber-300">
                      <span className="font-medium text-amber-800">Total</span>
                      <span className="font-bold text-amber-800">{formatCurrency(getEstimatedTotal())}</span>
                    </div>
                    <p className="text-[10px] text-amber-500 mt-1">A bill will be auto-created.</p>
                  </div>
                )}

                {/* ── Submit ── */}
                <Button className="bg-amber-500 hover:bg-amber-600 text-white w-full" disabled={isSubmitting} onClick={handleWalkinSubmit}>
                  {isSubmitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Register & Check-in
                      {walkinForm.multiRoom && walkinForm.selectedRoomIds.length > 1 && (
                        <span className="ml-1">({walkinForm.selectedRoomIds.length} Rooms)</span>
                      )}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}