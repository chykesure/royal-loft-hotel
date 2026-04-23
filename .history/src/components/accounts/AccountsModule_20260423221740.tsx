'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CalendarDays,
  Wallet,
  Receipt,
  BarChart3,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// --- Types ---
interface OutstandingBills {
  count: number;
  total: number;
}

interface RevenueCategory {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  paymentMethod: string;
  date: string;
}

interface PaymentMethodItem {
  method: string;
  label: string;
  total: number;
  percentage: number;
}

interface AccountsData {
  monthlyRevenue: number;
  outstandingBills: OutstandingBills;
  totalExpenses: number;
  netProfit: number;
  revenueByCategory: RevenueCategory[];
  recentTransactions: Transaction[];
  paymentMethodsBreakdown: PaymentMethodItem[];
  trends: {
    revenue: number;
    profit: number;
  };
}

// --- Helpers ---
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatTransactionDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const dateLabel = isToday
    ? 'Today'
    : isYesterday
      ? 'Yesterday'
      : d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return `${dateLabel}, ${time}`;
}

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    pos: 'POS / Card',
    bank_transfer: 'Bank Transfer',
    opay: 'OPay',
    palmpay: 'PalmPay',
    moniepoint: 'Moniepoint',
  };
  return labels[method] || method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
}

function getMonthRange(monthOffset: number) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const from = new Date(target.getFullYear(), target.getMonth(), 1);
  const to = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

// --- Component ---
export function AccountsModule() {
  const [data, setData] = useState<AccountsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('0'); // 0 = current month

  const fetchData = useCallback(async (monthOffset: string) => {
    setIsLoading(true);
    try {
      const offset = parseInt(monthOffset, 10) || 0;
      const { from, to } = getMonthRange(offset);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await fetch(`/api/accounts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch accounts data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load accounts data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth, fetchData]);

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label =
      i === 0
        ? 'This Month'
        : i === 1
          ? 'Last Month'
          : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { value: String(-i), label };
  });

  // --- Loading State ---
  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Accounts & Finance</h2>
            <p className="text-sm text-muted-foreground">Financial overview and transaction history</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="ml-3 text-sm text-muted-foreground">Loading financial data...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const monthlyRevenue = data.monthlyRevenue || 0;
const outstandingBills = data.outstandingBills || { count: 0, total: 0 };
const totalExpenses = data.totalExpenses || 0;
const netProfit = data.netProfit || 0;
const revenueByCategory = data.revenueByCategory || [];
const recentTransactions = data.recentTransactions || [];
const paymentMethodsBreakdown = data.paymentMethodsBreakdown || [];
const trends = data.trends || { revenue: 0, profit: 0 };
  const profitMargin = monthlyRevenue > 0 ? Math.round((netProfit / monthlyRevenue) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Accounts & Finance</h2>
          <p className="text-sm text-muted-foreground">Financial overview and transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]" size="sm">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Revenue */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              <div className="rounded-md bg-emerald-100 p-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(monthlyRevenue)}</p>
            <p className={`text-xs flex items-center gap-1 mt-1 ${trends.revenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trends.revenue >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {trends.revenue >= 0 ? '+' : ''}{trends.revenue}% from last month
            </p>
          </CardContent>
        </Card>

        {/* Outstanding Bills */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Outstanding Bills</p>
              <div className="rounded-md bg-red-100 p-1.5">
                <DollarSign className="h-3.5 w-3.5 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(outstandingBills.total)}</p>
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <ArrowDownRight className="h-3 w-3" />
              {outstandingBills.count} pending bill{outstandingBills.count !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <div className="rounded-md bg-orange-100 p-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalExpenses === 0 ? 'No expenses recorded' : `${formatCurrency(totalExpenses)} total spent`}
            </p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <div className="rounded-md bg-amber-100 p-1.5">
                <CreditCard className="h-3.5 w-3.5 text-amber-600" />
              </div>
            </div>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </p>
            <p className={`text-xs flex items-center gap-1 mt-1 ${netProfit >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {trends.profit >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {profitMargin}% margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Category + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Category */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByCategory.every((c) => c.amount === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No revenue data for this period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {revenueByCategory.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground/80">{item.name}</span>
                      <span className="font-medium text-foreground">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.percentage}%</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-500" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CreditCard className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <Badge
                          variant={tx.type === 'income' ? 'default' : 'destructive'}
                          className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                        >
                          {tx.type === 'income' ? 'Income' : 'Expense'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTransactionDate(tx.date)} &bull; {formatPaymentMethod(tx.paymentMethod)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Breakdown */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-amber-500" />
            Payment Methods Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMethodsBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No payment data for this period</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paymentMethodsBreakdown.map((item) => (
                <div
                  key={item.method}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="rounded-md bg-amber-100 p-2 shrink-0">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(item.total)}</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {item.percentage}%
                      </Badge>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
