'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ScrollText, Plus, Edit3, Trash2, Loader2, Eye,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['checkin_checkout', 'cancellation', 'payment', 'conduct', 'pets', 'children', 'smoking', 'other'];

const CATEGORY_LABELS: Record<string, string> = {
  checkin_checkout: 'Check-in/Check-out',
  cancellation: 'Cancellation',
  payment: 'Payment',
  conduct: 'Guest Conduct',
  pets: 'Pets',
  children: 'Children',
  smoking: 'Smoking',
  other: 'Other',
};

interface HotelPolicy {
  id: string;
  title: string;
  description: string;
  category: string;
  isActive: boolean;
  displayToGuest: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function HotelRulesModule() {
  const [policies, setPolicies] = useState<HotelPolicy[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDisplayToGuest, setFormDisplayToGuest] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState('0');

  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/rules');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
        setActiveCount(data.activeCount || 0);
      } else {
        toast.error('Failed to load policies');
      }
    } catch {
      toast.error('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('');
    setFormDisplayToGuest(true);
    setFormSortOrder('0');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription || !formCategory) {
      toast.error('Title, description, and category are required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formTitle,
        description: formDescription,
        category: formCategory,
        displayToGuest: formDisplayToGuest,
        sortOrder: parseInt(formSortOrder) || 0,
      };

      const url = editingId ? `/api/rules?id=${editingId}` : '/api/rules';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingId ? 'Policy updated' : 'Policy added');
        resetForm();
        fetchPolicies();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save policy');
      }
    } catch {
      toast.error('Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (policy: HotelPolicy) => {
    setFormTitle(policy.title);
    setFormDescription(policy.description);
    setFormCategory(policy.category);
    setFormDisplayToGuest(policy.displayToGuest);
    setFormSortOrder(String(policy.sortOrder));
    setEditingId(policy.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      const res = await fetch(`/api/rules?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Policy deleted');
        fetchPolicies();
      } else {
        toast.error('Failed to delete policy');
      }
    } catch {
      toast.error('Failed to delete policy');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500">
            <ScrollText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Hotel Rules & Policies</h2>
            <p className="text-sm text-muted-foreground">{activeCount} active policies</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Policy
        </Button>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Policy' : 'Add New Policy'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Title *</Label>
                <Input placeholder="e.g. Check-in Policy" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Enter the policy description..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Label>Sort Order</Label>
                  <Input type="number" placeholder="0" min="0" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Display to Guests</p>
                  <p className="text-xs text-muted-foreground">Show this policy in the guest portal</p>
                </div>
                <Switch checked={formDisplayToGuest} onCheckedChange={setFormDisplayToGuest} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 text-white">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingId ? 'Update Policy' : 'Add Policy'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Policies List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : policies.length === 0 ? (
        <div className="text-center py-12">
          <ScrollText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No policies found</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first hotel policy to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((policy) => (
            <Card key={policy.id} className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm">{policy.title}</h3>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {CATEGORY_LABELS[policy.category] || policy.category}
                      </Badge>
                      {policy.displayToGuest && (
                        <Badge className="bg-sky-100 text-sky-700 text-[10px] px-1.5 py-0 h-4">
                          <Eye className="h-2.5 w-2.5 mr-1" />Visible to Guests
                        </Badge>
                      )}
                      {!policy.isActive && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{policy.description}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(policy)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(policy.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
