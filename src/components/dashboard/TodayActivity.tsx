'use client';

import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityItem {
  id: string;
  guest: { firstName: string; lastName: string; phone: string };
  room: { roomNumber: string };
  checkIn?: string;
  checkOut?: string;
  status: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

interface TodayActivityProps {
  arrivals: ActivityItem[];
  departures: ActivityItem[];
  isLoading: boolean;
}

export function TodayActivity({ arrivals, departures, isLoading }: TodayActivityProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&apos;s Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&apos;s Departures</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-teal-600" />
            <CardTitle className="text-base">Today&apos;s Arrivals</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {arrivals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No arrivals today</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {arrivals.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-teal-50/50">
                  <div>
                    <p className="text-sm font-medium">
                      {a.guest.firstName} {a.guest.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Room {a.room.roomNumber} • {a.guest.phone}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {a.checkIn ? formatTime(a.checkIn) : '--:--'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4 text-orange-600" />
            <CardTitle className="text-base">Today&apos;s Departures</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {departures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No departures today</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {departures.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50/50">
                  <div>
                    <p className="text-sm font-medium">
                      {d.guest.firstName} {d.guest.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Room {d.room.roomNumber} • {d.guest.phone}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {d.checkOut ? formatTime(d.checkOut) : '--:--'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


