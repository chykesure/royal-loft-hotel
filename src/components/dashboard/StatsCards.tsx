'use client';

import { BedDouble, Users, DollarSign, CalendarCheck, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  totalRooms: number;
  occupancyRate: number;
  todayRevenue: number;
  todayRevenueFormatted: string;
  activeReservations: number;
  checkInsToday: number;
  checkOutsToday: number;
}

interface StatsCardsProps {
  stats: Stats | null;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Rooms',
      value: stats?.totalRooms ?? 0,
      icon: BedDouble,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
    },
    {
      title: "Today's Occupancy",
      value: stats ? `${stats.occupancyRate}%` : '0%',
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
    },
    {
      title: "Today's Revenue",
      value: stats?.todayRevenueFormatted ?? '₦0',
      icon: DollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
    },
    {
      title: 'Active Reservations',
      value: stats?.activeReservations ?? 0,
      icon: CalendarCheck,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      iconBg: 'bg-violet-100',
    },
    {
      title: 'Check-ins Today',
      value: stats?.checkInsToday ?? 0,
      icon: ArrowDownToLine,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      iconBg: 'bg-teal-100',
    },
    {
      title: 'Check-outs Today',
      value: stats?.checkOutsToday ?? 0,
      icon: ArrowUpFromLine,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
              <div className={`rounded-md p-1.5 ${card.iconBg}`}>
                <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
              </div>
            </div>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
