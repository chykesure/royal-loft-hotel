'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard,
  ArrowUpRight, ArrowDownRight, Wallet, Users, Receipt,
  CalendarDays, RefreshCw, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, Minus, Filter, Building2,
  UtensilsCrossed, Wine, Sparkles, Shirt, MoreHorizontal,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

/* ═══════════════════════════════════════════════════════════════ */
/*  TYPES                                                          */
/* ═══════════════════════════════════════════════════════════════ */

interface AccountsData {
  summary: {
    totalBilled: number;
    totalCollected: number;
    outstandingBills: number;
    totalExpenses: number;
    monthlyPayroll: number;
    pendingPayroll: number;
    processedPayroll: number;
    totalDiscounts: number;
    netProfit: number;
    profitMargin: number;
    totalTransactions: number;
  };
  revenueByCategory: { category: string; amount: number }[];
  expenseByCategory: { category: string; amount: number }[];
  paymentMethods: { method: string; amount: number }[];
  dailyRevenue: { date: string; billed: number; collected: number }[];
  transactions: Transaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  method: string | null;
  category: string;
  reference: string | null;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Room Charges': <Building2 className="h-3.5 w-3.5" />,
  'Food & Beverage': <UtensilsCrossed className="h-3.5 w-3.5" />,
  'Bar & Lounge': <Wine className="h-3.5 w-3.5" />,
  'Spa & Services': <Sparkles className="h-3.5 w-3.5" />,
  'Laundry': <Shirt className="h-3.5 w-3.5" />,
  'Other Services': <MoreHorizontal className="h-3.5 w-3.5" />,
};

const barColors = ['bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-violet-500', 'bg-pink-500', 'bg-orange-500'];

/* ═══════════════════════════════════════════════════════════════ */
/*  SKELETON                                                       */
/* ═══════════════════════════════════════════════════════════════ */

function AccountsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
              <Skeleton className="h-7 w-28 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm"><CardContent className="p-4"><div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div></CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="p-4"><div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div></CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="p-4"><div className="space-y-3">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div></CardContent></Card>
      </div>
      <Card className="border-none shadow-sm"><CardContent className="p-4"><div className="space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div></CardContent></Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  COMPONENT                                                      */
/* ═══════════════════════════════════════════════════════════════ */

export function AccountsModule() {
  const { user } = useAuthStore();
  const [data, setData] = useState<AccountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('month');
  const [txType, setTxType] = useState('all');
  const [page, setPage] = useState(1);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('range', range);
      params.set('type', txType);
      params.set('page', String(page));

      const res = await fetch(`/api/accounts?${params}`);
      if (res.status === 401) {
        toast.error('Session expired. Please log in again.');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      setData(await res.json());
    } catch {
      toast.error('Failed to load accounts data');
    } finally {
      setLoading(false);
    }
  }, [range, txType, page]);

  useEffect(() => { if (user) fetchAccounts(); }, [user, fetchAccounts]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [range, txType]);

  if (loading || !data) return <AccountsSkeleton />;

  const { summary, revenueByCategory, expenseByCategory, paymentMethods, dailyRevenue, transactions, pagination } = data;
  const totalCategoryRevenue = revenueByCategory.reduce((s, c) => s + c.amount, 0);
  const maxDailyBilled = Math.max(...dailyRevenue.map(d => d.billed), 1);

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">

      {/* ═══════════════ TOOLBAR ═══════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36">
              <CalendarDays className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={txType} onValueChange={setTxType}>
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="income">Income Only</SelectItem>
              <SelectItem value="expense">Expenses Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={fetchAccounts}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* ═══════════════ SUMMARY CARDS ═══════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Total Billed</p>
              <div className="rounded-md bg-amber-100 p-1.5"><Receipt className="h-3.5 w-3.5 text-amber-600" /></div>
            </div>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(summary.totalBilled)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">All bills in period</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Collected</p>
              <div className="rounded-md bg-emerald-100 p-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /></div>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.totalCollected)}</p>
            <p className="text-[11px] text-emerald-600 flex items-center gap-0.5 mt-0.5">
              <ArrowUpRight className="h-3 w-3" /> Revenue received
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Outstanding</p>
              <div className="rounded-md bg-red-100 p-1.5"><DollarSign className="h-3.5 w-3.5 text-red-600" /></div>
            </div>
            <p className="text-xl font-bold text-red-600">{formatCurrency(summary.outstandingBills)}</p>
            <p className="text-[11px] text-red-500 flex items-center gap-0.5 mt-0.5">
              <ArrowDownRight className="h-3 w-3" /> Unpaid balance
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Expenses</p>
              <div className="rounded-md bg-orange-100 p-1.5"><TrendingDown className="h-3.5 w-3.5 text-orange-600" /></div>
            </div>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(summary.totalExpenses)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Operational costs</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Payroll</p>
              <div className="rounded-md bg-violet-100 p-1.5"><Users className="h-3.5 w-3.5 text-violet-600" /></div>
            </div>
            <p className="text-xl font-bold text-violet-600">{formatCurrency(summary.monthlyPayroll)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {summary.pendingPayroll > 0 ? (
                <span className="text-amber-600">{formatCurrency(summary.pendingPayroll)} pending</span>
              ) : (
                'Staff wages (this month)'
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Net Profit</p>
              <div className={`rounded-md p-1.5 ${summary.netProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <CreditCard className={`h-3.5 w-3.5 ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
            </div>
            <p className={`text-xl font-bold ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(summary.netProfit)}
            </p>
            <p className={`text-[11px] flex items-center gap-0.5 mt-0.5 ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {summary.netProfit >= 0 ? (
                <><ArrowUp className="h-3 w-3" /> {summary.profitMargin}% margin</>
              ) : (
                <><ArrowDown className="h-3 w-3" /> Loss this period</>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ DISCOUNTS BANNER ═══════════════ */}
      {summary.totalDiscounts > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-semibold text-sm">Total Discounts Given:</span>
            <span className="text-amber-700 font-bold">{formatCurrency(summary.totalDiscounts)}</span>
          </div>
          <span className="text-[11px] text-amber-500">Deducted from billed revenue</span>
        </div>
      )}

      {/* ═══════════════ BREAKDOWNS ROW ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue by Category */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByCategory.length > 0 ? (
              <div className="space-y-3">
                {revenueByCategory.map((item, idx) => {
                  const pct = totalCategoryRevenue > 0 ? Math.round((item.amount / totalCategoryRevenue) * 100) : 0;
                  return (
                    <div key={item.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1.5">
                          {categoryIcons[item.category] || <MoreHorizontal className="h-3.5 w-3.5" />}
                          {item.category}
                        </span>
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(item.amount)}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${barColors[idx % barColors.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No revenue data in this period</p>
            )}
          </CardContent>
        </Card>

        {/* Expense by Category */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-orange-500" /> Expense Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length > 0 ? (
              <div className="space-y-3">
                {expenseByCategory.map((item, idx) => {
                  const pct = summary.totalExpenses > 0 ? Math.round((item.amount / summary.totalExpenses) * 100) : 0;
                  return (
                    <div key={item.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.category}</span>
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(item.amount)}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No expense data in this period</p>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods & Cash Flow */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-sky-500" /> Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length > 0 ? (
              <>
                <div className="space-y-2 mb-4">
                  {paymentMethods.map((m) => {
                    const total = paymentMethods.reduce((s, x) => s + x.amount, 0);
                    const pct = total > 0 ? Math.round((m.amount / total) * 100) : 0;
                    return (
                      <div key={m.method} className="flex items-center justify-between text-sm">
                        <span>{m.method}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">{formatCurrency(m.amount)}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{pct}%</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Separator className="my-3" />
                {/* Cash flow summary */}
                <div className="space-y-1.5 text-sm">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cash Flow</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Money In</span>
                    <span className="text-emerald-600 font-semibold">+{formatCurrency(summary.totalCollected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Money Out</span>
                    <span className="text-red-600 font-semibold">-{formatCurrency(summary.totalExpenses + summary.processedPayroll)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Net Flow</span>
                    <span className={summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {summary.netProfit >= 0 ? '+' : ''}{formatCurrency(summary.netProfit)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No payment data in this period</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ DAILY REVENUE TREND ═══════════════ */}
      {dailyRevenue.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Daily Revenue Trend (Last {dailyRevenue.length} Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {dailyRevenue.map((day) => {
                const height = Math.max(4, (day.billed / maxDailyBilled) * 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="relative w-full flex flex-col items-center" style={{ height: '100px' }}>
                      {/* Billed bar */}
                      <div className="w-full flex-1 flex flex-col justify-end">
                        <div className="rounded-t bg-amber-400/80 transition-all duration-300 group-hover:bg-amber-500 min-h-[2px]" style={{ height: `${height}%` }} />
                      </div>
                    </div>
                    {/* Label */}
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                      {new Date(day.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-popover border rounded-lg px-2 py-1.5 shadow-md text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <p className="font-semibold">{formatDate(day.date)}</p>
                      <p className="text-amber-600">Billed: {formatCurrency(day.billed)}</p>
                      <p className="text-emerald-600">Collected: {formatCurrency(day.collected)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-3 h-2 rounded bg-amber-400/80" /> Billed
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ TRANSACTION LEDGER ═══════════════ */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-amber-500" />
              Transaction Ledger
              <Badge variant="secondary" className="text-[10px] ml-1">{pagination.total} transactions</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <>
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                      <div className={`rounded-full p-1.5 shrink-0 ${tx.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span>{formatDateTime(tx.date)}</span>
                          {tx.method && (
                            <>
                              <span>&bull;</span>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 font-normal">
                                {tx.method}
                              </Badge>
                            </>
                          )}
                          {tx.reference && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono">{tx.reference}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="sm" variant="outline" className="h-7 w-7 p-0"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="outline" className="h-7 w-7 p-0"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No transactions found</p>
              <p className="text-xs opacity-60 mt-1">Try changing the date range or filter</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}