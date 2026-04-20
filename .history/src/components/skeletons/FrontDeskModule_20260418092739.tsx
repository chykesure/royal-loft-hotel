'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  UserCheck, UserMinus, Clock, LogIn, Search, Loader2,
  ArrowDownCircle, ArrowUpCircle, BedDouble, X, CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/auth';

// ─── Types ───────────────────────────────────────────────────────────────────
interface RoomType { id: string; name: string; baseRate: number; maxOccupancy: number; }
interface Room { id: string; roomNumber: string; floor: number; status: string; roomTypeId: string; roomType: RoomType; }
interface Guest { id: string; firstName: string; lastName: string; phone: string; email: string; address?: string; }
interface BillLine {
  id: string; status: string; totalAmount: number; paidAmount: number; balanceAmount: number;
  roomCharges: number; foodCharges: number; barCharges: number; spaCharges: number;
  laundryCharges: number; otherCharges: number; taxAmount: number; discountAmount: number;
  payments: Payment[];
}
interface Payment { id: string; amount: number; paymentMethod: string; paymentRef?: string; notes?: string; createdAt: string; }
interface Reservation {
  id: string; confirmationCode: string; guestId: string; roomId: string;
  checkIn: string; checkOut: string; status: string; source: string;
  adults: number; children: number; roomRate: number; totalAmount: number;
  paidAmount: number; specialRequests?: string; checkedInAt?: string;
  guest: Guest; room: Room; bill?: BillLine | null;
}

const ID_TYPES = ['NIN', 'Passport', 'Drivers License', 'Voters Card'];
const PAYMENT_METHODS = ['cash', 'pos', 'bank_transfer', 'opay', 'palmpay', 'moniepoint'];

export function FrontDeskModule() {
  // ─── Shared State ──────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayArrivals, setTodayArrivals] = useState(0);
  const [todayDepartures, setTodayDepartures] = useState(0);
  const [occupiedRooms, setOccupiedRooms] = useState(0);
  const [availableRooms, setAvailableRooms] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const roomsRes = await fetch('/api/rooms');
      const roomsData = await roomsRes.json();
      setRooms(roomsData.rooms || []);
      setRoomTypes(roomsData.roomTypes || []);
      setAvailableRooms(roomsData.statusCounts?.available || 0);
      setOccupiedRooms(roomsData.statusCounts?.occupied || 0);

      const today = new Date().toISOString().split('T')[0];
      const resRes = await fetch('/api/reservations?status=confirmed');
      const allRes: Reservation[] = await resRes.json();
      const arrivals = allRes.filter(r => r.checkIn && r.checkIn.startsWith(today));
      setTodayArrivals(arrivals.length);

      const checkInRes = await fetch('/api/reservations?status=checked_in');
      const checkedIn: Reservation[] = await checkInRes.json();
      const departures = checkedIn.filter(r => r.checkOut && r.checkOut.startsWith(today));
      setTodayDepartures(departures.length);
    } catch {
      toast.error('Failed to load front desk data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK-IN TAB
  // ═══════════════════════════════════════════════════════════════════════════
  const [ciSearch, setCiSearch] = useState('');
  const [ciSearchResults, setCiSearchResults] = useState<Reservation[]>([]);
  const [ciSearching, setCiSearching] = useState(false);
  const [ciSelected, setCiSelected] = useState<Reservation | null>(null);
  const [ciRoomId, setCiRoomId] = useState('');
  const [ciIdType, setCiIdType] = useState('');
  const [ciIdNumber, setCiIdNumber] = useState('');
  const [ciDiscount, setCiDiscount] = useState('');
  const [ciProcessing, setCiProcessing] = useState(false);

  const handleCiSearch = async () => {
    if (!ciSearch.trim()) return;
    setCiSearching(true);
    setCiSelected(null);
    try {
      const res = await fetch(`/api/reservations?status=confirmed&guest=${encodeURIComponent(ciSearch)}`);
      const data: Reservation[] = await res.json();
      setCiSearchResults(data);
      if (data.length === 0) toast.info('No confirmed reservations found for that search');
    } catch { toast.error('Search failed'); }
    finally { setCiSearching(false); }
  };

  const handleCheckIn = async () => {
    if (!ciSelected) return toast.error('Select a reservation first');
    setCiProcessing(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ciSelected.id, status: 'checked_in' }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();

      const nights = Math.max(1, Math.ceil((new Date(ciSelected.checkOut).getTime() - new Date(ciSelected.checkIn).getTime()) / 86400000));
      const roomCharges = ciSelected.roomRate * nights;
      if (!ciSelected.bill) {
        await fetch('/api/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestId: ciSelected.guestId,
            reservationId: ciSelected.id,
            roomCharges,
            discountAmount: parseFloat(ciDiscount) || 0,
          }),
        });
      }

      toast.success(`Checked in ${ciSelected.guest.firstName} ${ciSelected.guest.lastName} — Room ${updated.room.roomNumber}`);
      setCiSelected(null);
      setCiSearch('');
      setCiSearchResults([]);
      setCiIdType('');
      setCiIdNumber('');
      setCiDiscount('');
      setCiRoomId('');
      loadData();
    } catch { toast.error('Check-in failed'); }
    finally { setCiProcessing(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK-OUT TAB
  // ═══════════════════════════════════════════════════════════════════════════
  const [coSearch, setCoSearch] = useState('');
  const [coSearchResults, setCoSearchResults] = useState<Reservation[]>([]);
  const [coSearching, setCoSearching] = useState(false);
  const [coSelected, setCoSelected] = useState<Reservation | null>(null);
  const [coPaymentAmount, setCoPaymentAmount] = useState('');
  const [coPaymentMethod, setCoPaymentMethod] = useState('');
  const [coProcessing, setCoProcessing] = useState(false);

  const handleCoSearch = async () => {
    if (!coSearch.trim()) return;
    setCoSearching(true);
    setCoSelected(null);
    try {
      const res = await fetch(`/api/reservations?status=checked_in&guest=${encodeURIComponent(coSearch)}`);
      const data: Reservation[] = await res.json();
      const roomMatch = data.filter(r =>
        r.room.roomNumber.toLowerCase().includes(coSearch.toLowerCase())
      );
      setCoSearchResults(roomMatch.length > 0 ? roomMatch : data);
      if (data.length === 0) toast.info('No checked-in guests found');
    } catch { toast.error('Search failed'); }
    finally { setCoSearching(false); }
  };

  const handleCoSelect = async (res: Reservation) => {
    setCoSelected(res);
    try {
      const allRes = await fetch('/api/reservations?guest=');
      const all: Reservation[] = await allRes.json();
      const full = all.find(r => r.id === res.id);
      if (full?.bill) {
        setCoSelected({ ...res, bill: full.bill });
        setCoPaymentAmount(String(Math.max(0, full.bill.balanceAmount || 0)));
      }
    } catch { /* use what we have */ }
  };

  const handleCheckoutPayment = async () => {
    if (!coSelected?.bill) return toast.error('No bill found for this reservation');
    const amount = parseFloat(coPaymentAmount);
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');
    if (!coPaymentMethod) return toast.error('Select payment method');

    setCoProcessing(true);
    try {
      await fetch('/api/billing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: coSelected.bill.id, amount, paymentMethod: coPaymentMethod, notes: 'Checkout payment' }),
      });

      await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coSelected.id, status: 'checked_out' }),
      });

      toast.success(`Checked out ${coSelected.guest.firstName} ${coSelected.guest.lastName} — Room ${coSelected.room.roomNumber}`);
      setCoSelected(null);
      setCoSearch('');
      setCoSearchResults([]);
      setCoPaymentAmount('');
      setCoPaymentMethod('');
      loadData();
    } catch { toast.error('Check-out failed'); }
    finally { setCoProcessing(false); }
  };

  const handleCheckoutOnly = async () => {
    if (!coSelected) return;
    setCoProcessing(true);
    try {
      await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coSelected.id, status: 'checked_out' }),
      });
      toast.success(`Checked out ${coSelected.guest.firstName} ${coSelected.guest.lastName}`);
      setCoSelected(null);
      setCoSearch('');
      setCoSearchResults([]);
      loadData();
    } catch { toast.error('Check-out failed'); }
    finally { setCoProcessing(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // WALK-IN TAB
  // ═══════════════════════════════════════════════════════════════════════════
  const [wiFirstName, setWiFirstName] = useState('');
  const [wiLastName, setWiLastName] = useState('');
  const [wiPhone, setWiPhone] = useState('');
  const [wiEmail, setWiEmail] = useState('');
  const [wiRoomTypeId, setWiRoomTypeId] = useState('');
  const [wiRoomId, setWiRoomId] = useState('');
  const [wiAdults, setWiAdults] = useState('1');
  const [wiCheckIn, setWiCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [wiCheckOut, setWiCheckOut] = useState('');
  const [wiIdType, setWiIdType] = useState('');
  const [wiIdNumber, setWiIdNumber] = useState('');
  const [wiDiscount, setWiDiscount] = useState('');
  const [wiProcessing, setWiProcessing] = useState(false);

  const wiSelectedType = roomTypes.find(rt => rt.id === wiRoomTypeId);
  const wiAvailableRooms = rooms.filter(r => r.status === 'available' && r.roomTypeId === wiRoomTypeId);
  const wiNights = wiCheckIn && wiCheckOut ? Math.max(1, Math.ceil((new Date(wiCheckOut).getTime() - new Date(wiCheckIn).getTime()) / 86400000)) : 0;
  const wiTotal = wiNights * (wiSelectedType?.baseRate || 0);
  const wiDiscountAmt = parseFloat(wiDiscount) || 0;
  const wiGrandTotal = Math.max(0, wiTotal - wiDiscountAmt);

  const handleWalkIn = async () => {
    if (!wiFirstName || !wiLastName || !wiPhone) return toast.error('Guest name and phone are required');
    if (!wiRoomId) return toast.error('Select a room');
    if (!wiCheckIn || !wiCheckOut) return toast.error('Set check-in and check-out dates');
    if (wiNights <= 0) return toast.error('Check-out must be after check-in');

    setWiProcessing(true);
    try {
      // 1. Create guest
      const guestRes = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: wiFirstName, lastName: wiLastName, phone: wiPhone,
          email: wiEmail || undefined, idType: wiIdType || undefined, idNumber: wiIdNumber || undefined,
        }),
      });
      if (!guestRes.ok) throw new Error('Failed to create guest');
      const guest = await guestRes.json();

      // 2. Create reservation (pass discounted total so reservation table matches)
      const resRes = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guestId: guest.id, roomId: wiRoomId, checkIn: wiCheckIn, checkOut: wiCheckOut, adults: parseInt(wiAdults) || 1, source: 'walk_in', totalAmount: wiGrandTotal }),
      });
      if (!resRes.ok) throw new Error('Failed to create reservation');
      const reservation = await resRes.json();

      // 3. Check in immediately
      await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reservation.id, status: 'checked_in' }),
      });

      // 4. Create bill with optional discount
      await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId: guest.id, reservationId: reservation.id, roomCharges: wiTotal, discountAmount: wiDiscountAmt }),
      });

      toast.success(`Walk-in registered! ${wiFirstName} ${wiLastName} — Room ${rooms.find(r => r.id === wiRoomId)?.roomNumber || ''} (${wiNights} night${wiNights > 1 ? 's' : ''})`);
      setWiFirstName(''); setWiLastName(''); setWiPhone(''); setWiEmail('');
      setWiRoomTypeId(''); setWiRoomId(''); setWiAdults('1');
      setWiIdType(''); setWiIdNumber(''); setWiDiscount('');
      setWiCheckOut('');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Walk-in registration failed');
    }
    finally { setWiProcessing(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  if (loading) return (
    <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ─── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-teal-100 p-2.5"><ArrowDownCircle className="h-5 w-5 text-teal-600" /></div>
            <div><p className="text-xs text-muted-foreground">Today&apos;s Arrivals</p><p className="text-xl font-bold text-teal-600">{todayArrivals}</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2.5"><ArrowUpCircle className="h-5 w-5 text-orange-600" /></div>
            <div><p className="text-xs text-muted-foreground">Today&apos;s Departures</p><p className="text-xl font-bold text-orange-600">{todayDepartures}</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5"><BedDouble className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Rooms Occupied</p><p className="text-xl font-bold text-blue-600">{occupiedRooms}</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">Rooms Available</p><p className="text-xl font-bold text-emerald-600">{availableRooms}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="checkin">
        <TabsList className="grid w-full grid-cols-3 lg:w-[420px]">
          <TabsTrigger value="checkin"><UserCheck className="h-4 w-4 mr-1.5" />Check-in</TabsTrigger>
          <TabsTrigger value="checkout"><UserMinus className="h-4 w-4 mr-1.5" />Check-out</TabsTrigger>
          <TabsTrigger value="walkin"><LogIn className="h-4 w-4 mr-1.5" />Walk-in</TabsTrigger>
        </TabsList>

        {/* ═══════════════════ CHECK-IN TAB ═════════════════════════════════ */}
        <TabsContent value="checkin" className="mt-4 space-y-4">
          {/* Search */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Search Reservation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Confirmation code, guest name, or phone..." className="pl-9" value={ciSearch} onChange={e => setCiSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCiSearch()} />
                </div>
                <Button onClick={handleCiSearch} disabled={ciSearching}><Search className="h-4 w-4 mr-1.5" />Search</Button>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {ciSearchResults.length > 0 && !ciSelected && (
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Found {ciSearchResults.length} Reservation{ciSearchResults.length > 1 ? 's' : ''}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {ciSearchResults.map(r => (
                  <div key={r.id} onClick={() => { setCiSelected(r); setCiRoomId(r.roomId); }} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-amber-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.guest.firstName} {r.guest.lastName}</p>
                      <p className="text-xs text-muted-foreground">Room {r.room.roomNumber} ({r.room.roomType.name}) &middot; {r.confirmationCode}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.checkIn)} &rarr; {formatDate(r.checkOut)} &middot; {formatCurrency(r.totalAmount)}</p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">{r.source.replace(/_/g, ' ')}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Check-in Details */}
          {ciSelected && (
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Process Check-in</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setCiSelected(null)}><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Guest Info */}
                <div className="rounded-lg border p-4 bg-muted/20 space-y-1.5">
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Guest</span><span className="font-medium">{ciSelected.guest.firstName} {ciSelected.guest.lastName}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Phone</span><span>{ciSelected.guest.phone}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Code</span><span className="font-mono text-sm">{ciSelected.confirmationCode}</span></div>
                  <Separator className="my-1" />
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Check-in</span><span>{formatDate(ciSelected.checkIn)}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Check-out</span><span>{formatDate(ciSelected.checkOut)}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Rate</span><span>{formatCurrency(ciSelected.roomRate)}/night</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span className="text-amber-600">{formatCurrency(ciSelected.totalAmount)}</span></div>
                </div>

                {/* Room Selection — ALL types grouped */}
                <div className="grid gap-2">
                  <Label>Assigned Room <span className="text-muted-foreground font-normal">(change if needed)</span></Label>
                  <Select value={ciRoomId} onValueChange={setCiRoomId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>
                      {roomTypes.map(rt => (
                        <div key={rt.id}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {rt.name} &mdash; {formatCurrency(rt.baseRate)}/night
                          </div>
                          {rooms.filter(r => r.roomTypeId === rt.id).map(r => (
                            <SelectItem key={r.id} value={r.id} disabled={r.status !== 'available' && r.id !== ciRoomId}>
                              Room {r.roomNumber} (Floor {r.floor}) {r.status !== 'available' ? `&mdash; ${r.status}` : ''}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ID Verification */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>ID Type</Label>
                    <Select value={ciIdType} onValueChange={setCiIdType}>
                      <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
                      <SelectContent>{ID_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>ID Number</Label>
                    <Input placeholder="Enter ID number" value={ciIdNumber} onChange={e => setCiIdNumber(e.target.value)} />
                  </div>
                </div>

                {/* Discount */}
                <div className="grid gap-2">
                  <Label>Discount <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input type="number" placeholder="Enter discount amount" value={ciDiscount} onChange={e => setCiDiscount(e.target.value)} min="0" />
                </div>

                {/* Special Requests */}
                <div className="grid gap-2">
                  <Label>Special Requests</Label>
                  <Input placeholder="Any special requests..." />
                </div>

                <Button onClick={handleCheckIn} disabled={ciProcessing} className="bg-amber-500 hover:bg-amber-600 text-white w-full h-11">
                  {ciProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                  Confirm Check-in
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════ CHECK-OUT TAB ════════════════════════════════ */}
        <TabsContent value="checkout" className="mt-4 space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Find Checked-in Guest</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Room number or guest name..." className="pl-9" value={coSearch} onChange={e => setCoSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCoSearch()} />
                </div>
                <Button onClick={handleCoSearch} disabled={coSearching}><Search className="h-4 w-4 mr-1.5" />Search</Button>
              </div>
            </CardContent>
          </Card>

          {coSearchResults.length > 0 && !coSelected && (
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Found {coSearchResults.length} Guest{coSearchResults.length > 1 ? 's' : ''}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {coSearchResults.map(r => (
                  <div key={r.id} onClick={() => handleCoSelect(r)} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-amber-50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{r.guest.firstName} {r.guest.lastName}</p>
                      <p className="text-xs text-muted-foreground">Room {r.room.roomNumber} ({r.room.roomType.name}) &middot; Since {formatDate(r.checkIn)}</p>
                    </div>
                    <Badge variant="secondary" className="ml-2">Due {formatDate(r.checkOut)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {coSelected && (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Bill Summary */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Bill Summary</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => { setCoSelected(null); setCoSearchResults([]); }}><X className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border p-4 bg-muted/20 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Room {coSelected.room.roomNumber} ({coSelected.room.roomType.name})</span><Badge variant="outline">Checked In</Badge></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Guest</span><span>{coSelected.guest.firstName} {coSelected.guest.lastName}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Stay</span><span>{formatDate(coSelected.checkIn)} &rarr; {formatDate(coSelected.checkOut)}</span></div>
                    <Separator />
                    {coSelected.bill ? (
                      <>
                        <div className="flex justify-between text-sm"><span>Room Charges</span><span>{formatCurrency(coSelected.bill.roomCharges)}</span></div>
                        {coSelected.bill.foodCharges > 0 && <div className="flex justify-between text-sm"><span>Food &amp; Beverage</span><span>{formatCurrency(coSelected.bill.foodCharges)}</span></div>}
                        {coSelected.bill.barCharges > 0 && <div className="flex justify-between text-sm"><span>Bar</span><span>{formatCurrency(coSelected.bill.barCharges)}</span></div>}
                        {coSelected.bill.spaCharges > 0 && <div className="flex justify-between text-sm"><span>Spa</span><span>{formatCurrency(coSelected.bill.spaCharges)}</span></div>}
                        {coSelected.bill.laundryCharges > 0 && <div className="flex justify-between text-sm"><span>Laundry</span><span>{formatCurrency(coSelected.bill.laundryCharges)}</span></div>}
                        {coSelected.bill.otherCharges > 0 && <div className="flex justify-between text-sm"><span>Other</span><span>{formatCurrency(coSelected.bill.otherCharges)}</span></div>}
                        {coSelected.bill.discountAmount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{formatCurrency(coSelected.bill.discountAmount)}</span></div>}
                        <Separator />
                        <div className="flex justify-between font-bold"><span>Total Bill</span><span>{formatCurrency(coSelected.bill.totalAmount)}</span></div>
                        <div className="flex justify-between text-sm text-green-600"><span>Already Paid</span><span>{formatCurrency(coSelected.bill.paidAmount)}</span></div>
                        <div className="flex justify-between font-bold text-red-600"><span>Balance Due</span><span>{formatCurrency(coSelected.bill.balanceAmount)}</span></div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No bill on record &mdash; checkout will use reservation total: {formatCurrency(coSelected.totalAmount)}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment + Checkout */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base">Process Check-out</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {coSelected.bill && coSelected.bill.balanceAmount > 0 ? (
                    <>
                      <div className="grid gap-2">
                        <Label>Payment Amount</Label>
                        <Input type="number" value={coPaymentAmount} onChange={e => setCoPaymentAmount(e.target.value)} placeholder="0" />
                        <p className="text-xs text-muted-foreground">Balance due: {formatCurrency(coSelected.bill.balanceAmount)}</p>
                      </div>
                      <div className="grid gap-2">
                        <Label>Payment Method</Label>
                        <Select value={coPaymentMethod} onValueChange={setCoPaymentMethod}>
                          <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map(m => (
                              <SelectItem key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCheckoutPayment} disabled={coProcessing || !coPaymentMethod} className="bg-amber-500 hover:bg-amber-600 text-white w-full h-11">
                        {coProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                        Pay &amp; Check-out
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleCheckoutOnly} disabled={coProcessing} className="bg-orange-500 hover:bg-orange-600 text-white w-full h-11">
                      {coProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserMinus className="h-4 w-4 mr-2" />}
                      Check-out (Bill Settled)
                    </Button>
                  )}

                  {coSelected.bill && coSelected.bill.payments.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium">Payment History</p>
                        {coSelected.bill.payments.map((p: Payment) => (
                          <div key={p.id} className="flex justify-between text-sm text-muted-foreground">
                            <span>{formatCurrency(p.amount)} via {p.paymentMethod.replace(/_/g, ' ')}</span>
                            <span>{formatDate(p.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ WALK-IN TAB ══════════════════════════════════ */}
        <TabsContent value="walkin" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Guest Info */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Guest Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label>First Name *</Label><Input placeholder="First name" value={wiFirstName} onChange={e => setWiFirstName(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label>Last Name *</Label><Input placeholder="Last name" value={wiLastName} onChange={e => setWiLastName(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label>Phone *</Label><Input placeholder="Phone number" value={wiPhone} onChange={e => setWiPhone(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label>Email</Label><Input type="email" placeholder="Email (optional)" value={wiEmail} onChange={e => setWiEmail(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>ID Type</Label>
                    <Select value={wiIdType} onValueChange={setWiIdType}>
                      <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
                      <SelectContent>{ID_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5"><Label>ID Number</Label><Input placeholder="ID number" value={wiIdNumber} onChange={e => setWiIdNumber(e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>

            {/* Room & Stay */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Room &amp; Stay Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {/* Room Type — ALL types from DB */}
                <div className="grid gap-1.5">
                  <Label>Room Type *</Label>
                  <Select value={wiRoomTypeId} onValueChange={v => { setWiRoomTypeId(v); setWiRoomId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                    <SelectContent>
                      {roomTypes.map(rt => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name} &mdash; {formatCurrency(rt.baseRate)}/night ({rooms.filter(r => r.roomTypeId === rt.id && r.status === 'available').length} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Room — filtered by type, only available */}
                {wiRoomTypeId && (
                  <div className="grid gap-1.5">
                    <Label>Select Room *</Label>
                    <Select value={wiRoomId} onValueChange={setWiRoomId}>
                      <SelectTrigger><SelectValue placeholder={wiAvailableRooms.length === 0 ? 'No rooms available' : 'Select room'} /></SelectTrigger>
                      <SelectContent>
                        {wiAvailableRooms.length > 0 ? wiAvailableRooms.map(r => (
                          <SelectItem key={r.id} value={r.id}>Room {r.roomNumber} (Floor {r.floor})</SelectItem>
                        )) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No available rooms for this type</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label>Adults</Label>
                    <Select value={wiAdults} onValueChange={setWiAdults}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['1', '2', '3', '4'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5"><Label>Check-in</Label><Input type="date" value={wiCheckIn} onChange={e => setWiCheckIn(e.target.value)} /></div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Check-out</Label>
                  <Input type="date" value={wiCheckOut} onChange={e => setWiCheckOut(e.target.value)} min={wiCheckIn} />
                </div>

                {/* Discount */}
                <div className="grid gap-1.5">
                  <Label>Discount <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input type="number" placeholder="Enter discount amount (optional)" value={wiDiscount} onChange={e => setWiDiscount(e.target.value)} min="0" />
                </div>

                {/* Price Summary */}
                {wiNights > 0 && wiSelectedType && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                    <div className="flex justify-between text-sm"><span>{wiSelectedType.name} x {wiNights} night{wiNights > 1 ? 's' : ''}</span><span>{formatCurrency(wiTotal)}</span></div>
                    {wiDiscountAmt > 0 && (
                      <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{formatCurrency(wiDiscountAmt)}</span></div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-amber-700"><span>Estimated Total</span><span>{formatCurrency(wiGrandTotal)}</span></div>
                  </div>
                )}

                <Button onClick={handleWalkIn} disabled={wiProcessing || !wiRoomId || wiNights <= 0} className="bg-amber-500 hover:bg-amber-600 text-white w-full h-11">
                  {wiProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                  Register &amp; Check-in
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}