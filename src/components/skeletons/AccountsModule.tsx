'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function AccountsModule() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              <div className="rounded-md bg-emerald-100 p-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /></div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">₦4,250,000</p>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3" /> +12.5% from last month</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Outstanding Bills</p>
              <div className="rounded-md bg-red-100 p-1.5"><DollarSign className="h-3.5 w-3.5 text-red-600" /></div>
            </div>
            <p className="text-2xl font-bold text-red-600">₦385,000</p>
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1"><ArrowDownRight className="h-3 w-3" /> 8 pending bills</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <div className="rounded-md bg-orange-100 p-1.5"><TrendingDown className="h-3.5 w-3.5 text-orange-600" /></div>
            </div>
            <p className="text-2xl font-bold text-orange-600">₦1,850,000</p>
            <p className="text-xs text-muted-foreground mt-1">Utilities, salaries, supplies</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <div className="rounded-md bg-amber-100 p-1.5"><CreditCard className="h-3.5 w-3.5 text-amber-600" /></div>
            </div>
            <p className="text-2xl font-bold text-amber-600">₦2,015,000</p>
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3" /> +8.3% margin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Room Revenue', amount: '₦2,800,000', pct: 66 },
                { name: 'Food & Beverage', amount: '₦720,000', pct: 17 },
                { name: 'Bar & Lounge', amount: '₦380,000', pct: 9 },
                { name: 'Spa & Services', amount: '₦210,000', pct: 5 },
                { name: 'Other Services', amount: '₦140,000', pct: 3 },
              ].map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.name}</span><span className="font-medium">{item.amount}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { desc: 'Room 102 - 2 nights', amount: '+₦30,000', type: 'income', method: 'POS/Card', date: 'Today, 10:30 AM' },
                { desc: 'Restaurant - Guest Order', amount: '+₦8,500', type: 'income', method: 'Cash', date: 'Today, 9:15 AM' },
                { desc: 'Laundry Service - Bulk', amount: '-₦15,000', type: 'expense', method: 'Transfer', date: 'Yesterday, 4:00 PM' },
                { desc: 'Room 305 - 3 nights', amount: '+₦240,000', type: 'income', method: 'Bank Transfer', date: 'Yesterday, 2:00 PM' },
                { desc: 'Utility Bills - Electricity', amount: '-₦180,000', type: 'expense', method: 'Transfer', date: 'Yesterday, 11:00 AM' },
              ].map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{tx.desc}</p>
                    <p className="text-xs text-muted-foreground">{tx.date} • {tx.method}</p>
                  </div>
                  <span className={`text-sm font-medium ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
