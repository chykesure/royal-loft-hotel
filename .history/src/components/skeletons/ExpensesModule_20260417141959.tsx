'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DollarSign, TrendingDown, Receipt, Wallet, Calendar, Plus, Pencil,
  Trash2, RefreshCw, Search, Filter,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod?: string | null;
  vendor?: string | null;
  receiptRef?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CategorySummary {
  category: string;
  _sum: { amount: number | null };
  _count: { id: number };
}

const CATEGORIES = [
  { value: 'utilities', label: 'Utilities', color: 'bg-amber-100 text-amber-700' },
  { value: 'salaries', label: 'Salaries', color: 'bg-sky-100 text-sky-700' },
  { value: 'supplies', label: 'Supplies', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
  { value: 'marketing', label: 'Marketing', color: 'bg-purple-100 text-purple-700' },
  { value: 'miscellaneous', label: 'Miscellaneous', color: 'bg-gray-100 text-gray-700' },
];

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'pos'];

export function ExpensesModule() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    description: '', category: 'utilities', amount: '', date: '',
    paymentMethod: '', vendor: '', receiptRef: '', notes: '',
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    id: '', description: '', category: '', amount: '', date: '',
    paymentMethod: '', vendor: '', receiptRef: '', notes: '',
  });

  const canEdit = user?.role === 'super_admin' || user?.role === 'developer' || user?.role === 'manager' || user?.role === 'accountant';

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.set('category', filterCategory);
      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setCategorySummary(data.categorySummary || []);
        setThisMonthTotal(data.thisMonthTotal || 0);
        setTotalAll(data.totalAll || 0);
      }
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered expenses ──
  const filteredExpenses = expenses.filter((e) =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase()) ||
    (e.vendor && e.vendor.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Category color helper ──
  const getCategoryColor = (cat: string) =>
    CATEGORIES.find(c => c.value === cat)?.color || 'bg-gray-100 text-gray-700';
  const getCategoryLabel = (cat: string) =>
    CATEGORIES.find(c => c.value === cat)?.label || cat;

  // ── Create ──
  const handleCreate = async () => {
    if (!createForm.description || !createForm.amount || !createForm.date) {
      toast.error('Description, amount, and date are required');
      return;
    }
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        toast.success('Expense created successfully');
        setCreateOpen(false);
        setCreateForm({ description: '', category: 'utilities', amount: '', date: '', paymentMethod: '', vendor: '', receiptRef: '', notes: '' });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create expense');
      }
    } catch {
      toast.error('Failed to create expense');
    }
  };

  // ── Edit ──
  const openEdit = (expense: Expense) => {
    setEditForm({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount.toString(),
      date: expense.date ? expense.date.split('T')[0] : '',
      paymentMethod: expense.paymentMethod || '',
      vendor: expense.vendor || '',
      receiptRef: expense.receiptRef || '',
      notes: expense.notes || '',
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editForm.description || !editForm.amount || !editForm.date) {
      toast.error('Description, amount, and date are required');
      return;
    }
    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success('Expense updated successfully');
        setEditOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update expense');
      }
    } catch {
      toast.error('Failed to update expense');
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deletingExpense) return;
    try {
      const res = await fetch(`/api/expenses?id=${deletingExpense.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Expense deleted');
        setDeletingExpense(null);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete expense');
      }
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Expenses</h2>
            <p className="text-xs text-muted-foreground">Track and manage hotel expenditures</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Plus className="h-4 w-4 mr-1" /> Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Expense</DialogTitle>
                  <DialogDescription>Add a new expense record to the system.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Description *</Label>
                    <Input placeholder="e.g. Electricity Bill" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Category *</Label>
                      <Select value={createForm.category} onValueChange={(v) => setCreateForm({ ...createForm, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Amount (NGN) *</Label>
                      <Input type="number" placeholder="0.00" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Date *</Label>
                    <Input type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Payment Method</Label>
                      <Select value={createForm.paymentMethod} onValueChange={(v) => setCreateForm({ ...createForm, paymentMethod: v })}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map(m => (
                            <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Vendor</Label>
                      <Input placeholder="Vendor name" value={createForm.vendor} onChange={(e) => setCreateForm({ ...createForm, vendor: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Receipt Ref</Label>
                    <Input placeholder="Receipt reference" value={createForm.receiptRef} onChange={(e) => setCreateForm({ ...createForm, receiptRef: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Notes</Label>
                    <Input placeholder="Optional notes" value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} />
                  </div>
                  <Button onClick={handleCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
                    Create Expense
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2.5"><TrendingDown className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold">{formatCurrency(totalAll)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2.5"><Receipt className="h-5 w-5 text-sky-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-xl font-bold">{formatCurrency(thisMonthTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5"><Wallet className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Categories</p>
              <p className="text-xl font-bold">{categorySummary.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Summary */}
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Expense Categories</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-2">
                {categorySummary.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No expenses recorded yet</p>
                )}
                {categorySummary
                  .sort((a, b) => (b._sum.amount || 0) - (a._sum.amount || 0))
                  .map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setFilterCategory(filterCategory === cat.category ? 'all' : cat.category)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={`text-[10px] px-2 py-0.5 h-5 ${getCategoryColor(cat.category)}`}>
                          {getCategoryLabel(cat.category)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{cat._count.id} entries</span>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(cat._sum.amount || 0)}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses List */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {filterCategory !== 'all' ? `${getCategoryLabel(filterCategory)} Expenses` : 'All Expenses'}
              </CardTitle>
              {filterCategory !== 'all' && (
                <Button size="sm" variant="ghost" onClick={() => setFilterCategory('all')}>
                  <Filter className="h-3 w-3 mr-1" /> Clear Filter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search expenses..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
                {filteredExpenses.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">No expenses found</p>
                )}
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{expense.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{getCategoryLabel(expense.category)}</Badge>
                        {expense.vendor && <span>Vendor: {expense.vendor}</span>}
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          {expense.date ? formatDateTime(expense.date) : ''}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-semibold text-red-600 whitespace-nowrap">{formatCurrency(expense.amount)}</span>
                      {canEdit && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-amber-600" onClick={() => openEdit(expense)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog open={deletingExpense?.id === expense.id} onOpenChange={(open) => { if (!open) setDeletingExpense(null); else setDeletingExpense(expense); }}>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <span className="font-semibold">{expense.description}</span>? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Table (desktop) */}
      <Card className="border-none shadow-sm hidden lg:block">
        <CardHeader><CardTitle className="text-base">Expense Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden xl:table-cell">Vendor</TableHead>
                  <TableHead className="hidden xl:table-cell">Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {expense.date ? formatDateTime(expense.date) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{expense.description}</p>
                        {expense.notes && <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{expense.notes}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] px-2 py-0.5 h-5 ${getCategoryColor(expense.category)}`}>
                        {getCategoryLabel(expense.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">{expense.vendor || '-'}</TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">
                      {expense.paymentMethod ? expense.paymentMethod.replace(/_/g, ' ') : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600 text-sm">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-amber-600" onClick={() => openEdit(expense)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog open={deletingExpense?.id === expense.id} onOpenChange={(open) => { if (!open) setDeletingExpense(null); else setDeletingExpense(expense); }}>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <span className="font-semibold">{expense.description}</span>?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No expenses found. Click &quot;Add Expense&quot; to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update expense details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Description *</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Amount (NGN) *</Label>
                <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Date *</Label>
              <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select value={editForm.paymentMethod} onValueChange={(v) => setEditForm({ ...editForm, paymentMethod: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Vendor</Label>
                <Input value={editForm.vendor} onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Receipt Ref</Label>
              <Input value={editForm.receiptRef} onChange={(e) => setEditForm({ ...editForm, receiptRef: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} className="bg-amber-500 hover:bg-amber-600 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}