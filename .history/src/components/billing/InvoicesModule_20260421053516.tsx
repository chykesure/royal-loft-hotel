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
  Plus, Search, X, Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface RoomDetail {
  roomNumber: string;
  roomType: string;
  roomRate: number;
  nights: number;
  total: number;
  confirmationCode: string;
}

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
  groupCode?: string | null;
  roomNumber?: string | null;
  roomType?: string | null;
  roomDetails?: string | null;
  numRooms?: number;
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

/* ─────────── Invoice Printable Template ─────────── */

function InvoicePrintView({ invoice, printRef }: { invoice: Invoice; printRef: React.RefObject<HTMLDivElement | null> }) {
  // Parse roomDetails JSON if it's a multi-room invoice
  let roomDetails: RoomDetail[] | null = null;
  let isMultiRoom = false;

  try {
    if (invoice.roomDetails) {
      roomDetails = JSON.parse(invoice.roomDetails);
      if (Array.isArray(roomDetails) && roomDetails.length > 1) {
        isMultiRoom = true;
      }
    }
  } catch {
    roomDetails = null;
  }

  // Build line items
  const lineItems: Array<{ label: string; amount: number }> = [];

  if (isMultiRoom && roomDetails) {
    // Multi-room: show each room as a separate line item
    roomDetails.forEach((room) => {
      lineItems.push({
        label: `Room ${room.roomNumber} (${room.roomType}) - ${room.nights} night${room.nights > 1 ? 's' : ''} x ${formatCurrency(room.roomRate)}`,
        amount: room.total,
      });
    });
  } else {
    // Single room
    lineItems.push({
      label: `Room Charges (${invoice.nights} night${invoice.nights > 1 ? 's' : ''} x ${formatCurrency(invoice.roomRate)})`,
      amount: invoice.roomCharges,
    });
  }

  // Other charges — ONLY show if they actually have values (no hardcoded zeros)
  if (invoice.foodCharges > 0) lineItems.push({ label: 'Food & Beverage', amount: invoice.foodCharges });
  if (invoice.barCharges > 0) lineItems.push({ label: 'Bar Services', amount: invoice.barCharges });
  if (invoice.spaCharges > 0) lineItems.push({ label: 'Spa & Wellness', amount: invoice.spaCharges });
  if (invoice.laundryCharges > 0) lineItems.push({ label: 'Laundry Service', amount: invoice.laundryCharges });
  if (invoice.otherCharges > 0) lineItems.push({ label: 'Other Charges', amount: invoice.otherCharges });

  return (
    <div ref={printRef} style={{ background: '#fff', color: '#111827', width: '100%', maxWidth: '210mm', margin: '0 auto', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '13px', lineHeight: '1.5' }}>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="print-area" style={{ padding: '32px 40px', minHeight: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', paddingBottom: '20px', borderBottom: '3px solid #f59e0b' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#b45309', letterSpacing: '-0.025em', margin: 0 }}>{invoice.hotelName}</h1>
            {invoice.hotelAddress && <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', margin: '4px 0 0 0' }}>{invoice.hotelAddress}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: '4px' }}>
              {invoice.hotelPhone && <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Tel: {invoice.hotelPhone}</p>}
              {invoice.hotelEmail && <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Email: {invoice.hotelEmail}</p>}
              {invoice.hotelWebsite && <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Web: {invoice.hotelWebsite}</p>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937', letterSpacing: '0.05em', margin: 0 }}>INVOICE</h2>
            <p style={{ fontSize: '13px', fontFamily: 'monospace', color: '#4b5563', marginTop: '4px', margin: '4px 0 0 0' }}>{invoice.invoiceNumber}</p>
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0' }}>Issued: {formatDate(invoice.issuedAt)}</p>
              {invoice.dueAt && <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0' }}>Due: {formatDate(invoice.dueAt)}</p>}
            </div>
            <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase', background: invoice.status === 'paid' ? '#d1fae5' : invoice.status === 'cancelled' ? '#fee2e2' : invoice.status === 'sent' ? '#dbeafe' : '#f3f4f6', color: invoice.status === 'paid' ? '#047857' : invoice.status === 'cancelled' ? '#b91c1c' : invoice.status === 'sent' ? '#1d4ed8' : '#374151' }}>
              {statusLabels[invoice.status] || invoice.status}
            </span>
          </div>
        </div>

        {/* ── Bill To & Stay Details ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '28px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Bill To</p>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px 0' }}>{invoice.guestName}</h3>
            <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0' }}>Phone: {invoice.guestPhone}</p>
            {invoice.guestEmail && <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0' }}>Email: {invoice.guestEmail}</p>}
            {invoice.guestAddress && <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0' }}>Address: {invoice.guestAddress}</p>}
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Stay Details</p>
            {invoice.groupCode && (
              <p style={{ fontSize: '12px', color: '#7c3aed', margin: '2px 0', fontWeight: 600 }}>
                Group Booking: <span style={{ fontFamily: 'monospace' }}>{invoice.groupCode}</span>
                <span style={{ fontWeight: 400, color: '#4b5563' }}> ({invoice.numRooms || roomDetails?.length || 1} room{(invoice.numRooms || roomDetails?.length || 1) > 1 ? 's' : ''})</span>
              </p>
            )}
            {!invoice.groupCode && (invoice.numRooms && invoice.numRooms > 1) && (
              <p style={{ fontSize: '12px', color: '#7c3aed', margin: '2px 0', fontWeight: 600 }}>
                Multi-Room Booking: <span style={{ fontWeight: 700 }}>{invoice.numRooms} room{invoice.numRooms > 1 ? 's' : ''}</span>
              </p>
            )}
            {invoice.confirmationCode && !invoice.groupCode && (
              <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0' }}>Confirmation: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{invoice.confirmationCode}</span></p>
            )}
            {isMultiRoom && roomDetails ? (
              <>
                <p style={{ fontSize: '12px', color: '#4b5563', margin: '4px 0 2px 0' }}>Rooms:</p>
                {roomDetails.map((room, i) => (
                  <p key={i} style={{ fontSize: '11px', color: '#374151', margin: '1px 0 1px 12px' }}>
                    Room {room.roomNumber} ({room.roomType}) - {room.nights} night{room.nights > 1 ? 's' : ''} x {formatCurrency(room.roomRate)} = <strong>{formatCurrency(room.total)}</strong>
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af', marginLeft: '8px' }}>{room.confirmationCode}</span>
                  </p>
                ))}
              </>
            ) : invoice.roomNumber ? (
              <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0' }}>Room: <span style={{ fontWeight: 600 }}>{invoice.roomNumber}</span> {invoice.roomType && `(${invoice.roomType})`}</p>
            ) : null}
            {invoice.checkIn && invoice.checkOut && (
              <>
                <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0' }}>Check-in: {formatDate(invoice.checkIn)}</p>
                <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0' }}>Check-out: {formatDate(invoice.checkOut)}</p>
                <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0' }}>Duration: <span style={{ fontWeight: 600 }}>{invoice.nights} night{invoice.nights > 1 ? 's' : ''}</span></p>
              </>
            )}
            {invoice.paymentMethod && (
              <p style={{ fontSize: '12px', color: '#4b5563', margin: '4px 0 2px 0' }}>Payment: <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod.replace('_', ' ')}</span></p>
            )}
            {invoice.paymentRef && (
              <p style={{ fontSize: '12px', color: '#4b5563', margin: '2px 0' }}>Ref: <span style={{ fontFamily: 'monospace' }}>{invoice.paymentRef}</span></p>
            )}
          </div>
        </div>

        {/* ── Line Items Table ── */}
        <div style={{ marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>Description</th>
                <th style={{ textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', width: '128px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : 'rgba(249,250,251,0.5)' }}>
                  <td style={{ padding: '8px 12px', fontSize: '13px', color: '#374151' }}>{item.label}</td>
                  <td style={{ padding: '8px 12px', fontSize: '13px', textAlign: 'right', fontWeight: 500, color: '#1f2937' }}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr><td colSpan={2} style={{ padding: '16px 12px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No charges</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Totals ── */}
        <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '16px' }}>
          <div style={{ marginLeft: 'auto', width: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
              <span style={{ color: '#6b7280' }}>Subtotal</span>
              <span style={{ fontWeight: 500, color: '#374151' }}>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                <span style={{ color: '#6b7280' }}>VAT ({invoice.taxRate}%)</span>
                <span style={{ fontWeight: 500, color: '#374151' }}>{formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            {invoice.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                <span style={{ color: '#059669' }}>Discount</span>
                <span style={{ fontWeight: 500, color: '#059669' }}>-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '4px', borderTop: '2px solid #d1d5db' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>Total</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#b45309' }}>{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
              <span style={{ color: '#059669' }}>Amount Paid</span>
              <span style={{ fontWeight: 500, color: '#059669' }}>{formatCurrency(invoice.paidAmount)}</span>
            </div>
            {invoice.balanceAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>Balance Due</span>
                <span style={{ fontWeight: 700, color: '#b91c1c', fontSize: '15px' }}>{formatCurrency(invoice.balanceAmount)}</span>
              </div>
            )}
            {invoice.balanceAmount <= 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                <span style={{ color: '#047857', fontWeight: 700 }}>Status</span>
                <span style={{ fontWeight: 700, color: '#047857' }}>PAID IN FULL</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Notes ── */}
        {invoice.notes && (
          <div style={{ marginTop: '20px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Notes</p>
            <p style={{ fontSize: '12px', color: '#4b5563', whiteSpace: 'pre-line', margin: 0 }}>{invoice.notes}</p>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563', margin: '0 0 4px 0' }}>Thank you for choosing {invoice.hotelName}!</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>We look forward to welcoming you again.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Main Component ─────────── */

export function InvoicesModule() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create invoice dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ billId: '', notes: '', dueDays: '30' });

  // Preview dialog
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Delete confirmation
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
      if (res.ok) {
        const data = await res.json();
        setBills(data);
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleCreate = async () => {
    if (!createForm.billId) {
      toast.error('Please select a bill');
      return;
    }
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
        // Auto-open preview of the new invoice
        setPreviewInvoice(invoice);
        setPreviewOpen(true);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create invoice');
      }
    } catch {
      toast.error('Failed to create invoice');
    }
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
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Invoice ${previewInvoice?.invoiceNumber || ''}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; background: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        @page { size: A4; margin: 10mm; }
      </style></head><body>
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
      <!DOCTYPE html>
      <html><head><title>Invoice ${previewInvoice?.invoiceNumber || ''}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; background: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        @page { size: A4; margin: 10mm; }
      </style></head><body>
      ${printRef.current.innerHTML}
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 500);
        }
      <\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const openCreateDialog = () => {
    fetchBills();
    setCreateOpen(true);
  };

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCollected = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.totalAmount,