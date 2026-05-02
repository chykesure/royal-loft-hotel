'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  TrendingDown, Plus, Trash2, Edit3, Search, Loader2, Receipt, CalendarDays, Filter, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

const CATEGORIES = [
  'utilities', 'salaries', 'supplies', 'maintenance', 'food_beverage',
  'marketing', 'insurance', 'rent', 'tax', 'laundry', 'transport', 'miscellaneous',
];

const CATEGORY_LABELS: Record<string, string> = {
  utilities: 'Utilities',
  salaries: 'Salaries',
  supplies: 'Supplies',
  maintenance: 'Maintenance',
  food_beverage: 'Food & Beverage',
  marketing: 'Marketing',
  insurance: 'Insurance',
  rent: 'Rent',
  tax: 'Tax',
  laundry: 'Laundry',
  transport: 'Transport',
  miscellaneous: 'Miscellaneous',
};

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'pos', 'opay', 'palmpay', 'moniepoint'];

interface Expense {
  id: string;
  date: string;
  name?: string;
  description?: string;
  category?: string;
  amount?: number;
  kitchen?: number;
  hotel?: number;
  beverages?: number;
  total?: number;
  paymentMethod?: string;
  vendor?: string;
  reference?: string;
  expenseDate?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export function ExpensesModule() {
  const user = useAuthStore((s) => s.user);
  const isDeveloper = user?.role === 'developer';
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('cash');
  const [formVendor, setFormVendor] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.expenses || [];
        setExpenses(list.map((e: Record<string, unknown>) => ({
          ...e,
          expenseDate: e.expenseDate || e.date,
          amount: e.amount ?? (e.total ?? 0),
          description: e.description || e.name || '',
          category: e.category || 'miscellaneous',
        })));
      } else {
        toast.error('Failed to load expenses');
      }
    } catch {
      toast.error('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const resetForm = () => {
    setFormDesc('');
    setFormCategory('');
    setFormAmount('');
    setFormPaymentMethod('cash');
    setFormVendor('');
    setFormReference('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc || !formCategory || !formAmount) {
      toast.error('Description, category, and amount are required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        description: formDesc,
        category: formCategory,
        amount: parseFloat(formAmount),
        paymentMethod: formPaymentMethod,
        vendor: formVendor || undefined,
        reference: formReference || undefined,
        expenseDate: new Date(formDate).toISOString(),
        notes: formNotes || undefined,
      };

      const url = editingId ? `/api/expenses?id=${editingId}` : '/api/expenses';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingId ? 'Expense updated' : 'Expense added');
        resetForm();
        fetchExpenses();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save expense');
      }
    } catch {
      toast.error('Failed to save expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (exp: Expense) => {
    setFormDesc(exp.description);
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount));
    setFormPaymentMethod(exp.paymentMethod);
    setFormVendor(exp.vendor || '');
    setFormReference(exp.reference || '');
    setFormDate((exp.expenseDate || exp.date).split('T')[0]);
    setFormNotes(exp.notes || '');
    setEditingId(exp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Expense deleted');
        fetchExpenses();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const res = await fetch('/api/expenses/import-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const fmt = (n: number) =>
          new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n);
        toast.success(
          `Imported ${data.imported} of ${data.total} records` +
            (data.skipped > 0 ? ` (${data.skipped} skipped)` : '') +
            ` — Total: ${fmt(data.summary.total)}`
        );
        if (data.errors.length > 0) {
          toast.error(`${data.errors.length} errors: ${data.errors.join('; ')}`);
        }
        fetchExpenses();
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch {
      toast.error('Failed to import CSV');
    } finally {
      setIsImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  // Determine if expense is a CSV-imported record (has kitchen/hotel/beverages fields)
  const isCSVRecord = (exp: Expense) => exp.kitchen != null || exp.hotel != null || exp.beverages != null;

  // Filter expenses
  const filtered = expenses.filter((exp) => {
    const desc = exp.description || '';
    const name = exp.name || '';
    const matchSearch = !search || desc.toLowerCase().includes(search.toLowerCase()) || name.toLowerCase().includes(search.toLowerCase()) || (exp.vendor || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || (exp.category || 'miscellaneous') === filterCategory;
    return matchSearch && matchCategory;
  });

  // Summary stats
  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount ?? (e.total ?? 0)), 0);
  const thisMonth = expenses.filter((e) => {
    const d = new Date(e.expenseDate || e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyTotal = thisMonth.reduce((sum, e) => sum + (e.amount ?? (e.total ?? 0)), 0);

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category || 'miscellaneous';
    const amt = e.amount ?? (e.total ?? 0);
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
  });
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500">
            <TrendingDown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Expenses</h2>
            <p className="text-sm text-muted-foreground">Track and manage hotel expenses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-red-500 hover:bg-red-600 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Expense
          </Button>
          {isDeveloper && (
            <>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVImport}
              />
              <Button
                variant="outline"
                disabled={isImporting}
                onClick={() => csvInputRef.current?.click()}
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              >
                {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Import CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-muted-foreground">{expenses.length} records</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50"><Receipt className="h-5 w-5 text-red-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(monthlyTotal)}</p>
                <p className="text-xs text-muted-foreground">{thisMonth.length} expenses</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50"><CalendarDays className="h-5 w-5 text-amber-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Top Category</p>
                <p className="text-2xl font-bold">{topCategories.length > 0 ? CATEGORY_LABELS[topCategories[0][0]] || topCategories[0][0] : 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{topCategories.length > 0 ? formatCurrency(topCategories[0][1]) : ''}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50"><Filter className="h-5 w-5 text-blue-500" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {topCategories.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {topCategories.map(([cat, total]) => (
                <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-sm">{CATEGORY_LABELS[cat] || cat}</span>
                  <span className="text-sm font-semibold">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-none shadow-sm border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-base">{editingId ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Description</Label>
                  <Input placeholder="e.g. Generator fuel" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Amount (&#8358;)</Label>
                  <Input type="number" placeholder="0.00" min="0" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>Payment Method</Label>
                  <Select value={formPaymentMethod} onValueChange={setFormPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>{m.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Expense Date</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label>Vendor</Label>
                  <Input placeholder="Vendor name (optional)" value={formVendor} onChange={(e) => setFormVendor(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Reference</Label>
                  <Input placeholder="Receipt/Invoice # (optional)" value={formReference} onChange={(e) => setFormReference(e.target.value)} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Input placeholder="Additional notes (optional)" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving} className="bg-red-500 hover:bg-red-600 text-white">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingId ? 'Update Expense' : 'Save Expense'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Expense Records</span>
            <Badge variant="secondary">{filtered.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No expenses found</p>
              {search && <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Name/Description</th>
                    <th className="pb-2 pr-4 text-right">Kitchen</th>
                    <th className="pb-2 pr-4 text-right">Hotel</th>
                    <th className="pb-2 pr-4 text-right">Beverages</th>
                    <th className="pb-2 pr-4 text-right">Total</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((exp) => (
                    <tr key={exp.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 pr-4 whitespace-nowrap text-xs">
                        {new Date(exp.expenseDate || exp.date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{exp.name || exp.description || '-'}</p>
                        {exp.notes && <p className="text-xs text-muted-foreground mt-0.5">{exp.notes}</p>}
                        {!isCSVRecord(exp) && exp.category && (
                          <Badge variant="secondary" className="text-xs mt-1">{CATEGORY_LABELS[exp.category] || exp.category}</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right text-xs">
                        {exp.kitchen != null && exp.kitchen > 0 ? formatCurrency(exp.kitchen) : '-'}
                      </td>
                      <td className="py-3 pr-4 text-right text-xs">
                        {exp.hotel != null && exp.hotel > 0 ? formatCurrency(exp.hotel) : '-'}
                      </td>
                      <td className="py-3 pr-4 text-right text-xs">
                        {exp.beverages != null && exp.beverages > 0 ? formatCurrency(exp.beverages) : '-'}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-red-600">
                        {formatCurrency(exp.total ?? (exp.amount ?? 0))}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(exp.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}