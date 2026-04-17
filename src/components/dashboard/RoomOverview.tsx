'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface RoomOverviewProps {
  status: {
    available: number;
    occupied: number;
    housekeeping: number;
    maintenance: number;
    reserved: number;
  } | null;
  isLoading: boolean;
}

const statusItems = [
  { key: 'available', label: 'Available', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
  { key: 'occupied', label: 'Occupied', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  { key: 'housekeeping', label: 'Housekeeping', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  { key: 'maintenance', label: 'Maintenance', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  { key: 'reserved', label: 'Reserved', color: 'bg-sky-500', textColor: 'text-sky-700', bgLight: 'bg-sky-50' },
];

export function RoomOverview({ status, isLoading }: RoomOverviewProps) {
  const total = status ? Object.values(status).reduce((a, b) => a + b, 0) : 0;

  if (isLoading) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Room Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[140px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Room Status Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-4">
          {statusItems.map((item) => {
            const pct = total > 0 && status ? (status[item.key as keyof typeof status] / total) * 100 : 0;
            return pct > 0 ? (
              <div
                key={item.key}
                className={`${item.color}`}
                style={{ width: `${pct}%` }}
                title={`${item.label}: ${status?.[item.key as keyof typeof status]}`}
              />
            ) : null;
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {statusItems.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-sm font-semibold ${item.textColor}`}>
                  {status?.[item.key as keyof typeof status] ?? 0}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
