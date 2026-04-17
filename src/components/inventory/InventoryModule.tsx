'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Package, AlertTriangle, ArrowUpDown, Plus, Edit3, Trash2, Search, Loader2, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['housekeeping', 'kitchen', 'bar', 'maintenance', 'office', 'front_desk'];

const CATEGORY_LABELS: Record<string, string> = {
  housekeeping: 'Housekeeping',
  kitchen: 'Kitchen',
  bar: 'Bar',
  maintenance: 'Maintenance',
  office: 'Office',
  front_desk: 'Front Desk',
};

const UNITS = ['pieces', 'liters', 'kg', 'packs', 'rolls', 'boxes'];

const UNIT_LABELS: Record<string, string> = {
  pieces: 'Pieces',
  liters: 'Liters',
  kg: 'Kg',
  packs: 'Packs',
  rolls: 'Rolls',
  boxes: 'Boxes',
};

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  currentQuantity: number;
  minimumLevel: number;
  reorderQuantity?: number;
  unitCost?: number;
  supplier?: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InventoryStats {
  totalCount: number;
  lowStockCount: number;
  totalValue: number;
}

export function InventoryModule() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats>({ totalCount: 0, lowStockCount: 0, totalValue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formQuantity, setFormQuantity] = useState('0');
  const [formMinLevel, setFormMinLevel] = useState('0');
  const [formReorderQty, setFormReorderQty] = useState('');
  const [formUnitCost, setFormUnitCost] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formLocation, setFormLocation] = useState('');

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setStats(data.stats || { totalCount: 0, lowStockCount: 0, totalValue: 0 });
      } else {
        toast.error('Failed to load inventory');
      }
    } catch {
      toast.error('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const resetForm = () => {
    setFormName('');
    setFormCategory('');
    setFormDescription('');
    setFormUnit('');
    setFormQuantity('0');
    setFormMinLevel('0');
    setFormReorderQty('');
    setFormUnitCost('');
    setFormSupplier('');
    setFormLocation('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCategory || !formUnit) {
      toast.error('Name, category, and unit are required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formName,
        category: formCategory,
        description: formDescription || undefined,
        unit: formUnit,
        currentQuantity: parseFloat(formQuantity) || 0,
        minimumLevel: parseFloat(formMinLevel) || 0,
        reorderQuantity: formReorderQty ? parseFloat(formReorderQty) : undefined,
        unitCost: formUnitCost ? parseFloat(formUnitCost) : undefined,
        supplier: formSupplier || undefined,
        location: formLocation || undefined,
      };

      const url = editingId ? `/api/inventory?id=${editingId}` : '/api/inventory';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingId ? 'Item updated' : 'Item added');
        resetForm();
        fetchInventory();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save item');
      }
    } catch {
      toast.error('Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setFormName(item.name);
    setFormCategory(item.category);
    setFormDescription(item.description || '');
    setFormUnit(item.unit);
    setFormQuantity(String(item.currentQuantity));
    setFormMinLevel(String(item.minimumLevel));
    setFormReorderQty(item.reorderQuantity ? String(item.reorderQuantity) : '');
    setFormUnitCost(item.unitCost ? String(item.unitCost) : '');
    setFormSupplier(item.supplier || '');
    setFormLocation(item.location || '');
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item from inventory?')) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Item removed');
        fetchInventory();
      } else {
        toast.error('Failed to remove item');
      }
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const filtered = items.filter((item) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const isLowStock = (item: InventoryItem) => item.currentQuantity <= item.minimumLevel;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Inventory</h2>
            <p className="text-sm text-muted-foreground">Manage hotel supplies and stock</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5"><Package className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-xl font-bold">{stats.totalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2.5"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Low Stock</p>
              <p className="text-xl font-bold text-red-600">{stats.lowStockCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5"><ArrowUpDown className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Inventory Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2 sm:col-span-2">
                <Label>Item Name *</Label>
                <Input placeholder="e.g. Bed Sheets (King)" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>Category *</Label>
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
                <Label>Unit *</Label>
                <Select value={formUnit} onValueChange={setFormUnit}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Current Quantity</Label>
                <Input type="number" placeholder="0" min="0" step="0.1" value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Minimum Level</Label>
                <Input type="number" placeholder="0" min="0" step="0.1" value={formMinLevel} onChange={(e) => setFormMinLevel(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Reorder Quantity</Label>
                <Input type="number" placeholder="0" min="0" step="0.1" value={formReorderQty} onChange={(e) => setFormReorderQty(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Unit Cost (&#8358;)</Label>
                <Input type="number" placeholder="0" min="0" step="0.01" value={formUnitCost} onChange={(e) => setFormUnitCost(e.target.value)} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea placeholder="Item description (optional)" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Supplier</Label>
                <Input placeholder="Supplier name (optional)" value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Storage Location</Label>
                <Input placeholder="e.g. Store Room A (optional)" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 text-white">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingId ? 'Update Item' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Items Table */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Inventory Items</span>
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
              <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No inventory items found</p>
              {search && <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Item</th>
                    <th className="pb-2 pr-4 hidden sm:table-cell">Category</th>
                    <th className="pb-2 pr-4">Qty</th>
                    <th className="pb-2 pr-4 hidden md:table-cell">Unit Cost</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{item.name}</p>
                        {item.location && <p className="text-xs text-muted-foreground">{item.location}</p>}
                      </td>
                      <td className="py-3 pr-4 hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[item.category] || item.category}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={isLowStock(item) ? 'text-red-600 font-bold' : ''}>
                          {item.currentQuantity} {UNIT_LABELS[item.unit] || item.unit}
                        </span>
                        <span className="text-xs text-muted-foreground"> / min {item.minimumLevel}</span>
                      </td>
                      <td className="py-3 pr-4 hidden md:table-cell">
                        {item.unitCost ? formatCurrency(item.unitCost) : '-'}
                      </td>
                      <td className="py-3 pr-4">
                        {isLowStock(item) ? (
                          <Badge className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 h-5">
                            <AlertTriangle className="h-2.5 w-2.5 mr-1" />Low Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 h-5">In Stock</Badge>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(item)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}>
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
