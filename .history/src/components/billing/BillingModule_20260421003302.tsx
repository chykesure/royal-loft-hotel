'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, CreditCard, Eye, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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
import {
  RefreshCw, CreditCard, Eye, Trash2, Search, Receipt,
  TrendingUp, Wallet, AlertCircle, FileText, User,
  BedDouble, CalendarDays, CircleDollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

interface Bill {
  id: string;
  reservationId?: string | null;
  guest: { id: string; firstName: string; lastName: string; phone: string };
  reservation?: {
    confirmationCode: string;
    checkIn: string;
    checkOut: string;
    room: { roomNumber: string; roomType: { name: string } };
  } | null;
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
  paymentMethod?: string | null;
  paidAt?: string | null;
  createdAt: string;
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentRef?: string | null;
  notes?: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { badge: string; label: string }> = {
  open: { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Open' },
  partially_paid: { badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Partially Paid' },
  paid: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Paid' },
  cancelled: { badge: 'bg-red-100 text-red-700 border-red-200', label: 'Cancelled' },
};

const methodIcons: Record<string, string> = {
  cash: '💵', pos: '💳', bank_transfer: '🏦',
  opay: '📱', palmpay: '📱', moniepoint: '📱',
};

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'pos', label: 'POS / Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'opay', label: 'OPay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'moniepoint', label: 'Moniepoint' },
];

export function BillingModule() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', ref: '', notes: '' });

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);

  const fetchBills = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/billing?${params}`);
      if (res.ok) setBills(await res.json());
    } catch {
      toast.error('Failed to load bills');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const handlePayment = async () => {
    if (!selectedBill || !payForm.amount || parseFloat(payForm.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const payAmt = parseFloat(payForm.amount);
    if (payAmt > selectedBill.balanceAmount) {
      toast.error(`Amount exceeds outstanding balance of ${formatCurrency(selectedBill.balanceAmount)}`);
      return;
    }
    try {
      const res = await fetch('/api/billing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: selectedBill.id,
          amount: payAmt,
          paymentMethod: payForm.method,
          paymentRef: payForm.ref || undefined,
          notes: payForm.notes || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Payment recorded successfully');
        setPaymentOpen(false);
        setPayForm({ amount: '', method: 'cash', ref: '', notes: '' });
        fetchBills();
        // Refresh selected bill detail
        const billRes = await fetch(`/api/billing?status=all`);
        if (billRes.ok) {
          const allBills = await billRes.json();
          const updated = allBills.find((b: Bill) => b.id === selectedBill.id);
          if (updated) setSelectedBill(updated);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to process payment');
      }
    } catch {
      toast.error('Failed to process payment');
    }
  };

  const confirmDeleteBill = (bill: Bill) => {
    setDeleteTarget(bill);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/billing', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        toast.success('Bill deleted successfully');
        setDeleteOpen(false);
        setDeleteTarget(null);
        setDetailOpen(false);
        fetchBills();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete bill');
      }
    } catch {
      toast.error('Failed to delete bill');
    }
  };

  const totalBilled = bills.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);
  const totalBalance = bills.reduce((s, b) => s + b.balanceAmount, 0);
  const openBills = bills.filter(b => b.status === 'open').length;
  const overdueBills = bills.filter(b => b.status === 'open' && b.createdAt && new Date().getTime() - new Date(b.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000).length;

  const openDetail = (bill: Bill) => {
    setSelectedBill(bill);
    setDetailOpen(true);
  };

  const openPayment = (bill: Bill) => {
    setSelectedBill(bill);
    setPayForm({ amount: String(bill.balanceAmount), method: 'cash', ref: '', notes: '' });
    setPaymentOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">

      {/* ═══════════════ SUMMARY CARDS ═══════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2"><Receipt className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-[11px] text-muted-foreground">Total Billed</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(totalBilled)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2"><Wallet className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-[11px] text-muted-foreground">Total Collected</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2"><AlertCircle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-[11px] text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalBalance)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2"><FileText className="h-5 w-5 text-sky-600" /></div>
            <div>
              <p className="text-[11px] text-muted-foreground">Open Bills</p>
              <p className="text-lg font-bold text-sky-600">{openBills}</p>
              {overdueBills > 0 && <p className="text-[10px] text-red-500">{overdueBills} overdue (7d+)</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ TOOLBAR ═══════════════ */}
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
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={fetchBills}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* ═══════════════ BILLS TABLE ═══════════════ */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead className="hidden md:table-cell">Room</TableHead>
                    <TableHead className="hidden lg:table-cell">Confirmation</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => {
                    const cfg = statusConfig[bill.status] || statusConfig.open;
                    const isOverdue = bill.status === 'open' && new Date().getTime() - new Date(bill.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000;
                    return (
                      <TableRow key={bill.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                            <div>
                              <p className="font-medium text-sm">{bill.guest.firstName} {bill.guest.lastName}</p>
                              <p className="text-[11px] text-muted-foreground">{bill.guest.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {bill.reservation ? (
                            <div className="text-xs">
                              <span className="font-medium">Room {bill.reservation.room.roomNumber}</span>
                              <span className="text-muted-foreground ml-1">({bill.reservation.room.roomType.name})</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {bill.reservation ? (
                            <Badge variant="outline" className="font-mono text-xs">{bill.reservation.confirmationCode}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{formatCurrency(bill.totalAmount)}</TableCell>
                        <TableCell className="text-sm text-emerald-600 font-medium">{formatCurrency(bill.paidAmount)}</TableCell>
                        <TableCell className={`text-sm font-bold ${bill.balanceAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatCurrency(bill.balanceAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] px-2 py-0.5 h-5 ${cfg.badge}`}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDetail(bill)} title="View details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {bill.balanceAmount > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => openPayment(bill)}
                                title="Record payment"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => confirmDeleteBill(bill)} title="Delete bill">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {bills.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No bills found</p>
                        <p className="text-xs opacity-60 mt-1">Bills are automatically created when guests check in</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════ BILL DETAIL DIALOG ═══════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-600" /> Bill Details
            </DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              {/* Guest & Reservation Info */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">{selectedBill.guest.firstName} {selectedBill.guest.lastName}</p>
                  <p className="text-xs text-muted-foreground">{selectedBill.guest.phone}</p>
                </div>
                <Badge className={`text-[10px] px-2 py-0.5 h-5 ${statusConfig[selectedBill.status]?.badge || ''}`}>
                  {statusConfig[selectedBill.status]?.label || selectedBill.status}
                </Badge>
              </div>

              {selectedBill.reservation && (
                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Room {selectedBill.reservation.room.roomNumber} ({selectedBill.reservation.room.roomType.name})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono">{selectedBill.reservation.confirmationCode}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Check-in: {formatDate(selectedBill.reservation.checkIn)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Check-out: {formatDate(selectedBill.reservation.checkOut)}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Charge Breakdown */}
              <div className="space-y-2 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Charges</p>
                {selectedBill.roomCharges > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" /> Room Charges</span><span>{formatCurrency(selectedBill.roomCharges)}</span></div>
                )}
                {selectedBill.foodCharges > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Food & Beverage</span><span>{formatCurrency(selectedBill.foodCharges)}</span></div>
                )}
                {selectedBill.barCharges > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Bar</span><span>{formatCurrency(selectedBill.barCharges)}</span></div>
                )}
                {selectedBill.spaCharges > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Spa</span><span>{formatCurrency(selectedBill.spaCharges)}</span></div>
                )}
                {selectedBill.laundryCharges > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Laundry</span><span>{formatCurrency(selectedBill.laundryCharges)}</span></div>
                )}
                {selectedBill.otherCharges > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Other Charges</span><span>{formatCurrency(selectedBill.otherCharges)}</span></div>
                )}
                {selectedBill.taxAmount > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(selectedBill.taxAmount)}</span></div>
                )}
                {selectedBill.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(selectedBill.discountAmount)}</span></div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-amber-600">{formatCurrency(selectedBill.totalAmount)}</span></div>
                <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{formatCurrency(selectedBill.paidAmount)}</span></div>
                <div className="flex justify-between font-bold text-base"><span>Balance Due</span><span className={selectedBill.balanceAmount > 0 ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(selectedBill.balanceAmount)}</span></div>
              </div>

              {/* Record Payment Button */}
              {selectedBill.balanceAmount > 0 && (
                <>
                  <Separator />
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white w-full" onClick={() => openPayment(selectedBill)}>
                    <CreditCard className="h-4 w-4 mr-2" /> Record Payment — {formatCurrency(selectedBill.balanceAmount)} outstanding
                  </Button>
                </>
              )}

              {/* Payment History */}
              {selectedBill.payments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Payment History ({selectedBill.payments.length})
                    </p>
                    <div className="space-y-2">
                      {selectedBill.payments.map((p) => (
                        <div key={p.id} className="flex justify-between items-center text-sm p-2.5 rounded-lg bg-muted/40 border">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{methodIcons[p.paymentMethod] || '💳'}</span>
                            <div>
                              <p className="capitalize font-medium">{p.paymentMethod.replace(/_/g, ' ')}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatDateTime(p.createdAt)}
                                {p.paymentRef ? <span className="ml-1">• Ref: {p.paymentRef}</span> : ''}
                              </p>
                              {p.notes && <p className="text-[11px] text-muted-foreground italic">"{p.notes}"</p>}
                            </div>
                          </div>
                          <span className="font-bold text-emerald-600">+{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════ PAYMENT DIALOG ═══════════════ */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" /> Record Payment
            </DialogTitle>
            <DialogDescription>
              Recording payment for {selectedBill?.guest.firstName} {selectedBill?.guest.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bill Total</span>
                  <span className="font-medium">{formatCurrency(selectedBill.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="text-emerald-600 font-medium">{formatCurrency(selectedBill.paidAmount)}</span>
                </div>
                <Separator className="my-1.5" />
                <div className="flex justify-between text-sm font-bold">
                  <span>Outstanding Balance</span>
                  <span className="text-red-600">{formatCurrency(selectedBill.balanceAmount)}</span>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Payment Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-medium">₦</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="pl-7"
                      value={payForm.amount}
                      onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-amber-600 justify-start"
                    onClick={() => setPayForm({ ...payForm, amount: String(selectedBill.balanceAmount) })}
                  >
                    Set full balance: {formatCurrency(selectedBill.balanceAmount)}
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>Payment Method *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((m) => (
                      <Button
                        key={m.value}
                        type="button"
                        variant={payForm.method === m.value ? 'default' : 'outline'}
                        className={`h-9 text-xs justify-start ${payForm.method === m.value ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                        onClick={() => setPayForm({ ...payForm, method: m.value })}
                      >
                        {methodIcons[m.value] || '💳'} {m.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Transaction Reference</Label>
                  <Input placeholder="Enter reference number..." value={payForm.ref}
                    onChange={(e) => setPayForm({ ...payForm, ref: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Notes (optional)</Label>
                  <Input placeholder="Any additional notes..." value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
                </div>
                <Button onClick={handlePayment} className="bg-amber-500 hover:bg-amber-600 text-white w-full h-10">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Process Payment — {formatCurrency(parseFloat(payForm.amount) || 0)}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════ DELETE CONFIRMATION ═══════════════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the bill for <strong>{deleteTarget?.guest.firstName} {deleteTarget?.guest.lastName}</strong> ({formatCurrency(deleteTarget?.totalAmount || 0)})? All {deleteTarget?.payments?.length || 0} associated payment record(s) will also be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Delete Bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}