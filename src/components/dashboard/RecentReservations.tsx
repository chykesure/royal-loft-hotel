'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/auth';

interface RecentReservation {
  id: string;
  confirmationCode: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  roomRate: number;
  guest: { firstName: string; lastName: string; phone: string };
  room: { roomNumber: string; roomType: { name: string } };
}

interface RecentReservationsProps {
  reservations: RecentReservation[];
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  checked_in: 'bg-sky-100 text-sky-700',
  checked_out: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export function RecentReservations({ reservations, isLoading }: RecentReservationsProps) {
  if (isLoading) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Reservations</CardTitle>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No reservations found</p>
        ) : (
          <div className="space-y-3">
            {reservations.map((res) => (
              <div
                key={res.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {res.guest.firstName} {res.guest.lastName}
                    </p>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${statusColors[res.status] || ''}`}>
                      {statusLabels[res.status] || res.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Room {res.room.roomNumber} ({res.room.roomType.name}) • {res.confirmationCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(res.checkIn)} → {formatDate(res.checkOut)} • {formatCurrency(res.totalAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
