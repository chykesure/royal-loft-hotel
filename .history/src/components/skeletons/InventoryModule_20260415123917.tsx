'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, AlertTriangle, Plus, ArrowUpDown } from 'lucide-react';

const inventory = [
  { name: 'Bed Sheets (King)', cat: 'Housekeeping', qty: 120, min: 30, unit: 'pcs', cost: '₦3,500' },
  { name: 'Pillow Cases', cat: 'Housekeeping', qty: 200, min: 50, unit: 'pcs', cost: '₦800' },
  { name: 'Towels (Bath)', cat: 'Housekeeping', qty: 150, min: 40, unit: 'pcs', cost: '₦1,200' },
  { name: 'Toilet Paper', cat: 'Housekeeping', qty: 500, min: 100, unit: 'rolls', cost: '₦150' },
  { name: 'Liquid Soap', cat: 'Housekeeping', qty: 25, min: 10, unit: 'L', cost: '₦2,000' },
  { name: 'Bottled Water', cat: 'Bar', qty: 48, min: 12, unit: 'packs', cost: '₦1,500' },
  { name: 'Coffee Sachets', cat: 'Kitchen', qty: 15, min: 5, unit: 'boxes', cost: '₦3,500' },
  { name: 'Light Bulbs (LED)', cat: 'Maintenance', qty: 8, min: 10, unit: 'pcs', cost: '₦800' },
  { name: 'Printer Paper (A4)', cat: 'Office', qty: 5, min: 3, unit: 'packs', cost: '₦4,500' },
  { name: 'Key Cards', cat: 'Front Desk', qty: 40, min: 20, unit: 'pcs', cost: '₦500' },
];

export function InventoryModule() {
  const lowStock = inventory.filter(i => i.qty <= i.min);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5"><Package className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Items</p><p className="text-xl font-bold">{inventory.length}</p></div>
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
            <div><p className="text-xs text-muted-foreground">Total Value</p><p className="text-xl font-bold">₦2.4M</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Inventory Items</CardTitle>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Category</th>
                <th className="text-left p-3 font-medium">Qty</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Unit Cost</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {inventory.map((item, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{item.cat}</td>
                    <td className="p-3">
                      <span className={item.qty <= item.min ? 'text-red-600 font-bold' : ''}>
                        {item.qty} {item.unit}
                      </span>
                      <span className="text-xs text-muted-foreground"> / min {item.min}</span>
                    </td>
                    <td className="p-3 hidden md:table-cell">{item.cost}</td>
                    <td className="p-3">
                      {item.qty <= item.min ? (
                        <Badge className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 h-5"><AlertTriangle className="h-2.5 w-2.5 mr-1" />Low Stock</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 h-5">In Stock</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
