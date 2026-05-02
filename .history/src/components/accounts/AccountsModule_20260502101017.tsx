// src/components/accounts/AccountsModule.tsx
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
  ArrowLeft,
  ChevronRight,
  Eye,
  Filter,
  FileText,
  Users,
  Tag,
  Building2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ===================== TYPES =====================

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
  grandTotalRevenue: number;
  grandTotalExpenses: number;
  grandTotalProfit: number;
  monthlyRevenue: number;
  outstandingBills: OutstandingBills;
  totalExpenses: number;
  netProfit: number;
  revenueByCategory: RevenueCategory[];
  recentTransactions: Transaction[];
  paymentMethodsBreakdown: PaymentMethodItem[];
  trends: { revenue: number; profit: number };
}

interface BillRecord {
  id: string;
  guestName: string;
  totalAmount: number;
  balanceAmount: number;
  totalPaid: number;
  status: string;
  createdAt: string;
  roomNumber: string;
  paymentMethods: string[];
}

interface ExpenseRecord {
  id: string;
  name: string;
  amount: number;
  category: string;
  vendor: string;
  date: string;
  paymentMethod: string;
}

interface RevenueDetailData {
  grandTotal: number;
  current: {
    from: string; to: string; total: number; billCount: number;
    categoryBreakdown: RevenueCategory[];
    bills: BillRecord[];
  };
  previous: {
    from: string; to: string; total: number; billCount: number;
    categoryBreakdown: RevenueCategory[];
  };
  change: number;
}

interface ExpenseDetailData {
  grandTotal: number;
  current: {
    from: string; to: string; total: number; expenseCount: number;
    categoryBreakdown: Array<{ name: string; amount: number; percentage: number }>;
    expenses: ExpenseRecord[];
  };
  previous: {
    from: string; to: string; total: number; expenseCount: number;
    categoryBreakdown: Array<{ name: string; amount: number; percentage: number }>;
  };
  change: number;
}

type ViewMode = 'overview' | 'revenue' | 'expenses' | 'transactions';

// ===================== HELPERS =====================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTransactionDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
  const dateLabel = isToday ? 'Today' : isYesterday ? 'Yesterday'
    : d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dateLabel}, ${time}`;
}

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash', pos: 'POS / Card', bank_transfer: 'Bank Transfer',
    opay: 'OPay', palmpay: 'PalmPay', moniepoint: 'Moniepoint',
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

function getMonthLabel(monthOffset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  if (monthOffset === 0) return 'This Month';
  if (monthOffset === -1) return 'Last Month';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function toLocalDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function statusColor(status: string): string {
  switch (status) {
    case 'paid': return 'bg-emerald-100 text-emerald-700';
    case 'partially_paid': return 'bg-amber-100 text-amber-700';
    case 'open': case 'pending': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'paid': return 'Paid';
    case 'partially_paid': return 'Partial';
    case 'open': case 'pending': return 'Outstanding';
    default: return status;
  }
}

// ===================== COMPONENT =====================

export function AccountsModule() {
  const [view, setView] = useState<ViewMode>('overview');
  const [overviewData, setOverviewData] = useState<AccountsData | null>(null);
  const [revenueDetail, setRevenueDetail] = useState<RevenueDetailData | null>(null);
  const [expenseDetail, setExpenseDetail] = useState<ExpenseDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('0');

  // Date range for detail views
  const [dateFrom, setDateFrom] = useState(toLocalDateISO(getMonthRange(0).from));
  const [dateTo, setDateTo] = useState(toLocalDateISO(getMonthRange(0).to));

  // --- Fetch overview ---
  const fetchOverview = useCallback(async (monthOffset: string) => {
    setIsLoading(true);
    try {
      const offset = parseInt(monthOffset, 10) || 0;
      const { from, to } = getMonthRange(offset);
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      const res = await fetch(`/api/accounts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setOverviewData(await res.json());
    } catch {
      toast.error('Failed to load accounts data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(selectedMonth); }, [selectedMonth, fetchOverview]);

  // --- Fetch revenue detail ---
  const fetchRevenueDetail = useCallback(async (from: string, to: string) => {
    setIsLoading(true);
    try {
      const fromD = new Date(from);
      const toD = new Date(to);
      toD.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({ view: 'revenue', from: fromD.toISOString(), to: toD.toISOString() });
      const res = await fetch(`/api/accounts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setRevenueDetail(await res.json());
    } catch {
      toast.error('Failed to load revenue details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Fetch expense detail ---
  const fetchExpenseDetail = useCallback(async (from: string, to: string) => {
    setIsLoading(true);
    try {
      const fromD = new Date(from);
      const toD = new Date(to);
      toD.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({ view: 'expenses', from: fromD.toISOString(), to: toD.toISOString() });
      const res = await fetch(`/api/accounts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setExpenseDetail(await res.json());
    } catch {
      toast.error('Failed to load expense details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Navigate to detail views ---
  const goToRevenueDetail = () => {
    const { from, to } = getMonthRange(parseInt(selectedMonth, 10) || 0);
    setDateFrom(toLocalDateISO(from));
    setDateTo(toLocalDateISO(to));
    setView('revenue');
  };

  const goToExpenseDetail = () => {
    const { from, to } = getMonthRange(parseInt(selectedMonth, 10) || 0);
    setDateFrom(toLocalDateISO(from));
    setDateTo(toLocalDateISO(to));
    setView('expenses');
  };

  // --- Effect: fetch detail data when entering detail view or changing dates ---
  useEffect(() => {
    if (view === 'revenue') fetchRevenueDetail(dateFrom, dateTo);
    if (view === 'expenses') fetchExpenseDetail(dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dateFrom, dateTo]);

  const goToOverview = () => setView('overview');

  // Month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(-i),
    label: getMonthLabel(-i),
  }));

  // ===================== LOADING =====================
  if (isLoading && !overviewData) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="ml-3 text-sm text-muted-foreground">Loading financial data...</span>
        </div>
      </div>
    );
  }

  if (!overviewData) return null;

  // ===================== OVERVIEW VIEW =====================
  if (view === 'overview') {
    const { grandTotalRevenue, grandTotalExpenses, grandTotalProfit, monthlyRevenue,
      outstandingBills, totalExpenses, netProfit, revenueByCategory,
      recentTransactions, paymentMethodsBreakdown, trends } = overviewData;

    const profitMargin = monthlyRevenue > 0 ? Math.round((netProfit / monthlyRevenue) * 100) : 0;
    const grandProfitMargin = grandTotalRevenue > 0 ? Math.round((grandTotalProfit / grandTotalRevenue) * 100) : 0;
    const incomeTx = recentTransactions.filter(t => t.type === 'income');
    const expenseTx = recentTransactions.filter(t => t.type === 'expense');

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
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ===== GRAND TOTAL HERO CARDS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Revenue Card */}
          <Card
            className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-lg hover:border-l-emerald-600 transition-all duration-200 group"
            onClick={goToRevenueDetail}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-100 p-2 group-hover:bg-emerald-200 transition-colors">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(grandTotalRevenue)}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">All-time earnings</p>
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  View details <Eye className="h-3 w-3" />
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card
            className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-lg hover:border-l-orange-600 transition-all duration-200 group"
            onClick={goToExpenseDetail}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-orange-100 p-2 group-hover:bg-orange-200 transition-colors">
                    <TrendingDown className="h-5 w-5 text-orange-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-600 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(grandTotalExpenses)}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">All-time spending</p>
                <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                  View details <Eye className="h-3 w-3" />
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Net Profit Card */}
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 p-2">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                </div>
              </div>
              <p className={`text-2xl font-bold ${grandTotalProfit >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {formatCurrency(grandTotalProfit)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">All-time profit</p>
                <Badge variant="secondary" className="text-[10px]">{grandProfitMargin}% margin</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== MONTHLY SUMMARY ===== */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            {getMonthLabel(parseInt(selectedMonth, 10) || 0)} Summary
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <div className="rounded-md bg-emerald-100 p-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /></div>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(monthlyRevenue)}</p>
                <p className={`text-xs flex items-center gap-1 mt-1 ${trends.revenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {trends.revenue >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {trends.revenue >= 0 ? '+' : ''}{trends.revenue}% vs prev month
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <div className="rounded-md bg-red-100 p-1.5"><DollarSign className="h-3.5 w-3.5 text-red-600" /></div>
                </div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(outstandingBills.total)}</p>
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <ArrowDownRight className="h-3 w-3" />
                  {outstandingBills.count} pending bill{outstandingBills.count !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <div className="rounded-md bg-orange-100 p-1.5"><TrendingDown className="h-3.5 w-3.5 text-orange-600" /></div>
                </div>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalExpenses === 0 ? 'No expenses recorded' : `${profitMargin}% of revenue`}
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <div className="rounded-md bg-amber-100 p-1.5"><CreditCard className="h-3.5 w-3.5 text-amber-600" /></div>
                </div>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </p>
                <p className={`text-xs flex items-center gap-1 mt-1 ${netProfit >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  {trends.profit >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {profitMargin}% margin
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ===== REVENUE BY CATEGORY + PAYMENT METHODS ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-500" />
                Revenue by Category
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {getMonthLabel(parseInt(selectedMonth, 10) || 0)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByCategory.every(c => c.amount === 0) ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Receipt className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No revenue data for this period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {revenueByCategory.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground/80">{item.name}</span>
                        <span className="font-medium text-foreground">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.percentage}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.percentage}%</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-500" />
                Payment Methods
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {getMonthLabel(parseInt(selectedMonth, 10) || 0)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentMethodsBreakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Wallet className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No payment data for this period</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentMethodsBreakdown.map(item => (
                    <div key={item.method} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="rounded-md bg-amber-100 p-2 shrink-0">
                        <CreditCard className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(item.total)}</p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{item.percentage}%</Badge>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== RECENT TRANSACTIONS (Side-by-side) ===== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Transactions</p>
            <Button variant="ghost" size="sm" onClick={() => setView('transactions')} className="text-xs text-muted-foreground">
              View all <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-t-4 border-t-emerald-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" /> Income
                  </CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    +{formatCurrency(incomeTx.reduce((s, t) => s + t.amount, 0))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {incomeTx.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No income transactions</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {incomeTx.slice(0, 8).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-sm font-medium truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTransactionDate(tx.date)} &bull; {formatPaymentMethod(tx.paymentMethod)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold whitespace-nowrap text-emerald-600">+{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-orange-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-orange-500" /> Expenses
                  </CardTitle>
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                    -{formatCurrency(expenseTx.reduce((s, t) => s + t.amount, 0))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {expenseTx.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No expense transactions</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {expenseTx.slice(0, 8).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50/50 border border-orange-100">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-sm font-medium truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTransactionDate(tx.date)} &bull; {formatPaymentMethod(tx.paymentMethod)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold whitespace-nowrap text-red-600">-{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ===================== REVENUE DETAIL VIEW =====================
  if (view === 'revenue' && revenueDetail) {
    const { grandTotal, current, previous, change } = revenueDetail;

    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goToOverview} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" /> Revenue Details
              </h2>
              <p className="text-sm text-muted-foreground">Individual bill records and category analysis</p>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Date Range</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const { from, to } = getMonthRange(parseInt(selectedMonth, 10) || 0);
                  setDateFrom(toLocalDateISO(from));
                  setDateTo(toLocalDateISO(to));
                }}
              >
                Reset to {getMonthLabel(parseInt(selectedMonth, 10) || 0)}
              </Button>
              <div className="ml-auto">
                <span className="text-sm text-muted-foreground">
                  {current.billCount} bill{current.billCount !== 1 ? 's' : ''} found
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">All-Time Revenue</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(grandTotal)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Selected Period</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(current.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(current.from)} — {formatDate(current.to)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Previous Period</p>
              <p className="text-xl font-bold text-gray-600 mt-1">{formatCurrency(previous.total)}</p>
              <p className={`text-xs flex items-center gap-1 mt-1 ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {change >= 0 ? '+' : ''}{change}% change
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Side-by-Side Category Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Selected Period Breakdown
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] ml-auto">
                  {formatCurrency(current.total)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {current.categoryBreakdown.every(c => c.amount === 0) ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data for this period</p>
              ) : (
                <div className="space-y-3">
                  {current.categoryBreakdown.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.percentage}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.percentage}%</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-gray-400">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                Previous Period Breakdown
                <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-[10px] ml-auto">
                  {formatCurrency(previous.total)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previous.categoryBreakdown.every(c => c.amount === 0) ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data for previous period</p>
              ) : (
                <div className="space-y-3">
                  {previous.categoryBreakdown.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.percentage}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.percentage}%</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bills Table */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              Individual Bills
              <Badge variant="secondary" className="text-[10px] ml-auto">{current.bills.length} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {current.bills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No bills found for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Guest</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Room</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Amount</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Paid</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Balance</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Method</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.bills.map(bill => (
                      <tr key={bill.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium truncate max-w-[150px]">{bill.guestName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-muted-foreground">{bill.roomNumber}</td>
                        <td className="py-2.5 text-right font-semibold">{formatCurrency(bill.totalAmount)}</td>
                        <td className="py-2.5 text-right text-emerald-600">{formatCurrency(bill.totalPaid)}</td>
                        <td className="py-2.5 text-right">
                          <span className={bill.balanceAmount > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                            {formatCurrency(bill.balanceAmount)}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColor(bill.status)}`}>
                            {statusLabel(bill.status)}
                          </span>
                        </td>
                        <td className="py-2.5 text-muted-foreground text-xs">
                          {bill.paymentMethods.length > 0 ? bill.paymentMethods.map(formatPaymentMethod).join(', ') : '-'}
                        </td>
                        <td className="py-2.5 text-muted-foreground text-xs whitespace-nowrap">{formatDate(bill.createdAt)}</td>
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

  // ===================== EXPENSE DETAIL VIEW =====================
  if (view === 'expenses' && expenseDetail) {
    const { grandTotal, current, previous, change } = expenseDetail;

    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goToOverview} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-500" /> Expense Details
              </h2>
              <p className="text-sm text-muted-foreground">Individual expense records and category analysis</p>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Date Range</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const { from, to } = getMonthRange(parseInt(selectedMonth, 10) || 0);
                  setDateFrom(toLocalDateISO(from));
                  setDateTo(toLocalDateISO(to));
                }}
              >
                Reset to {getMonthLabel(parseInt(selectedMonth, 10) || 0)}
              </Button>
              <div className="ml-auto">
                <span className="text-sm text-muted-foreground">
                  {current.expenseCount} expense{current.expenseCount !== 1 ? 's' : ''} found
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">All-Time Expenses</p>
              <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(grandTotal)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Selected Period</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(current.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(current.from)} — {formatDate(current.to)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Previous Period</p>
              <p className="text-xl font-bold text-gray-600 mt-1">{formatCurrency(previous.total)}</p>
              <p className={`text-xs flex items-center gap-1 mt-1 ${change <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {change <= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                {change >= 0 ? '+' : ''}{change}% change
                {change <= 0 ? ' (better)' : ' (worse)'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Side-by-Side Category Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-500" />
                Selected Period by Category
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] ml-auto">
                  {formatCurrency(current.total)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {current.categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data for this period</p>
              ) : (
                <div className="space-y-3">
                  {current.categoryBreakdown.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.percentage}% — {formatCurrency(item.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-gray-400">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-500" />
                Previous Period by Category
                <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-[10px] ml-auto">
                  {formatCurrency(previous.total)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previous.categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data for previous period</p>
              ) : (
                <div className="space-y-3">
                  {previous.categoryBreakdown.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gray-400 transition-all duration-500" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.percentage}% — {formatCurrency(item.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Expenses Table */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-orange-500" />
              Individual Expenses
              <Badge variant="secondary" className="text-[10px] ml-auto">{current.expenses.length} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {current.expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No expenses found for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Description</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Category</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Amount</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Vendor</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.expenses.map(exp => (
                      <tr key={exp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-3.5 w-3.5 text-orange-500" />
                            <span className="font-medium truncate max-w-[200px]">{exp.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{exp.category}</Badge>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-red-600">-{formatCurrency(exp.amount)}</td>
                        <td className="py-2.5 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {exp.vendor}
                          </div>
                        </td>
                        <td className="py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(exp.date)}</td>
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

  // ===================== TRANSACTIONS VIEW =====================
  if (view === 'transactions') {
    const incomeTx = overviewData.recentTransactions.filter(t => t.type === 'income');
    const expenseTx = overviewData.recentTransactions.filter(t => t.type === 'expense');

    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goToOverview} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Overview
          </Button>
          <h2 className="text-lg font-semibold text-foreground">All Transactions</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-t-4 border-t-emerald-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Income
                </CardTitle>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  +{formatCurrency(incomeTx.reduce((s, t) => s + t.amount, 0))}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {incomeTx.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No income transactions</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {incomeTx.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatTransactionDate(tx.date)} &bull; {formatPaymentMethod(tx.paymentMethod)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap text-emerald-600">+{formatCurrency(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-orange-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-500" /> Expenses
                </CardTitle>
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                  -{formatCurrency(expenseTx.reduce((s, t) => s + t.amount, 0))}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {expenseTx.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No expense transactions</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {expenseTx.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50/50 border border-orange-100">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatTransactionDate(tx.date)} &bull; {formatPaymentMethod(tx.paymentMethod)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap text-red-600">-{formatCurrency(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading for detail views
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goToOverview} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="ml-3 text-sm text-muted-foreground">Loading detail data...</span>
        </div>
      </div>
    );
  }

  return null;
}