'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Search, Plus, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const mockExpenses = [
  { id: '1', category: 'Supplies', description: 'Cleaning supplies', amount: 4500, date: '2025-01-15', status: 'approved' },
  { id: '2', category: 'Maintenance', description: 'Plumbing repair', amount: 12000, date: '2025-01-14', status: 'pending' },
  { id: '3', category: 'Utilities', description: 'Electricity bill', amount: 8500, date: '2025-01-13', status: 'approved' },
  { id: '4', category: 'Food & Beverage', description: 'Kitchen restock', amount: 6200, date: '2025-01-12', status: 'paid' },
  { id: '5', category: 'Staff', description: 'Uniform allowance', amount: 3000, date: '2025-01-11', status: 'pending' },
];

const statCards = [
  { title: 'Total Expenses', value: '₦34,200', change: '+12%', icon: DollarSign, trend: 'up' as const },
  { title: 'Pending Approval', value: '₦15,000', change: '3 items', icon: TrendingUp, trend: 'up' as const },
  { title: 'This Month', value: '₦28,500', change: '-5%', icon: TrendingDown, trend: 'down' as const },
];

export function ExpensesModule() {
  const [search, setSearch] = useState('');

  const filtered = mockExpenses.filter(
    (e) =>
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'paid': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and manage hotel expenses</p>
        </div>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.change}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Expense Records</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-60 h-8 text-sm"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr key={expense.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 font-medium">{expense.category}</td>
                    <td className="py-3 px-2 text-muted-foreground">{expense.description}</td>
                    <td className="py-3 px-2 text-right font-semibold">₦{expense.amount.toLocaleString()}</td>
                    <td className="py-3 px-2 text-muted-foreground">{expense.date}</td>
                    <td className="py-3 px-2 text-center">
                      <Badge variant="outline" className={`text-[10px] ${statusColor(expense.status)}`}>
                        {expense.status}
                      </Badge>
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