'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UserCheck, UserMinus, Clock, Phone, AlertCircle,
  ArrowDownCircle, ArrowUpCircle, Search, Loader2, BedDouble,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/auth';

// ─── Types ───────────────────────────────────────────────────

interface SummaryData {
  todayArrivals: number;
  todayDepartures: number;
  overdueCheckouts: number;
}

interface CheckinReservation {
  id: string;
  confirmationCode: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomRate: number;
  totalAmount: number;
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    idType: string | null;
    idNumber: string | null;
  };
  room: {
    id: string;
    roomNumber: string;
    floor: number;
    roomType: {
      id: string;
      name: string;
      baseRate: number;
    };
  };
}

interface CheckoutReservation extends CheckinReservation {
  checkedInAt: string | null;
  bill: {
    id: string;
    roomCharges: number;
    foodCharges: number;
    barCharges: number;
    spaCharges: number;
    laundryCharges: number;
    otherCharges: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    paymentMethod: string | null;
  } | null;
}

interface AvailableRoomGroup {
  roomType: { id: string; name: string; baseRate: number };
  rooms: { id: string; roomNumber: string; floor: number }[];
}

// ─── Constants ───────────────────────────────────────────────

const ID_TYPES = [
  { value: 'NIN', label: 'National ID (NIN)' },
  { value: 'Passport', label: 'Passport' },
  { value: 'Drivers License', label: "Driver's License" },
  { value: 'Voters Card', label: "Voter's Card" },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'pos', label: 'POS / Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'opay', label: 'OPay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'moniepoint', label: 'Moniepoint' },
];

function getNights(checkIn: string, checkOut: string): number {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  return Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)));
}

// ─── Component ───────────────────────────────────────────────

export function FrontDeskModule() {
  // Summary
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Check-in tab
  const [arrivals, setArrivals] = useState<CheckinReservation[]>([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [selectedArrival, setSelectedArrival] = useState<CheckinReservation | null>(null);
  const [checkinForm, setCheckinForm] = useState({ idType: '', idNumber: '', specialRequests: '' });
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);

  // Check-out tab
  const [departures, setDepartures] = useState<CheckoutReservation[]>([]);
  const [departuresLoading, setDeparturesLoading] = useState(true);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState<CheckoutReservation | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({ paymentMethod: 'cash', paymentAmount: '' });
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  // Walk-in tab
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomGroup[]>([]);
  const [availableRoomsLoading, setAvailableRoomsLoading] = useState(true);
  const [walkinForm, setWalkinForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    roomTypeId: '', checkOut: '', adults: '1',
    idType: '', idNumber: '',
  });
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);

  // ─── Data Fetching ────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await fetch('/api/front-desk');
      if (res.ok) setSummary(await res.json());
    } catch {
      toast.error('Failed to load summary');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchArrivals = useCallback(async () => {
    try {
      setArrivalsLoading(true);
      const res = await fetch('/api/front-desk?action=checkin');
      if (res.ok) setArrivals(await res.json());
    } catch {
      toast.error('Failed to load arrivals');
    } finally {
      setArrivalsLoading(false);
    }
  }, []);

  const fetchDepartures = useCallback(async () => {
    try {
      setDeparturesLoading(true);
      const res = await fetch('/api/front-desk?action=checkout');
      if (res.ok) setDepartures(await res.json());
    } catch {
      toast.error('Failed to load departures');
    } finally {
      setDeparturesLoading(false);
    }
  }, []);

  const fetchAvailableRooms = useCallback(async () => {
    try {
      setAvailableRoomsLoading(true);
      const res = await fetch('/api/front-desk?action=available-rooms');
      if (res.ok) setAvailableRooms(await res.json());
    } catch {
      toast.error('Failed to load available rooms');
    } finally {
      setAvailableRoomsLoading(false);
    }
  }, []);

  const fetchAll = useCallback(() => {
    fetchSummary();
    fetchArrivals();
    fetchDepartures();
    fetchAvailableRooms();
  }, [fetchSummary, fetchArrivals, fetchDepartures, fetchAvailableRooms]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Handlers ─────────────────────────────────────────────

  const openCheckinDialog = (reservation: CheckinReservation) => {
    setSelectedArrival(reservation);
    setCheckinForm({
      idType: reservation.guest.idType || '',
      idNumber: reservation.guest.idNumber || '',
      specialRequests: '',
    });
    setCheckinDialogOpen(true);
  };

  const handleCheckin = async () => {
    if (!selectedArrival) return;
    if (!checkinForm.idType || !checkinForm.idNumber) {
      toast.error('ID Type and ID Number are required');
      return;
    }
    try {
      setCheckinSubmitting(true);
      const res = await fetch('/api/front-desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkin',
          reservationId: selectedArrival.id,
          idType: checkinForm.idType,
          idNumber: checkinForm.idNumber,
          specialRequests: checkinForm.specialRequests || undefined,
        }),
      });
      if (res.ok) {
        toast.success(`${selectedArrival.guest.firstName} ${selectedArrival.guest.lastName} checked in successfully!`);
        setCheckinDialogOpen(false);
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Check-in failed');
      }
    } catch {
      toast.error('Failed to process check-in');
    } finally {
      setCheckinSubmitting(false);
    }
  };

  const openCheckoutDialog = (reservation: CheckoutReservation) => {
    setSelectedDeparture(reservation);
    setCheckoutForm({
      paymentMethod: 'cash',
      paymentAmount: reservation.bill ? String(reservation.bill.balanceAmount) : '',
    });
    setCheckoutDialogOpen(true);
  };

  const handleCheckout = async () => {
    if (!selectedDeparture) return;
    try {
      setCheckoutSubmitting(true);
      const res = await fetch('/api/front-desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          reservationId: selectedDeparture.id,
          paymentMethod: checkoutForm.paymentMethod,
          paymentAmount: checkoutForm.paymentAmount || '0',
        }),
      });
      if (res.ok) {
        toast.success(`${selectedDeparture.guest.firstName} ${selectedDeparture.guest.lastName} checked out successfully!`);
        setCheckoutDialogOpen(false);
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Check-out failed');
      }
    } catch {
      toast.error('Failed to process check-out');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleWalkin = async () => {
    const { firstName, lastName, phone, roomTypeId, checkOut, adults } = walkinForm;
    if (!firstName || !lastName || !phone || !roomTypeId || !checkOut) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setWalkinSubmitting(true);
      const res = await fetch('/api/front-desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'walkin',
          firstName,
          lastName,
          phone,
          email: walkinForm.email || undefined,
          roomTypeId,
          checkOut,
          adults: parseInt(adults) || 1,
          idType: walkinForm.idType || undefined,
          idNumber: walkinForm.idNumber || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Walk-in registered! Room ${data.room.roomNumber} assigned to ${firstName} ${lastName}`);
        setWalkinForm({
          firstName: '', lastName: '', phone: '', email: '',
          roomTypeId: '', checkOut: '', adults: '1',
          idType: '', idNumber: '',
        });
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Walk-in registration failed');
      }
    } catch {
      toast.error('Failed to register walk-in');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  // ─── Filtered arrivals ────────────────────────────────────

  const filteredArrivals = arrivals.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.guest.firstName.toLowerCase().includes(q) ||
      r.guest.lastName.toLowerCase().includes(q) ||
      r.confirmationCode.toLowerCase().includes(q) ||
      r.guest.phone.includes(q)
    );
  });

  // ─── Default checkout date (tomorrow) ────────────────────

  const getDefaultCheckOut = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-8" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-teal-100 p-2.5">
                  <ArrowDownCircle className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected Arrivals</p>
                  <p className="text-xl font-bold text-teal-600">{summary?.todayArrivals ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2.5">
                  <ArrowUpCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected Departures</p>
                  <p className="text-xl font-bold text-orange-600">{summary?.todayDepartures ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2.5">
                  <Clock className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Overdue Checkouts</p>
                  <p className="text-xl font-bold text-red-600">{summary?.overdueCheckouts ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="checkin">
        <TabsList>
          <TabsTrigger value="checkin">
            <UserCheck className="h-4 w-4 mr-1.5" /> Check-in
          </TabsTrigger>
          <TabsTrigger value="checkout">
            <UserMinus className="h-4 w-4 mr-1.5" /> Check-out
          </TabsTrigger>
          <TabsTrigger value="walkin">
            <BedDouble className="h-4 w-4 mr-1.5" /> Walk-in
          </TabsTrigger>
        </TabsList>

        {/* ── Check-in Tab ──────────────────────────────────── */}
        <TabsContent value="checkin" className="mt-4 space-y-4">
          {/* Search */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, confirmation code, or phone..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Arrivals List */}
          {arrivalsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-none shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredArrivals.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <UserCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No arrivals match your search' : 'No arrivals expected today'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto">
              {filteredArrivals.map((res) => (
                <Card key={res.id} className="border-none shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">
                            {res.guest.firstName} {res.guest.lastName}
                          </p>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {res.confirmationCode}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-3 w-3" />
                            Room {res.room.roomNumber} &middot; {res.room.roomType.name} (Floor {res.room.floor})
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(res.checkIn)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {res.guest.phone}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{getNights(res.checkIn, res.checkOut)} night(s)</span>
                          <span>&middot; {res.adults} adult(s){res.children > 0 ? `, ${res.children} child(ren)` : ''}</span>
                          <span>&middot; {formatCurrency(res.totalAmount)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white whitespace-nowrap"
                        onClick={() => openCheckinDialog(res)}
                      >
                        <UserCheck className="h-4 w-4 mr-1.5" /> Process Check-in
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Check-out Tab ─────────────────────────────────── */}
        <TabsContent value="checkout" className="mt-4 space-y-4">
          {departuresLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-none shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : departures.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <UserMinus className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No departures scheduled for today
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto">
              {departures.map((res) => (
                <Card key={res.id} className="border-none shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">
                            {res.guest.firstName} {res.guest.lastName}
                          </p>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {res.confirmationCode}
                          </Badge>
                          <Badge className="bg-orange-100 text-orange-700 text-[10px]">Checked In</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-3 w-3" />
                            Room {res.room.roomNumber} &middot; {res.room.roomType.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getNights(res.checkIn, res.checkOut)} night(s)
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap"
                        onClick={() => openCheckoutDialog(res)}
                      >
                        <UserMinus className="h-4 w-4 mr-1.5" /> Process Check-out
                      </Button>
                    </div>

                    {/* Bill Breakdown */}
                    {res.bill && (
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Room</span>
                            <span className="font-medium sm:float-right">{formatCurrency(res.bill.roomCharges)}</span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Food</span>
                            <span className="font-medium sm:float-right">{formatCurrency(res.bill.foodCharges)}</span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Bar</span>
                            <span className="font-medium sm:float-right">{formatCurrency(res.bill.barCharges)}</span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Spa</span>
                            <span className="font-medium sm:float-right">{formatCurrency(res.bill.spaCharges)}</span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Laundry</span>
                            <span className="font-medium sm:float-right">{formatCurrency(res.bill.laundryCharges)}</span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-muted-foreground">Other</span>
                            <span className="font-medium sm:float-right">{formatCurrency(res.bill.otherCharges)}</span>
                          </div>
                          {res.bill.taxAmount > 0 && (
                            <div className="flex justify-between sm:block">
                              <span className="text-muted-foreground">Tax</span>
                              <span className="font-medium sm:float-right">{formatCurrency(res.bill.taxAmount)}</span>
                            </div>
                          )}
                          {res.bill.discountAmount > 0 && (
                            <div className="flex justify-between sm:block text-emerald-600">
                              <span>Discount</span>
                              <span className="font-medium sm:float-right">-{formatCurrency(res.bill.discountAmount)}</span>
                            </div>
                          )}
                        </div>
                        <Separator className="my-2" />
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs">
                          <div className="flex gap-4">
                            <span className="text-muted-foreground">Total: <span className="font-bold text-foreground">{formatCurrency(res.bill.totalAmount)}</span></span>
                            <span className="text-emerald-600">Paid: <span className="font-medium">{formatCurrency(res.bill.paidAmount)}</span></span>
                          </div>
                          <span className="text-red-600 font-bold">
                            Balance: {formatCurrency(res.bill.balanceAmount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Walk-in Tab ───────────────────────────────────── */}
        <TabsContent value="walkin" className="mt-4">
          <Card className="border-none shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Walk-in Registration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>First Name *</Label>
                  <Input
                    placeholder="Guest first name"
                    value={walkinForm.firstName}
                    onChange={(e) => setWalkinForm({ ...walkinForm, firstName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Last Name *</Label>
                  <Input
                    placeholder="Guest last name"
                    value={walkinForm.lastName}
                    onChange={(e) => setWalkinForm({ ...walkinForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Phone *</Label>
                  <Input
                    placeholder="Phone number"
                    value={walkinForm.phone}
                    onChange={(e) => setWalkinForm({ ...walkinForm, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="Email (optional)"
                    value={walkinForm.email}
                    onChange={(e) => setWalkinForm({ ...walkinForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Room Type *</Label>
                {availableRoomsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : availableRooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No rooms currently available</p>
                ) : (
                  <Select
                    value={walkinForm.roomTypeId}
                    onValueChange={(v) => setWalkinForm({ ...walkinForm, roomTypeId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((group) => (
                        <SelectItem key={group.roomType.id} value={group.roomType.id}>
                          {group.roomType.name} — {formatCurrency(group.roomType.baseRate)}/night ({group.rooms.length} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Check-out Date *</Label>
                  <Input
                    type="date"
                    min={getDefaultCheckOut()}
                    value={walkinForm.checkOut}
                    onChange={(e) => setWalkinForm({ ...walkinForm, checkOut: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Number of Adults</Label>
                  <Select
                    value={walkinForm.adults}
                    onValueChange={(v) => setWalkinForm({ ...walkinForm, adults: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Identification</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>ID Type</Label>
                  <Select
                    value={walkinForm.idType}
                    onValueChange={(v) => setWalkinForm({ ...walkinForm, idType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>ID Number</Label>
                  <Input
                    placeholder="ID number"
                    value={walkinForm.idNumber}
                    onChange={(e) => setWalkinForm({ ...walkinForm, idNumber: e.target.value })}
                  />
                </div>
              </div>

              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white w-full"
                onClick={handleWalkin}
                disabled={walkinSubmitting || availableRooms.length === 0}
              >
                {walkinSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                Register & Check-in
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Check-in Dialog ─────────────────────────────────── */}
      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-teal-600" />
              Process Check-in
            </DialogTitle>
          </DialogHeader>
          {selectedArrival && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p className="font-semibold">{selectedArrival.guest.firstName} {selectedArrival.guest.lastName}</p>
                <p className="text-muted-foreground">
                  Room {selectedArrival.room.roomNumber} &middot; {selectedArrival.room.roomType.name}
                </p>
                <p className="text-muted-foreground">
                  {selectedArrival.confirmationCode} &middot; {getNights(selectedArrival.checkIn, selectedArrival.checkOut)} night(s)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>ID Type *</Label>
                  <Select
                    value={checkinForm.idType}
                    onValueChange={(v) => setCheckinForm({ ...checkinForm, idType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>ID Number *</Label>
                  <Input
                    placeholder="ID number"
                    value={checkinForm.idNumber}
                    onChange={(e) => setCheckinForm({ ...checkinForm, idNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Special Requests</Label>
                <Input
                  placeholder="Any special requests..."
                  value={checkinForm.specialRequests}
                  onChange={(e) => setCheckinForm({ ...checkinForm, specialRequests: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCheckinDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={handleCheckin}
                  disabled={checkinSubmitting}
                >
                  {checkinSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4 mr-2" />
                  )}
                  Confirm Check-in
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Check-out Dialog ────────────────────────────────── */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-orange-600" />
              Process Check-out
            </DialogTitle>
          </DialogHeader>
          {selectedDeparture && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p className="font-semibold">{selectedDeparture.guest.firstName} {selectedDeparture.guest.lastName}</p>
                <p className="text-muted-foreground">
                  Room {selectedDeparture.room.roomNumber} &middot; {getNights(selectedDeparture.checkIn, selectedDeparture.checkOut)} night(s)
                </p>
                <p className="text-muted-foreground">{selectedDeparture.confirmationCode}</p>
              </div>

              {selectedDeparture.bill && (
                <div className="rounded-lg border p-3 bg-muted/30 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">{formatCurrency(selectedDeparture.bill.totalAmount)}</span></div>
                  <div className="flex justify-between text-emerald-600"><span>Already Paid</span><span>{formatCurrency(selectedDeparture.bill.paidAmount)}</span></div>
                  <Separator className="my-1" />
                  <div className="flex justify-between text-red-600 font-bold text-sm">
                    <span>Balance Due</span>
                    <span>{formatCurrency(selectedDeparture.bill.balanceAmount)}</span>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select
                  value={checkoutForm.paymentMethod}
                  onValueChange={(v) => setCheckoutForm({ ...checkoutForm, paymentMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Payment Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={checkoutForm.paymentAmount}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, paymentAmount: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCheckoutDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleCheckout}
                  disabled={checkoutSubmitting}
                >
                  {checkoutSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4 mr-2" />
                  )}
                  Confirm Check-out
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
