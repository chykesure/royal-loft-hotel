'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrency, formatDate } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  RefreshCw, FileText, Eye, Printer, Download, Trash2,
  Plus, Search, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoiceNumber: string;
  billId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  guestAddress?: string | null;
  hotelName: string;
  hotelAddress?: string | null;
  hotelPhone?: string | null;
  hotelEmail?: string | null;
  hotelWebsite?: string | null;
  confirmationCode?: string | null;
  roomNumber?: string | null;
  roomType?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  nights: number;
  roomRate: number;
  roomCharges: number;
  foodCharges: number;
  barCharges: number;
  spaCharges: number;
  laundryCharges: number;
  otherCharges: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod?: string | null;
  paymentRef?: string | null;
  status: string;
  notes?: string | null;
  issuedAt: string;
  dueAt?: string | null;
  createdAt: string;
}

interface Bill {
  id: string;
  guest: { id: string; firstName: string; lastName: string };
  reservation?: { confirmationCode: string } | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  paymentMethod?: string | null;
}

const statusBadge: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid', cancelled: 'Cancelled',
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash', pos: 'POS / Card', bank_transfer: 'Bank Transfer',
  opay: 'OPay', palmpay: 'PalmPay', moniepoint: 'Moniepoint',
};

function InvoicePrintView({ invoice, printRef }: { invoice: Invoice; printRef: React.RefObject<HTMLDivElement | null> }) {
  const lineItems = [
    { label: `Room Charges (${invoice.nights} night${invoice.nights > 1 ? 's' : ''} x ${formatCurrency(invoice.roomRate)})`, amount: invoice.roomCharges },
    { label: 'Food & Beverage', amount: invoice.foodCharges },
    { label: 'Bar Services', amount: invoice.barCharges },
    { label: 'Spa & Wellness', amount: invoice.spaCharges },
    { label: 'Laundry Service', amount: invoice.laundryCharges },
    { label: 'Other Charges', amount: invoice.otherCharges },
  ].filter((item) => item.amount > 0);

  return (
    <div ref={printRef} className="bg-white text-gray-900 w-full max-w-[210mm] mx-auto" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '13px', lineHeight: '1.5' }}>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="print-area p-8 md:p-10 min-h-[297mm] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-amber-500">
          <div>
            <h1 className="text-2xl font-bold text-amber-700 tracking-tight">{invoice.hotelName}</h1>
            {invoice.hotelAddress && <p className="text-xs text-gray-500 mt-1">{invoice.hotelAddress}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {invoice.hotelPhone && <p className="text-xs text-gray-500">Tel: {invoice.hotelPhone}</p>}
              {invoice.hotelEmail && <p className="text-xs text-gray-500">Email: {invoice.hotelEmail}</p>}
              {invoice.hotelWebsite && <p className="text-xs text-gray-500">Web: {invoice.hotelWebsite}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-800 tracking-wide">INVOICE</h2>
            <p className="text-sm font-mono text-gray-600 mt-1">{invoice.invoiceNumber}</p>
            <div className="mt-2 space-y-0.5">
              <p className="text-xs text-gray-500">Issued: {formatDate(invoice.issuedAt)}</p>
              {invoice.dueAt && <p className="text-xs text-gray-500">Due: {formatDate(invoice.dueAt)}</p>}
            </div>
            <Badge className={`mt-2 text-[10px] px-2 py-0.5 ${statusBadge[invoice.status] || ''}`}>
              {statusLabels[invoice.status] || invoice.status}
            </Badge>
          </div>
        </div>

        {/* Bill To + Stay Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
            <h3 className="text-base font-bold text-gray-800">{invoice.guestName}</h3>
            <p className="text-xs text-gray-600 mt-0.5">Phone: {invoice.guestPhone}</p>
            {invoice.guestEmail && <p className="text-xs text-gray-600">Email: {invoice.guestEmail}</p>}
            {invoice.guestAddress && <p className="text-xs text-gray-600">Address: {invoice.guestAddress}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Stay Details</p>
            {invoice.confirmationCode && (
              <p className="text-xs text-gray-600">Confirmation: <span className="font-mono font-semibold">{invoice.confirmationCode}</span></p>
            )}
            {invoice.roomNumber && (
              <p className="text-xs text-gray-600">Room: <span className="font-semibold">{invoice.roomNumber}</span> {invoice.roomType && `(${invoice.roomType})`}</p>
            )}
            {invoice.checkIn && invoice.checkOut && (
              <>
                <p className="text-xs text-gray-600">Check-in: {formatDate(invoice.checkIn)}</p>
                <p className="text-xs text-gray-600">Check-out: {formatDate(invoice.checkOut)}</p>
                <p className="text-xs text-gray-600">Duration: <span className="font-semibold">{invoice.nights} night{invoice.nights > 1 ? 's' : ''}</span></p>
              </>
            )}
            {invoice.paymentMethod && (
              <p className="text-xs text-gray-600 mt-1">Payment: <span className="font-semibold capitalize">{paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod.replace('_', ' ')}</span></p>
            )}
            {invoice.paymentRef && (
              <p className="text-xs text-gray-600">Ref: <span className="font-mono">{invoice.paymentRef}</span></p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="flex-1 mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2.5 px-3">Description</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-2.5 px-3 w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="py-2.5 px-3 text-sm text-gray-700">{item.label}</td>
                  <td className="py-2.5 px-3 text-sm text-right font-medium text-gray-800">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr><td colSpan={2} className="py-4 px-3 text-center text-gray-400 text-sm">No charges</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-gray-200 pt-4">
          <div className="ml-auto w-72">
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-700">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-500">VAT ({invoice.taxRate}%)</span>
                <span className="font-medium text-gray-700">{formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-emerald-600">Discount</span>
                <span className="font-medium text-emerald-600">-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2.5 mt-1 border-t-2 border-gray-300">
              <span className="text-base font-bold text-gray-800">Total</span>
              <span className="text-base font-bold text-amber-700">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-emerald-600">Amount Paid</span>
              <span className="font-medium text-emerald-600">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            {invoice.balanceAmount > 0 ? (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-red-600 font-semibold">Balance Due</span>
                <span className="font-bold text-red-700 text-base">{formatCurrency(invoice.balanceAmount)}</span>
              </div>
            ) : (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-emerald-700 font-bold">Status</span>
                <span className="font-bold text-emerald-700">PAID IN FULL</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6 p-3 bg-gray-50 rounded border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-xs text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-8 border-t border-gray-200">
          <div className="text-center mb-3">
            <p className="text-sm font-semibold text-gray-600">Thank you for choosing {invoice.hotelName}!</p>
            <p className="text-xs text-gray-400 mt-0.5">We look forward to welcoming you again.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-xs text-gray-400">
            <div>
              <p className="font-semibold text-gray-500 mb-1">Bank Details</p>
              <p>Bank: [Hotel Bank Name]</p>
              <p>Account: [Account Number]</p>
              <p>Name: {invoice.hotelName}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 mb-1">Terms & Conditions</p>
              <p>Payment is due within the specified period.</p>
              <p>Late payments may incur additional charges.</p>
              <p>All disputes subject to Nigerian law.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoicesModule() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ billId: '', notes: '', dueDays: '30' });

  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('guest', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/invoices?${params}`);
      if (res.ok) setInvoices(await res.json());
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  const fetchBills = useCallback(async () => {
    try {
      const res = await fetch('/api/billing');
      if (res.ok) setBills(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleCreate = async () => {
    if (!createForm.billId) { toast.error('Please select a bill'); return; }
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: createForm.billId,
          notes: createForm.notes || undefined,
          dueDays: parseInt(createForm.dueDays) || 30,
        }),
      });
      if (res.ok) {
        const invoice = await res.json();
        toast.success(`Invoice ${invoice.invoiceNumber} created successfully`);
        setCreateOpen(false);
        setCreateForm({ billId: '', notes: '', dueDays: '30' });
        fetchInvoices();
        setPreviewInvoice(invoice);
        setPreviewOpen(true);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create invoice');
      }
    } catch { toast.error('Failed to create invoice'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/invoices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        toast.success('Invoice deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
        fetchInvoices();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete invoice');
      }
    } catch { toast.error('Failed to delete invoice'); }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Invoice ${previewInvoice?.invoiceNumber || ''}</title>
      <style>body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; } @page { size: A4; margin: 15mm; }</style></head><body>
      ${printRef.current.innerHTML}
      <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Invoice ${previewInvoice?.invoiceNumber || ''}</title>
      <style>body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; } @page { size: A4; margin: 15mm; }</style></head><body>
      ${printRef.current.innerHTML}
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const openCreateDialog = () => { fetchBills(); setCreateOpen(true); };

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCollected = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.balanceAmount, 0);
  const availableBills = bills.filter((b) => b.totalAmount > 0);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Invoiced</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(totalInvoiced)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid Invoices</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{invoices.filter((i) => i.status === 'paid').length} paid</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{invoices.filter((i) => i.balanceAmount > 0).length} unpaid</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search guest or invoice #..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchInvoices}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" /> Generate Invoice
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="hidden sm:table-cell">Confirmation</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{inv.invoiceNumber}</Badge></TableCell>
                    <TableCell className="font-medium text-sm">{inv.guestName}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {inv.confirmationCode && <span className="font-mono text-xs text-muted-foreground">{inv.confirmationCode}</span>}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                    <TableCell className="text-sm text-emerald-600">{formatCurrency(inv.paidAmount)}</TableCell>
                    <TableCell className="text-sm text-red-600">{formatCurrency(inv.balanceAmount)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] px-2 py-0.5 h-5 ${statusBadge[inv.status] || ''}`}>
                        {statusLabels[inv.status] || inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(inv.issuedAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setPreviewInvoice(inv); setPreviewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => { setDeleteTarget(inv); setDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground">No invoices generated yet</p>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={openCreateDialog}>
                        <Plus className="h-4 w-4 mr-1" /> Generate First Invoice
                      </Button>
                    </div>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setCreateForm({ billId: '', notes: '', dueDays: '30' }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>Select a bill to generate a professional invoice for the guest.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Select Bill *</Label>
              <Select value={createForm.billId} onValueChange={(v) => setCreateForm({ ...createForm, billId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a bill..." /></SelectTrigger>
                <SelectContent>
                  {availableBills.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.guest.firstName} {b.guest.lastName} &mdash; {formatCurrency(b.totalAmount)}
                      {b.reservation && <span className="text-muted-foreground ml-1">({b.reservation.confirmationCode})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Payment Due (Days)</Label>
              <Select value={createForm.dueDays} onValueChange={(v) => setCreateForm({ ...createForm, dueDays: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Due on Receipt</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Notes (Optional)</Label>
              <Textarea placeholder="Additional notes..." value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} rows={3} />
            </div>
            <Button onClick={handleCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
              <FileText className="h-4 w-4 mr-2" /> Generate Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[850px] max-h-[95vh] overflow-y-auto p-0">
          <div className="no-print sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-white border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Invoice Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
              <Button size="sm" variant="outline" onClick={handleDownloadPDF}><Download className="h-4 w-4 mr-1" /> Save PDF</Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPreviewOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
          </div>
          {previewInvoice && <InvoicePrintView invoice={previewInvoice} printRef={printRef} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete invoice &quot;{deleteTarget?.invoiceNumber}&quot; for {deleteTarget?.guestName}? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Delete Invoice</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}