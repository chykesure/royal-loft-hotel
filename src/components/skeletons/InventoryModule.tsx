'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Package, AlertTriangle, Plus, ArrowUpDown, Trash2, Pencil, Search, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { formatCurrency } from '@/lib/auth';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  unit: string;
  currentQuantity: number;
  minimumLevel: number;
  reorderQuantity?: number | null;
  unitCost?: number | null;
  supplier?: string | null;
  location?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  category: string;
  unit: string;
  currentQuantity: string;
  minimumLevel: string;
  reorderQuantity: string;
  unitCost: string;
  description: string;
  supplier: string;
  location: string;
}

const emptyForm: FormData = {
  name: '', category: 'housekeeping', unit: 'pieces',
  currentQuantity: '0', minimumLevel: '0', reorderQuantity: '',
  unitCost: '', description: '', supplier: '', location: '',
};

const categories = [
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bar', label: 'Bar' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'office', label: 'Office' },
  { value: 'front_desk', label: 'Front Desk' },
];

export function InventoryModule() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = user?.role === 'developer' || user?.role === 'super_admin';

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || item.category === filterCat;
    return matchSearch && matchCat;
  });

  const lowStock = items.filter(i => i.currentQuantity <= i.minimumLevel);
  const totalValue = items.reduce((sum, i) => sum + (i.currentQuantity * (i.unitCost || 0)), 0);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentQuantity: String(item.currentQuantity),
      minimumLevel: String(item.minimumLevel),
      reorderQuantity: item.reorderQuantity ? String(item.reorderQuantity) : '',
      unitCost: item.unitCost ? String(item.unitCost) : '',
      description: item.description || '',
      supplier: item.supplier || '',
      location: item.location || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.unit) return;
    try {
      setSaving(true);
      const body = {
        name: form.name,
        category: form.category,
        description: form.description || null,
        unit: form.unit,
        currentQuantity: Number(form.currentQuantity) || 0,
        minimumLevel: Number(form.minimumLevel) || 0,
        reorderQuantity: form.reorderQuantity ? Number(form.reorderQuantity) : null,
        unitCost: form.unitCost ? Number(form.unitCost) : null,
        supplier: form.supplier || null,
        location: form.location || null,
      };

      if (editingId) {
        const res = await fetch(`/api/inventory?id=${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success('Item updated successfully');
          setShowForm(false);
          await fetchItems();
        } else {
          toast.error('Failed to update item');
        }
      } else {
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast.success('Item created successfully');
          setShowForm(false);
          await fetchItems();
        } else {
          toast.error('Failed to create item');
        }
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/inventory?id=${deletingId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeletingId(null);
        toast.success('Item deactivated successfully');
        await fetchItems();
      } else {
        const data = await res.json();
        if (res.status === 403) {
          toast.error('Access denied: Only Developer and Super Admin can delete inventory items.');
        } else {
          toast.error(data.error || 'Failed to delete item');
        }
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const deletingItem = items.find(i => i.id === deletingId);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5"><Package className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Items</p><p className="text-xl font-bold">{items.length}</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2.5"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <div><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-xl font-bold text-red-600">{lowStock.length}</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5"><ArrowUpDown className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Value</p><p className="text-xl font-bold">{formatCurrency(totalValue)}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <CardTitle className="text-base">Inventory Items</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-44 pl-7 pr-2 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>}
            </div>
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="h-8 text-xs border rounded-md bg-background px-2 focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading inventory...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No items found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">Category</th>
                    <th className="text-left p-3 font-medium">Qty</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Unit Cost</th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">Value</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{item.name}</div>
                        {item.description && <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{item.description}</div>}
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <Badge className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 h-5 capitalize">
                          {item.category.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className={item.currentQuantity <= item.minimumLevel ? 'text-red-600 font-bold' : ''}>
                          {item.currentQuantity}
                        </span>
                        <span className="text-xs text-muted-foreground"> {item.unit}</span>
                        <span className="text-xs text-muted-foreground"> / min {item.minimumLevel}</span>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {item.unitCost ? formatCurrency(item.unitCost) : '-'}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {item.unitCost ? formatCurrency(item.currentQuantity * item.unitCost) : '-'}
                      </td>
                      <td className="p-3">
                        {item.currentQuantity <= item.minimumLevel ? (
                          <Badge className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 h-5">
                            <AlertTriangle className="h-2.5 w-2.5 mr-1" />Low Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 h-5">In Stock</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          {canDelete && (
                            <AlertDialog open={deletingId === item.id} onOpenChange={(open) => { if (!open) setDeletingId(null); else setDeletingId(item.id); }}>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deactivate Inventory Item</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to deactivate <strong>{deletingItem?.name}</strong>? This will hide the item from the active inventory list. You can reactivate it later.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                                  <Button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    {deleting ? 'Deactivating...' : 'Deactivate'}
                                  </Button>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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

      {/* Add/Edit Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-lg border-none shadow-xl" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{editingId ? 'Edit Item' : 'Add New Item'}</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Item Name *</label>
                  <input className="w-full h-8 text-sm border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bed Sheets" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Category *</label>
                  <select className="w-full h-8 text-sm border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Unit *</label>
                  <input className="w-full h-8 text-sm border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="e.g. pieces" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Current Qty</label>
                  <input type="number" className="w-full h-8 text-sm border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" value={form.currentQuantity} onChange={e => setForm({ ...form, currentQuantity: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Min. Level</label>
                  <input type="number" className="w-full h-8 text-sm border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" value={form.minimumLevel} onChange={e => setForm({ ...form, minimumLevel: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Unit Cost (NGN)</label>
                  <input type="number" className="w-full h-8 text-sm border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} placeholder="e.g. 3500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Reorder Qty</label>
                  <input type="number" className="w-full h-8 text-sm border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" value={form.reorderQuantity} onChange={e => setForm({ ...form, reorderQuantity: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <input className="w-full h-8 text-sm border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Supplier</label>
                  <input className="w-full h-8 text-sm border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                  <input className="w-full h-8 text-sm border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Store Room A" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSave} disabled={saving || !form.name || !form.unit}>
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}