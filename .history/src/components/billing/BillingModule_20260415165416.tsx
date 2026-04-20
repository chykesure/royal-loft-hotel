'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDate } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { RefreshCw, CreditCard, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Bill {
  id: string;
  reservationId?: string | null;
  guest: { id: string; firstName: string; lastName: string };
  reservation?: { confirmationCode: string } | null;
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

const statusBadge: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
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
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/billing${params}`);
      if (res.ok) setBills(await res.json());
    } catch {
      toast.error('Failed to load bills');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const handlePayment = async () => {
    if (!selectedBill || !payForm.amount || parseFloat(payForm.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      const res = await fetch('/api/billing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: selectedBill.id,
          amount: parseFloat(payForm.amount),
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
        // Refresh detail view
        const detailRes = await fetch(`/api/billing?status=open`);
        if (detailRes.ok) {
          const allBills = await detailRes.json();
          const updated = allBills.find((b: Bill) => b.id === selectedBill.id);
          if (updated) setSelectedBill(updated);
        }
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

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Billed</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(totalBilled)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Collected</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Outstanding Balance</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground mr-1">Filter:</span>
        {['all', 'open', 'partially_paid', 'paid'].map((s) => (
          <Badge
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-amber-50 hover:text-amber-700 transition-colors capitalize"
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </Badge>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={fetchBills}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Bills Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead className="hidden sm:table-cell">Confirmation</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Method</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium text-sm">{bill.guest.firstName} {bill.guest.lastName}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {bill.reservation && <Badge variant="outline" className="font-mono text-xs">{bill.reservation.confirmationCode}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{formatCurrency(bill.totalAmount)}</TableCell>
                    <TableCell className="text-sm text-emerald-600">{formatCurrency(bill.paidAmount)}</TableCell>
                    <TableCell className="text-sm text-red-600">{formatCurrency(bill.balanceAmount)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] px-2 py-0.5 h-5 ${statusBadge[bill.status] || ''}`}>
                        {bill.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm capitalize">{bill.paymentMethod?.replace('_', ' ') || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedBill(bill); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => confirmDeleteBill(bill)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {bills.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No bills found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bill Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bill Details</DialogTitle></DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedBill.guest.firstName} {selectedBill.guest.lastName}</p>
                  {selectedBill.reservation && <p className="text-xs text-muted-foreground">{selectedBill.reservation.confirmationCode}</p>}
                </div>
                <Badge className={`text-[10px] px-2 py-0.5 h-5 ${statusBadge[selectedBill.status]}`}>
                  {selectedBill.status.replace('_', ' ')}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Room Charges</span><span>{formatCurrency(selectedBill.roomCharges)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Food & Beverage</span><span>{formatCurrency(selectedBill.foodCharges)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bar</span><span>{formatCurrency(selectedBill.barCharges)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Spa</span><span>{formatCurrency(selectedBill.spaCharges)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Laundry</span><span>{formatCurrency(selectedBill.laundryCharges)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Other</span><span>{formatCurrency(selectedBill.otherCharges)}</span></div>
                {selectedBill.taxAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax (7.5%)</span><span>{formatCurrency(selectedBill.taxAmount)}</span></div>}
                {selectedBill.discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(selectedBill.discountAmount)}</span></div>}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(selectedBill.totalAmount)}</span></div>
                <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{formatCurrency(selectedBill.paidAmount)}</span></div>
                <div className="flex justify-between font-bold text-red-600"><span>Balance</span><span>{formatCurrency(selectedBill.balanceAmount)}</span></div>
              </div>

              {selectedBill.balanceAmount > 0 && (
                <>
                  <Separator />
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white w-full" onClick={() => setPaymentOpen(true)}>
                    <CreditCard className="h-4 w-4 mr-2" /> Record Payment
                  </Button>
                </>
              )}

              {selectedBill.payments.length > 0 && (
                <>
                  <Separator />
                  <h4 className="font-medium text-sm">Payment History</h4>
                  <div className="space-y-2">
                    {selectedBill.payments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded bg-muted/50">
                        <div>
                          <p className="capitalize">{p.paymentMethod.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)}{p.paymentRef ? ` • Ref: ${p.paymentRef}` : ''}</p>
                        </div>
                        <span className="font-medium text-emerald-600">+{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Outstanding: <span className="font-bold text-red-600">{formatCurrency(selectedBill.balanceAmount)}</span>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Amount *</Label>
                  <Input type="number" placeholder="0.00" value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Payment Method *</Label>
                  <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Reference</Label>
                  <Input placeholder="Transaction reference..." value={payForm.ref}
                    onChange={(e) => setPayForm({ ...payForm, ref: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Input placeholder="Optional notes..." value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
                </div>
                <Button onClick={handlePayment} className="bg-amber-500 hover:bg-amber-600 text-white">
                  Process Payment
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
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the bill for {deleteTarget?.guest.firstName} {deleteTarget?.guest.lastName} ({formatCurrency(deleteTarget?.totalAmount || 0)})? All associated payment records will also be permanently removed.
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
