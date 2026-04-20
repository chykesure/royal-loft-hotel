'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  AlertTriangle,
  Plus,
  ArrowUpDown,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

// ---- Types ----

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  unit: string;
  currentQuantity: number;
  minimumLevel: number;
  reorderQuantity: number | null;
  unitCost: number | null;
  supplier: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  stockMovements: {
    type: string;
    quantity: number;
    createdAt: string;
  }[];
}

interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  totalValue: number;
  categories: { name: string; count: number }[];
}

interface ItemForm {
  name: string;
  category: string;
  description: string;
  unit: string;
  currentQuantity: string;
  minimumLevel: string;
  reorderQuantity: string;
  unitCost: string;
  supplier: string;
  location: string;
}

// ---- Constants ----

const CATEGORY_LABELS: Record<string, string> = {
  housekeeping: 'Housekeeping',
  kitchen: 'Kitchen',
  bar: 'Bar',
  maintenance: 'Maintenance',
  office: 'Office',
  front_desk: 'Front Desk',
  food_beverage: 'Food & Beverage',
  laundry: 'Laundry',
};

const CATEGORY_COLORS: Record<string, string> = {
  housekeeping: 'bg-teal-100 text-teal-700',
  kitchen: 'bg-orange-100 text-orange-700',
  bar: 'bg-violet-100 text-violet-700',
  maintenance: 'bg-blue-100 text-blue-700',
  office: 'bg-gray-100 text-gray-700',
  front_desk: 'bg-amber-100 text-amber-700',
  food_beverage: 'bg-pink-100 text-pink-700',
  laundry: 'bg-cyan-100 text-cyan-700',
};

const UNITS = ['pieces', 'liters', 'kg', 'packs', 'rolls', 'boxes', 'bottles', 'sets', 'pairs', 'dozens'];
const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

const emptyForm: ItemForm = {
  name: '',
  category: '',
  description: '',
  unit: '',
  currentQuantity: '0',
  minimumLevel: '0',
  reorderQuantity: '',
  unitCost: '',
  supplier: '',
  location: '',
};

// ---- Component ----

export function InventoryModule() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);

  // Add/Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (showLowStock) params.set('lowStock', 'true');

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary(data.summary || null);
      } else {
        toast.error('Failed to load inventory');
      }
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, showLowStock]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Handlers ----

  const openAddForm = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description || '',
      unit: item.unit,
      currentQuantity: String(item.currentQuantity),
      minimumLevel: String(item.minimumLevel),
      reorderQuantity: item.reorderQuantity ? String(item.reorderQuantity) : '',
      unitCost: item.unitCost ? String(item.unitCost) : '',
      supplier: item.supplier || '',
      location: item.location || '',
    });
    setFormOpen(true);
  };

  const openDetail = (item: InventoryItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const openDeleteConfirm = (item: InventoryItem) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.unit) {
      toast.error('Name, category, and unit are required');
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = !!editingItem;
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { id: editingItem!.id, ...form } : form;

      const res = await fetch('/api/inventory', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(isEdit ? `${form.name} updated!` : `${form.name} added to inventory!`);
        setFormOpen(false);
        setForm(emptyForm);
        setEditingItem(null);
        fetchData();
      } else {
        toast.error(data.error || `Failed to ${isEdit ? 'update' : 'create'} item`);
      }
    } catch {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} item`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/inventory?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`${deleteTarget.name} removed from inventory`);
        setDeleteOpen(false);
        setDeleteTarget(null);
        fetchData();
      } else {
        toast.error('Failed to delete item');
      }
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- Derived data ----

  const displayItems = items;

  // ---- Skeletons ----

  const SummarySkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-10" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const TableSkeleton = () => (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-24" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // ---- Render ----

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Summary Cards */}
      {isLoading ? (
        <SummarySkeletons />
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2.5">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold">{summary.totalItems}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2.5">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold text-red-600">{summary.lowStockCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5">
                <ArrowUpDown className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalValue)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Inventory Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Inventory Items</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-40 pl-8 text-xs"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant={showLowStock ? 'default' : 'outline'}
                className={`h-8 text-xs ${showLowStock ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-red-300 text-red-600'}`}
                onClick={() => setShowLowStock(!showLowStock)}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Low Stock
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white h-8"
                onClick={openAddForm}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                    <th className="text-left p-3 font-medium w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {items.length === 0 ? 'No inventory items yet' : 'No items match your filter'}
                        </p>
                        {items.length === 0 && (
                          <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-white mt-3"
                            onClick={openAddForm}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add First Item
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((item) => {
                      const isLow = item.currentQuantity <= item.minimumLevel;
                      const totalVal = item.currentQuantity * (item.unitCost || 0);

                      return (
                        <tr key={item.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => openDetail(item)}>
                          <td className="p-3">
                            <p className="font-medium">{item.name}</p>
                            {item.supplier && (
                              <p className="text-xs text-muted-foreground">{item.supplier}</p>
                            )}
                          </td>
                          <td className="p-3 hidden sm:table-cell">
                            <Badge className={`text-[10px] px-2 py-0.5 h-5 border-0 ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-700'}`}>
                              {CATEGORY_LABELS[item.category] || item.category}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className={isLow ? 'text-red-600 font-bold' : ''}>
                              {item.currentQuantity} {item.unit}
                            </span>
                            <span className="text-xs text-muted-foreground"> / min {item.minimumLevel}</span>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            {item.unitCost ? formatCurrency(item.unitCost) : '\u2014'}
                          </td>
                          <td className="p-3 hidden lg:table-cell font-medium">
                            {totalVal > 0 ? formatCurrency(totalVal) : '\u2014'}
                          </td>
                          <td className="p-3">
                            {isLow ? (
                              <Badge className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 h-5">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />Low Stock
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 h-5">
                                In Stock
                              </Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditForm(item)}>
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDeleteConfirm(item)}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── ADD / EDIT ITEM DIALOG ─── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingItem ? (
                <><Pencil className="h-5 w-5 text-amber-500" /> Edit Item</>
              ) : (
                <><Plus className="h-5 w-5 text-amber-500" /> Add New Item</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Item Name *</Label>
              <Input
                placeholder="e.g. Bed Sheets (King)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category *</Label>
              <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Unit *</Label>
              <Select value={form.unit} onValueChange={(val) => setForm({ ...form, unit: val })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Current Quantity</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.currentQuantity}
                onChange={(e) => setForm({ ...form, currentQuantity: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Minimum Level</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.minimumLevel}
                onChange={(e) => setForm({ ...form, minimumLevel: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reorder Quantity</Label>
              <Input
                type="number"
                placeholder="Optional"
                value={form.reorderQuantity}
                onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Unit Cost (₦)</Label>
              <Input
                type="number"
                placeholder="e.g. 3500"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Supplier</Label>
              <Input
                placeholder="e.g. ABC Supplies"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input
                placeholder="e.g. Store Room B"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</>
              ) : editingItem ? (
                <><Pencil className="h-4 w-4 mr-1" /> Update Item</>
              ) : (
                <><Plus className="h-4 w-4 mr-1" /> Add Item</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ITEM DETAIL DIALOG ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p>{selectedItem.name}</p>
                    <Badge className={`mt-1 text-[10px] px-2 py-0.5 h-5 border-0 ${CATEGORY_COLORS[selectedItem.category] || 'bg-gray-100 text-gray-700'}`}>
                      {CATEGORY_LABELS[selectedItem.category] || selectedItem.category}
                    </Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Quantity</p>
                    <p className={`text-lg font-bold ${selectedItem.currentQuantity <= selectedItem.minimumLevel ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selectedItem.currentQuantity} {selectedItem.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Minimum Level</p>
                    <p className="text-lg font-bold">{selectedItem.minimumLevel} {selectedItem.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unit Cost</p>
                    <p className="font-medium">{selectedItem.unitCost ? formatCurrency(selectedItem.unitCost) : '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="font-medium">{formatCurrency(selectedItem.currentQuantity * (selectedItem.unitCost || 0))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <p className="font-medium">{selectedItem.supplier || '\u2014'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedItem.location || '\u2014'}</p>
                  </div>
                  {selectedItem.reorderQuantity && (
                    <div>
                      <p className="text-xs text-muted-foreground">Reorder Qty</p>
                      <p className="font-medium">{selectedItem.reorderQuantity} {selectedItem.unit}</p>
                    </div>
                  )}
                </div>

                {selectedItem.description && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedItem.description}</p>
                  </div>
                )}

                {selectedItem.currentQuantity <= selectedItem.minimumLevel && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-700">
                      Low stock alert! Consider reordering.
                      {selectedItem.reorderQuantity && ` Suggested: ${selectedItem.reorderQuantity} ${selectedItem.unit}`}
                    </p>
                  </div>
                )}

                {selectedItem.stockMovements.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Last Movement</p>
                    <div className="flex items-center gap-2">
                      {selectedItem.stockMovements[0].type === 'in' ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">
                        {formatLabel(selectedItem.stockMovements[0].type)}{' '}
                        {selectedItem.stockMovements[0].quantity} {selectedItem.unit}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(selectedItem.stockMovements[0].createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setDetailOpen(false); openEditForm(selectedItem); }}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50" onClick={() => { setDetailOpen(false); openDeleteConfirm(selectedItem); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRM DIALOG ─── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Item
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to remove <span className="font-medium text-foreground">{deleteTarget.name}</span> from inventory? This action can be undone later, but the item will be hidden from all lists.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 className="h-4 w-4 mr-1" /> Delete</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatLabel(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}