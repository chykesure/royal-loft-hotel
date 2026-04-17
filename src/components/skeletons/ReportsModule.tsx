'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import {
  Download, CalendarIcon, FileBarChart, BookOpen, BedDouble, PieChartIcon, RefreshCw, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#d97706', '#059669', '#dc2626', '#7c3aed', '#2563eb', '#db2777', '#06b6d4'];

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ===== DAILY SALES REPORT =====
interface DailySalesRow {
  date: string;
  roomCharges: number;
  foodCharges: number;
  barCharges: number;
  spaCharges: number;
  laundryCharges: number;
  otherCharges: number;
  totalAmount: number;
  payments: number;
}

function DailySalesReport({ from, to }: { from: Date; to: Date }) {
  const [data, setData] = useState<DailySalesRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fromStr = format(from, 'yyyy-MM-dd');
      const toStr = format(to, 'yyyy-MM-dd');
      const res = await fetch(`/api/reports?type=daily-sales&from=${fromStr}&to=${toStr}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Failed to load daily sales data');
      }
    } catch {
      toast.error('Failed to load daily sales data');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totals = data.reduce(
    (acc, row) => {
      acc.roomCharges += row.roomCharges;
      acc.foodCharges += row.foodCharges;
      acc.barCharges += row.barCharges;
      acc.spaCharges += row.spaCharges;
      acc.laundryCharges += row.laundryCharges;
      acc.otherCharges += row.otherCharges;
      acc.totalAmount += row.totalAmount;
      acc.payments += row.payments;
      return acc;
    },
    { roomCharges: 0, foodCharges: 0, barCharges: 0, spaCharges: 0, laundryCharges: 0, otherCharges: 0, totalAmount: 0, payments: 0 },
  );

  if (isLoading) {
    return <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;
  }

  const chartData = data.map((row) => ({
    date: format(parseISO(row.date), 'MMM dd'),
    'Room Revenue': Math.round(row.roomCharges),
    'Food & Beverage': Math.round(row.foodCharges),
    'Bar': Math.round(row.barCharges),
    'Spa': Math.round(row.spaCharges),
    Total: Math.round(row.totalAmount),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Room Revenue" fill="#d97706" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Food & Beverage" fill="#059669" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Bar" fill="#dc2626" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Spa" fill="#7c3aed" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="max-h-[500px] overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-amber-50/50 hover:bg-amber-50/50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold text-right">Room</TableHead>
              <TableHead className="font-semibold text-right">F&B</TableHead>
              <TableHead className="font-semibold text-right">Bar</TableHead>
              <TableHead className="font-semibold text-right">Spa</TableHead>
              <TableHead className="font-semibold text-right">Laundry</TableHead>
              <TableHead className="font-semibold text-right">Other</TableHead>
              <TableHead className="font-semibold text-right">Total</TableHead>
              <TableHead className="font-semibold text-right">Payments</TableHead>
              <TableHead className="font-semibold text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No data for the selected period</TableCell></TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="font-medium">{format(parseISO(row.date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.roomCharges)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.foodCharges)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.barCharges)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.spaCharges)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.laundryCharges)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.otherCharges)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(row.totalAmount)}</TableCell>
                  <TableCell className="text-right text-emerald-600">{formatCurrency(row.payments)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(row.totalAmount - row.payments)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow className="bg-amber-50/80 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.roomCharges)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.foodCharges)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.barCharges)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.spaCharges)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.laundryCharges)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.otherCharges)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.totalAmount)}</TableCell>
                <TableCell className="text-right text-emerald-700">{formatCurrency(totals.payments)}</TableCell>
                <TableCell className="text-right text-red-700">{formatCurrency(totals.totalAmount - totals.payments)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}

// ===== JOURNAL REPORT =====
interface JournalEntry {
  date: string;
  dateFormatted: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  balance: number;
}

function JournalReport({ from, to }: { from: Date; to: Date }) {
  const [data, setData] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fromStr = format(from, 'yyyy-MM-dd');
      const toStr = format(to, 'yyyy-MM-dd');
      const res = await fetch(`/api/reports?type=journal&from=${fromStr}&to=${toStr}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Failed to load journal data');
      }
    } catch {
      toast.error('Failed to load journal data');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;
  }

  const totalDebit = data.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = data.reduce((sum, e) => sum + e.credit, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Debits</p>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(totalDebit)}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Credits</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalCredit)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net Balance</p>
            <p className={`text-lg font-bold ${totalDebit - totalCredit >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(Math.abs(totalDebit - totalCredit))}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {totalDebit - totalCredit >= 0 ? 'owed' : 'surplus'}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="max-h-[500px] overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-amber-50/50 hover:bg-amber-50/50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Account</TableHead>
              <TableHead className="font-semibold text-right">Debit</TableHead>
              <TableHead className="font-semibold text-right">Credit</TableHead>
              <TableHead className="font-semibold text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No journal entries for the selected period</TableCell></TableRow>
            ) : (
              data.map((entry, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium whitespace-nowrap">{entry.dateFormatted}</TableCell>
                  <TableCell className="max-w-[250px] truncate text-xs">{entry.description}</TableCell>
                  <TableCell className="whitespace-nowrap">{entry.account}</TableCell>
                  <TableCell className="text-right text-red-600">{entry.debit > 0 ? formatCurrency(entry.debit) : '—'}</TableCell>
                  <TableCell className="text-right text-emerald-600">{entry.credit > 0 ? formatCurrency(entry.credit) : '—'}</TableCell>
                  <TableCell className={`text-right font-medium ${entry.balance > 0 ? 'text-red-600' : entry.balance < 0 ? 'text-emerald-600' : ''}`}>
                    {formatCurrency(Math.abs(entry.balance))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow className="bg-amber-50/80 font-bold">
                <TableCell colSpan={3}>TOTALS</TableCell>
                <TableCell className="text-right text-red-700">{formatCurrency(totalDebit)}</TableCell>
                <TableCell className="text-right text-emerald-700">{formatCurrency(totalCredit)}</TableCell>
                <TableCell className="text-right">{formatCurrency(Math.abs(totalDebit - totalCredit))}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}

// ===== OCCUPANCY REPORT =====
interface OccupancyRow {
  date: string;
  dateFormatted: string;
  totalRooms: number;
  available: number;
  occupied: number;
  occupancyRate: number;
  revenue: number;
  revPAR: number;
}

function OccupancyReport({ from, to }: { from: Date; to: Date }) {
  const [data, setData] = useState<OccupancyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fromStr = format(from, 'yyyy-MM-dd');
      const toStr = format(to, 'yyyy-MM-dd');
      const res = await fetch(`/api/reports?type=occupancy&from=${fromStr}&to=${toStr}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Failed to load occupancy data');
      }
    } catch {
      toast.error('Failed to load occupancy data');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;
  }

  const avgOccupancy = data.length > 0 ? Math.round(data.reduce((s, r) => s + r.occupancyRate, 0) / data.length) : 0;
  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const avgRevPAR = data.length > 0 ? Math.round(data.reduce((s, r) => s + r.revPAR, 0) / data.length) : 0;

  const chartData = data.map((row) => ({
    date: format(parseISO(row.date), 'MMM dd'),
    'Occupancy %': row.occupancyRate,
    Revenue: Math.round(row.revenue / 1000),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg. Occupancy</p>
            <p className="text-lg font-bold text-amber-700">{avgOccupancy}%</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg. RevPAR</p>
            <p className="text-lg font-bold text-violet-700">{formatCurrency(avgRevPAR)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Rooms</p>
            <p className="text-lg font-bold">{data[0]?.totalRooms ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Occupancy Trend & Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" fontSize={11} tickLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                <YAxis yAxisId="right" orientation="right" fontSize={11} tickLine={false} tickFormatter={(v: number) => `₦${v}k`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Occupancy %') return [`${value}%`, name];
                    return [formatCurrency(value * 1000), name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="Occupancy %" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="Revenue" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="max-h-[400px] overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-amber-50/50 hover:bg-amber-50/50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold text-center">Total Rooms</TableHead>
              <TableHead className="font-semibold text-center">Available</TableHead>
              <TableHead className="font-semibold text-center">Occupied</TableHead>
              <TableHead className="font-semibold text-center">Occupancy Rate</TableHead>
              <TableHead className="font-semibold text-right">Revenue</TableHead>
              <TableHead className="font-semibold text-right">RevPAR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No occupancy data for the selected period</TableCell></TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="font-medium">{row.dateFormatted}</TableCell>
                  <TableCell className="text-center">{row.totalRooms}</TableCell>
                  <TableCell className="text-center text-emerald-600">{row.available}</TableCell>
                  <TableCell className="text-center text-amber-700">{row.occupied}</TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${row.occupancyRate >= 80 ? 'bg-emerald-100 text-emerald-700' : row.occupancyRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {row.occupancyRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.revPAR)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ===== REVENUE BY SOURCE =====
interface RevenueSourceRow {
  source: string;
  sourceKey: string;
  bookings: number;
  revenue: number;
  averageRate: number;
}

function RevenueBySourceReport({ from, to }: { from: Date; to: Date }) {
  const [data, setData] = useState<RevenueSourceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fromStr = format(from, 'yyyy-MM-dd');
      const toStr = format(to, 'yyyy-MM-dd');
      const res = await fetch(`/api/reports?type=revenue-source&from=${fromStr}&to=${toStr}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error('Failed to load revenue source data');
      }
    } catch {
      toast.error('Failed to load revenue source data');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;
  }

  const totalBookings = data.reduce((s, r) => s + r.bookings, 0);
  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);

  const pieData = data.map((row) => ({
    name: row.source,
    value: Math.round(row.revenue),
    bookings: row.bookings,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Bookings</p>
            <p className="text-lg font-bold text-amber-700">{totalBookings.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg. Rate</p>
            <p className="text-lg font-bold text-violet-700">
              {totalBookings > 0 ? formatCurrency(data.reduce((s, r) => s + r.averageRate * r.bookings, 0) / totalBookings) : '₦0'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {pieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bookings by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {pieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pieData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" fontSize={11} tickLine={false} />
                    <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="bookings" fill="#d97706" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-amber-50/50 hover:bg-amber-50/50">
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="font-semibold text-center">Bookings</TableHead>
              <TableHead className="font-semibold text-right">Total Revenue</TableHead>
              <TableHead className="font-semibold text-right">Avg. Rate</TableHead>
              <TableHead className="font-semibold text-right">Revenue %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No revenue data for the selected period</TableCell></TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.sourceKey}>
                  <TableCell className="font-medium">{row.source}</TableCell>
                  <TableCell className="text-center">{row.bookings}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.averageRate)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs">{totalRevenue > 0 ? ((row.revenue / totalRevenue) * 100).toFixed(1) : 0}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow className="bg-amber-50/80 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-center">{totalBookings}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                <TableCell className="text-right">
                  {totalBookings > 0 ? formatCurrency(data.reduce((s, r) => s + r.averageRate * r.bookings, 0) / totalBookings) : '₦0'}
                </TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}

// ===== MAIN REPORTS MODULE =====
export function ReportsModule() {
  const [from, setFrom] = useState<Date>(startOfMonth(new Date()));
  const [to, setTo] = useState<Date>(endOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState('daily-sales');

  const handleExport = () => {
    toast.success('Report export initiated. The file will download shortly.');
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header & Date Range */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-amber-600" />
            Reports & Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Generate and view detailed reports across all hotel operations.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="grid grid-cols-2 gap-3 flex-1 w-full sm:w-auto">
            <div className="grid gap-1.5">
              <Label className="text-xs">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left text-sm h-9 font-normal">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(from, 'MMM dd, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={from}
                    onSelect={(date) => { if (date) setFrom(date); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left text-sm h-9 font-normal">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(to, 'MMM dd, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={to}
                    onSelect={(date) => { if (date) setTo(date); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button size="sm" variant="outline" className="bg-amber-50 text-amber-700 border-amber-200" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="daily-sales" className="gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 hidden sm:block" />
            Daily Sales
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="h-4 w-4 hidden sm:block" />
            Journal
          </TabsTrigger>
          <TabsTrigger value="occupancy" className="gap-1.5 text-xs sm:text-sm">
            <BedDouble className="h-4 w-4 hidden sm:block" />
            Occupancy
          </TabsTrigger>
          <TabsTrigger value="revenue-source" className="gap-1.5 text-xs sm:text-sm">
            <PieChartIcon className="h-4 w-4 hidden sm:block" />
            Revenue Source
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily-sales" className="mt-4">
          <DailySalesReport from={from} to={to} />
        </TabsContent>

        <TabsContent value="journal" className="mt-4">
          <JournalReport from={from} to={to} />
        </TabsContent>

        <TabsContent value="occupancy" className="mt-4">
          <OccupancyReport from={from} to={to} />
        </TabsContent>

        <TabsContent value="revenue-source" className="mt-4">
          <RevenueBySourceReport from={from} to={to} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
