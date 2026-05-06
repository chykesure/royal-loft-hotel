'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package, AlertTriangle, Plus, ArrowUpDown, Search, Pencil, Trash2, Loader2,
  TrendingUp, TrendingDown, ArrowDownToLine, ShoppingCart, UserCheck, UtensilsCrossed,
  History, Wrench, Eye,
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
    unitPrice: number | null;
    totalAmount: number | null;
    notes: string | null;
    guestName: string | null;
    createdAt: string;
  }[];
}

interface StockMovement {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  unitCost: number | null;
  unitPrice: number | null;
  totalAmount: number | null;
  reference: string | null;
  notes: string | null;
  guestId: string | null;
  guestName: string | null;
  reservationId: string | null;
  performedBy: string | null;
  createdAt: string;
  item: { id: string; name: string; unit: string; category: string };
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
  minibar: 'Minibar',
  amenities: 'Guest Amenities',
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
  minibar: 'bg-yellow-100 text-yellow-700',
  amenities: 'bg-green-100 text-green-700',
};

const UNITS = ['pieces', 'liters', 'kg', 'packs', 'rolls', 'boxes', 'bottles', 'sets', 'pairs', 'dozens', 'cartons', 'bags'];
const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: 'Stock In',
  out_sell: 'Sold',
  out_guest: 'Issued to Guest',
  out_consume: 'Consumed',
  adjustment: 'Adjustment',
};

const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  in: 'bg-emerald-100 text-emerald-700',
  out_sell: 'bg-blue-100 text-blue-700',
  out_guest: 'bg-purple-100 text-purple-700',
  out_consume: 'bg-orange-100 text-orange-700',
  adjustment: 'bg-gray-100 text-gray-700',
};

const MOVEMENT_TYPE_ICONS: Record<string, React.ElementType> = {
  in: TrendingUp,
  out_sell: ShoppingCart,
  out_guest: UserCheck,
  out_consume: UtensilsCrossed,
  adjustment: Wrench,
};

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
  const [activeTab, setActiveTab] = useState('items');

  // Items tab
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

  // Movement dialogs
  const [stockInOpen, setStockInOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [guestIssueOpen, setGuestIssueOpen] = useState(false);
  const [consumeOpen, setConsumeOpen] = useState(false);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Movement history
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movTotal, setMovTotal] = useState(0);
  const [movPage, setMovPage] = useState(1);
  const [movLoading, setMovLoading] = useState(false);
  const [movFilterType, setMovFilterType] = useState('all');
  const [movSearch, setMovSearch] = useState('');
  const [movStats, setMovStats] = useState<any>(null);

  // Form fields for movements
  const [movQty, setMovQty] = useState('');
  const [movNotes, setMovNotes] = useState('');
  const [movRef, setMovRef] = useState('');
  const [movUnitCost, setMovUnitCost] = useState('');
  const [movUnitPrice, setMovUnitPrice] = useState('');
  const [movGuestName, setMovGuestName] = useState('');
  const [movGuestId, setMovGuestId] = useState('');
  const [movReservationId, setMovReservationId] = useState('');

  // Guest search
  const [guestResults, setGuestResults] = useState<any[]>([]);
  const [guestSearching, setGuestSearching] = useState(false);

  const fetchItems = useCallback(async () => {
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

  const fetchMovements = useCallback(async () => {
    try {
      setMovLoading(true);
      const params = new URLSearchParams({ mode: 'movements', page: String(movPage), limit: '50' });
      if (movFilterType !== 'all') params.set('type', movFilterType);
      if (movSearch.trim()) params.set('itemId', movSearch);

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
        setMovTotal(data.total || 0);
        setMovStats(data.stats || null);
      }
    } catch {
      toast.error('Failed to load movements');
    } finally {
      setMovLoading(false);
    }
  }, [movPage, movFilterType, movSearch]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (activeTab === 'history') fetchMovements();
  }, [activeTab, fetchMovements]);

  // ---- Movement helpers ----

  const resetMovementForm = () => {
    setMovQty('');
    setMovNotes('');
    setMovRef('');
    setMovUnitCost('');
    setMovUnitPrice('');
    setMovGuestName('');
    setMovGuestId('');
    setMovReservationId('');
    setMovementItem(null);
  };

  const openMovement = (item: InventoryItem, dialogSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
    resetMovementForm();
    setMovementItem(item);
    setMovUnitCost(item.unitCost ? String(item.unitCost) : '');
    dialogSetter(true);
  };

  const processMovement = async (action: string, extraData: any = {}) => {
    if (!movementItem || !movQty || Number(movQty) <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    setIsProcessing(true);
    try {
      const body: any = {
        action,
        itemId: movementItem.id,
        quantity: Number(movQty),
        notes: movNotes || undefined,
        ...extraData,
      };

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Movement recorded: ${MOVEMENT_TYPE_LABELS[action]} ${movQty} ${movementItem.unit}`);
        setStockInOpen(false);
        setSellOpen(false);
        setGuestIssueOpen(false);
        setConsumeOpen(false);
        resetMovementForm();
        fetchItems();
      } else {
        toast.error(data.error || 'Movement failed');
      }
    } catch {
      toast.error('Failed to record movement');
    } finally {
      setIsProcessing(false);
    }
  };

  // Guest search
  const searchGuests = async (query: string) => {
    setMovGuestName(query);
    if (query.length < 2) {
      setGuestResults([]);
      return;
    }
    try {
      setGuestSearching(true);
      const res = await fetch(`/api/guests?search=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setGuestResults(data.guests || []);
      }
    } catch {
      // ignore
    } finally {
      setGuestSearching(false);
    }
  };

  const selectGuest = (guest: any) => {
    setMovGuestName(`${guest.firstName} ${guest.lastName}`);
    setMovGuestId(guest.id);
    setGuestResults([]);
    if (guest.reservations) {
      const active = guest.reservations.find((r: any) => ['checked_in', 'confirmed'].includes(r.status));
      if (active) setMovReservationId(active.id);
    }
  };

  // ---- Item CRUD handlers ----

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
        fetchItems();
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
        fetchItems();
      } else {
        toast.error('Failed to delete item');
      }
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- Render helpers ----

  const isLow = (item: InventoryItem) => item.currentQuantity <= item.minimumLevel;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ---- Quick action buttons for each item row ----

  const ItemActions = ({ item }: { item: InventoryItem }) => (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Stock In" onClick={() => openMovement(item, setStockInOpen)}>
        <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Sell" onClick={() => openMovement(item, setSellOpen)}>
        <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Issue to Guest" onClick={() => openMovement(item, setGuestIssueOpen)}>
        <UserCheck className="h-3.5 w-3.5 text-purple-600" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Consume/Use" onClick={() => openMovement(item, setConsumeOpen)}>
        <UtensilsCrossed className="h-3.5 w-3.5 text-orange-600" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditForm(item)}>
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDeleteConfirm(item)}>
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
      </Button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════

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
            <p className="text-sm text-muted-foreground">Track stock, sales, and guest item allocations</p>
          </div>
        </div>
        <Button onClick={openAddForm} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-10" /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2.5"><Package className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold">{summary.totalItems}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2.5"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold text-red-600">{summary.lowStockCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5"><ArrowUpDown className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalValue)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="items" className="text-xs sm:text-sm"><Package className="h-3.5 w-3.5 sm:mr-1.5 hidden sm:inline" />Items</TabsTrigger>
          <TabsTrigger value="stockin" className="text-xs sm:text-sm"><ArrowDownToLine className="h-3.5 w-3.5 sm:mr-1.5 hidden sm:inline" />Stock In</TabsTrigger>
          <TabsTrigger value="sell" className="text-xs sm:text-sm"><ShoppingCart className="h-3.5 w-3.5 sm:mr-1.5 hidden sm:inline" />Sell</TabsTrigger>
          <TabsTrigger value="guest" className="text-xs sm:text-sm"><UserCheck className="h-3.5 w-3.5 sm:mr-1.5 hidden sm:inline" />Guest</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm"><History className="h-3.5 w-3.5 sm:mr-1.5 hidden sm:inline" />History</TabsTrigger>
        </TabsList>

        {/* ════════════ TAB: ITEMS ════════════ */}
        <TabsContent value="items" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Inventory Items</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-40 pl-8 text-xs" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant={showLowStock ? 'default' : 'outline'} className={`h-8 text-xs ${showLowStock ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-red-300 text-red-600'}`} onClick={() => setShowLowStock(!showLowStock)}>
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Low Stock
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No inventory items yet</p>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white mt-3" onClick={openAddForm}><Plus className="h-4 w-4 mr-1" /> Add First Item</Button>
                </div>
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
                        <th className="text-left p-3 font-medium w-40">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const totalVal = item.currentQuantity * (item.unitCost || 0);
                        return (
                          <tr key={item.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => openDetail(item)}>
                            <td className="p-3">
                              <p className="font-medium">{item.name}</p>
                              {item.supplier && <p className="text-xs text-muted-foreground">{item.supplier}</p>}
                            </td>
                            <td className="p-3 hidden sm:table-cell">
                              <Badge className={`text-[10px] px-2 py-0.5 h-5 border-0 ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-700'}`}>
                                {CATEGORY_LABELS[item.category] || item.category}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <span className={isLow(item) ? 'text-red-600 font-bold' : ''}>{item.currentQuantity} {item.unit}</span>
                              <span className="text-xs text-muted-foreground"> / min {item.minimumLevel}</span>
                            </td>
                            <td className="p-3 hidden md:table-cell">{item.unitCost ? formatCurrency(item.unitCost) : '\u2014'}</td>
                            <td className="p-3 hidden lg:table-cell font-medium">{totalVal > 0 ? formatCurrency(totalVal) : '\u2014'}</td>
                            <td className="p-3">
                              {isLow(item) ? (
                                <Badge className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 h-5"><AlertTriangle className="h-2.5 w-2.5 mr-1" />Low</Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 h-5">In Stock</Badge>
                              )}
                            </td>
                            <td className="p-3"><ItemActions item={item} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════ TAB: STOCK IN ════════════ */}
        <TabsContent value="stockin" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-emerald-600" /> Stock In - Add New Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Select an item to record incoming stock. You can also click the <ArrowDownToLine className="h-3.5 w-3.5 inline text-emerald-600" /> icon on any item in the Items tab.</p>
              <div className="grid gap-4 max-w-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Select Item *</Label>
                  <Select value={movementItem?.id || ''} onValueChange={(val) => {
                    const found = items.find(i => i.id === val);
                    if (found) openMovement(found, setStockInOpen);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Choose an item to stock in..." /></SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.currentQuantity} {i.unit} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════ TAB: SELL ════════════ */}
        <TabsContent value="sell" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-blue-600" /> Sell Item</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Record items sold to walk-in customers or external buyers. Click the <ShoppingCart className="h-3.5 w-3.5 inline text-blue-600" /> icon on any item for quick sell.</p>
              <div className="grid gap-4 max-w-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Select Item *</Label>
                  <Select value={movementItem?.id || ''} onValueChange={(val) => {
                    const found = items.find(i => i.id === val);
                    if (found) openMovement(found, setSellOpen);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Choose an item to sell..." /></SelectTrigger>
                    <SelectContent>
                      {items.filter(i => i.currentQuantity > 0).map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.currentQuantity} {i.unit} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════ TAB: ISSUE TO GUEST ════════════ */}
        <TabsContent value="guest" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><UserCheck className="h-5 w-5 text-purple-600" /> Issue Item to Guest</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Record items given to hotel guests (amenities, minibar, toiletries, etc.). Click the <UserCheck className="h-3.5 w-3.5 inline text-purple-600" /> icon on any item for quick issue.</p>
              <div className="grid gap-4 max-w-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Select Item *</Label>
                  <Select value={movementItem?.id || ''} onValueChange={(val) => {
                    const found = items.find(i => i.id === val);
                    if (found) openMovement(found, setGuestIssueOpen);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Choose an item to issue..." /></SelectTrigger>
                    <SelectContent>
                      {items.filter(i => i.currentQuantity > 0).map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.currentQuantity} {i.unit} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════ TAB: MOVEMENT HISTORY ════════════ */}
        <TabsContent value="history" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base flex items-center gap-2"><History className="h-5 w-5 text-amber-600" /> Movement History</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Select value={movFilterType} onValueChange={(v) => { setMovFilterType(v); setMovPage(1); }}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {movStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-emerald-50">
                    <p className="text-xs text-muted-foreground">Total Stocked In</p>
                    <p className="text-lg font-bold text-emerald-700">{movStats.byType?.find((t: any) => t.type === 'in')?._sum?.quantity || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50">
                    <p className="text-xs text-muted-foreground">Total Sold</p>
                    <p className="text-lg font-bold text-blue-700">{movStats.byType?.find((t: any) => t.type === 'out_sell')?._sum?.quantity || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50">
                    <p className="text-xs text-muted-foreground">Issued to Guests</p>
                    <p className="text-lg font-bold text-purple-700">{movStats.byType?.find((t: any) => t.type === 'out_guest')?._sum?.quantity || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50">
                    <p className="text-xs text-muted-foreground">Sales Revenue</p>
                    <p className="text-lg font-bold text-amber-700">{formatCurrency(movStats.byType?.find((t: any) => t.type === 'out_sell')?._sum?.totalAmount || 0)}</p>
                  </div>
                </div>
              )}

              {movLoading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : movements.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No movements recorded yet</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Date</th>
                          <th className="text-left p-3 font-medium">Item</th>
                          <th className="text-left p-3 font-medium">Type</th>
                          <th className="text-left p-3 font-medium">Qty</th>
                          <th className="text-left p-3 font-medium hidden sm:table-cell">Amount</th>
                          <th className="text-left p-3 font-medium hidden md:table-cell">Guest</th>
                          <th className="text-left p-3 font-medium hidden lg:table-cell">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((m) => {
                          const TypeIcon = MOVEMENT_TYPE_ICONS[m.type] || Wrench;
                          const isIn = m.type === 'in';
                          return (
                            <tr key={m.id} className="border-b hover:bg-muted/30">
                              <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(m.createdAt)}</td>
                              <td className="p-3">
                                <p className="font-medium">{m.item.name}</p>
                                <p className="text-xs text-muted-foreground">{m.item.category}</p>
                              </td>
                              <td className="p-3">
                                <Badge className={`text-[10px] px-2 py-0.5 h-5 border-0 ${MOVEMENT_TYPE_COLORS[m.type] || 'bg-gray-100 text-gray-700'}`}>
                                  <TypeIcon className="h-2.5 w-2.5 mr-1" />
                                  {MOVEMENT_TYPE_LABELS[m.type] || m.type}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <span className={isIn ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                                  {isIn ? '+' : '-'}{Math.abs(m.quantity)} {m.item.unit}
                                </span>
                              </td>
                              <td className="p-3 hidden sm:table-cell">
                                {m.totalAmount ? formatCurrency(m.totalAmount) : m.unitCost ? formatCurrency(m.unitCost * Math.abs(m.quantity)) : '\u2014'}
                              </td>
                              <td className="p-3 hidden md:table-cell">{m.guestName || '\u2014'}</td>
                              <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{m.notes || '\u2014'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {movTotal > 50 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-muted-foreground">Showing page {movPage} of {Math.ceil(movTotal / 50)}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={movPage <= 1} onClick={() => setMovPage(movPage - 1)}>Previous</Button>
                        <Button size="sm" variant="outline" disabled={movPage >= Math.ceil(movTotal / 50)} onClick={() => setMovPage(movPage + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ══════════════════════════════════════════════════════════
          DIALOGS
          ══════════════════════════════════════════════════════════ */}

      {/* ─── ADD / EDIT ITEM DIALOG ─── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingItem ? <><Pencil className="h-5 w-5 text-amber-500" /> Edit Item</> : <><Plus className="h-5 w-5 text-amber-500" /> Add New Item</>}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Item Name *</Label>
              <Input placeholder="e.g. Bed Sheets (King)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category *</Label>
              <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Unit *</Label>
              <Select value={form.unit} onValueChange={(val) => setForm({ ...form, unit: val })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Current Quantity</Label>
              <Input type="number" placeholder="0" value={form.currentQuantity} onChange={(e) => setForm({ ...form, currentQuantity: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Minimum Level</Label>
              <Input type="number" placeholder="0" value={form.minimumLevel} onChange={(e) => setForm({ ...form, minimumLevel: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reorder Quantity</Label>
              <Input type="number" placeholder="Optional" value={form.reorderQuantity} onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Unit Cost (&#8358;)</Label>
              <Input type="number" placeholder="e.g. 3500" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Supplier</Label>
              <Input placeholder="e.g. ABC Supplies" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input placeholder="e.g. Store Room B" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : editingItem ? <><Pencil className="h-4 w-4 mr-1" /> Update</> : <><Plus className="h-4 w-4 mr-1" /> Add Item</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── STOCK IN DIALOG ─── */}
      <Dialog open={stockInOpen} onOpenChange={(open) => { if (!open) resetMovementForm(); else setStockInOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-emerald-600" /> Stock In</DialogTitle>
          </DialogHeader>
          {movementItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium">{movementItem.name}</p>
                <p className="text-xs text-muted-foreground">Current stock: {movementItem.currentQuantity} {movementItem.unit}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Quantity to Add *</Label>
                <Input type="number" placeholder="0" min="0.1" step="0.1" value={movQty} onChange={(e) => setMovQty(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Unit Cost (&#8358;) - Optional</Label>
                <Input type="number" placeholder={movementItem.unitCost ? String(movementItem.unitCost) : 'e.g. 3500'} value={movUnitCost} onChange={(e) => setMovUnitCost(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reference / Invoice #</Label>
                <Input placeholder="Optional reference" value={movRef} onChange={(e) => setMovRef(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea placeholder="e.g. Restocked from supplier XYZ" value={movNotes} onChange={(e) => setMovNotes(e.target.value)} className="mt-1" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setStockInOpen(false); resetMovementForm(); }}>Cancel</Button>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => processMovement('stock_in', { unitCost: movUnitCost || undefined, reference: movRef || undefined })} disabled={isProcessing}>
                  {isProcessing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...</> : <><ArrowDownToLine className="h-4 w-4 mr-1" /> Stock In</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── SELL DIALOG ─── */}
      <Dialog open={sellOpen} onOpenChange={(open) => { if (!open) resetMovementForm(); else setSellOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-blue-600" /> Sell Item</DialogTitle>
          </DialogHeader>
          {movementItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium">{movementItem.name}</p>
                <p className="text-xs text-muted-foreground">Available: {movementItem.currentQuantity} {movementItem.unit}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Quantity to Sell *</Label>
                <Input type="number" placeholder="0" min="0.1" step="0.1" max={movementItem.currentQuantity} value={movQty} onChange={(e) => setMovQty(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Selling Price per {movementItem.unit} (&#8358;)</Label>
                <Input type="number" placeholder="e.g. 5000" value={movUnitPrice} onChange={(e) => setMovUnitPrice(e.target.value)} className="mt-1" />
              </div>
              {movQty && movUnitPrice && Number(movQty) > 0 && Number(movUnitPrice) > 0 && (
                <div className="p-3 rounded-lg bg-blue-50">
                  <p className="text-xs text-blue-600">Total: <span className="text-lg font-bold">{formatCurrency(Number(movQty) * Number(movUnitPrice))}</span></p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Reference / Receipt #</Label>
                <Input placeholder="Optional" value={movRef} onChange={(e) => setMovRef(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea placeholder="e.g. Sold to walk-in customer" value={movNotes} onChange={(e) => setMovNotes(e.target.value)} className="mt-1" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setSellOpen(false); resetMovementForm(); }}>Cancel</Button>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => processMovement('sell', { unitPrice: movUnitPrice || undefined, reference: movRef || undefined })} disabled={isProcessing}>
                  {isProcessing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...</> : <><ShoppingCart className="h-4 w-4 mr-1" /> Record Sale</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── ISSUE TO GUEST DIALOG ─── */}
      <Dialog open={guestIssueOpen} onOpenChange={(open) => { if (!open) resetMovementForm(); else setGuestIssueOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-purple-600" /> Issue to Guest</DialogTitle>
          </DialogHeader>
          {movementItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium">{movementItem.name}</p>
                <p className="text-xs text-muted-foreground">Available: {movementItem.currentQuantity} {movementItem.unit}</p>
              </div>
              <div className="relative">
                <Label className="text-xs text-muted-foreground">Guest Name</Label>
                <Input placeholder="Type to search guests..." value={movGuestName} onChange={(e) => searchGuests(e.target.value)} className="mt-1" />
                {guestResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-auto">
                    {guestResults.map((g) => (
                      <button key={g.id} className="w-full text-left p-2 hover:bg-muted/50 text-sm" onClick={() => selectGuest(g)}>
                        <p className="font-medium">{g.firstName} {g.lastName}</p>
                        <p className="text-xs text-muted-foreground">{g.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
                {guestSearching && <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-7" />}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Quantity *</Label>
                <Input type="number" placeholder="0" min="0.1" step="0.1" max={movementItem.currentQuantity} value={movQty} onChange={(e) => setMovQty(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea placeholder="e.g. Extra towels for Room 204" value={movNotes} onChange={(e) => setMovNotes(e.target.value)} className="mt-1" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setGuestIssueOpen(false); resetMovementForm(); }}>Cancel</Button>
                <Button className="bg-purple-500 hover:bg-purple-600 text-white" onClick={() => processMovement('issue_guest', {
                  guestId: movGuestId || undefined,
                  guestName: movGuestName || undefined,
                  reservationId: movReservationId || undefined,
                })} disabled={isProcessing}>
                  {isProcessing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...</> : <><UserCheck className="h-4 w-4 mr-1" /> Issue to Guest</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── CONSUME DIALOG ─── */}
      <Dialog open={consumeOpen} onOpenChange={(open) => { if (!open) resetMovementForm(); else setConsumeOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UtensilsCrossed className="h-5 w-5 text-orange-600" /> Internal Consumption</DialogTitle>
          </DialogHeader>
          {movementItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="font-medium">{movementItem.name}</p>
                <p className="text-xs text-muted-foreground">Available: {movementItem.currentQuantity} {movementItem.unit}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Quantity Used *</Label>
                <Input type="number" placeholder="0" min="0.1" step="0.1" max={movementItem.currentQuantity} value={movQty} onChange={(e) => setMovQty(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes / Reason</Label>
                <Textarea placeholder="e.g. Used for hotel event, damaged items, expiry, etc." value={movNotes} onChange={(e) => setMovNotes(e.target.value)} className="mt-1" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setConsumeOpen(false); resetMovementForm(); }}>Cancel</Button>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => processMovement('consume')} disabled={isProcessing}>
                  {isProcessing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...</> : <><UtensilsCrossed className="h-4 w-4 mr-1" /> Record Consumption</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── ITEM DETAIL DIALOG ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><Package className="h-5 w-5 text-amber-600" /></div>
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
                    <p className={`text-lg font-bold ${isLow(selectedItem) ? 'text-red-600' : 'text-emerald-600'}`}>{selectedItem.currentQuantity} {selectedItem.unit}</p>
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
                </div>

                {selectedItem.description && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedItem.description}</p>
                  </div>
                )}

                {isLow(selectedItem) && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-700">Low stock! {selectedItem.reorderQuantity ? `Suggested reorder: ${selectedItem.reorderQuantity} ${selectedItem.unit}` : 'Consider restocking.'}</p>
                  </div>
                )}

                {selectedItem.stockMovements.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Recent Movements</p>
                    <div className="space-y-2">
                      {selectedItem.stockMovements.map((m, i) => {
                        const isIn = m.type === 'in';
                        const TypeIcon = MOVEMENT_TYPE_ICONS[m.type] || Wrench;
                        return (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                            <TypeIcon className={`h-4 w-4 ${isIn ? 'text-emerald-500' : 'text-red-500'}`} />
                            <span className="font-medium">{isIn ? '+' : '-'}{m.quantity}</span>
                            <Badge className={`text-[10px] px-1.5 py-0 h-4 border-0 ${MOVEMENT_TYPE_COLORS[m.type] || 'bg-gray-100'}`}>
                              {MOVEMENT_TYPE_LABELS[m.type] || m.type}
                            </Badge>
                            {m.guestName && <span className="text-xs text-purple-600">to {m.guestName}</span>}
                            <span className="text-xs text-muted-foreground ml-auto">{new Date(m.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1 text-emerald-600 border-emerald-300" onClick={() => { setDetailOpen(false); openMovement(selectedItem, setStockInOpen); }}>
                    <ArrowDownToLine className="h-3.5 w-3.5 mr-1" /> Stock In
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-blue-600 border-blue-300" onClick={() => { setDetailOpen(false); openMovement(selectedItem, setSellOpen); }}>
                    <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Sell
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1 text-purple-600 border-purple-300" onClick={() => { setDetailOpen(false); openMovement(selectedItem, setGuestIssueOpen); }}>
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Guest
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setDetailOpen(false); openEditForm(selectedItem); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRM DIALOG ─── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-5 w-5" /> Delete Item</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Are you sure you want to remove <span className="font-medium text-foreground">{deleteTarget.name}</span> from inventory?</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4 mr-1" /> Delete</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}