'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/app-store';

const moduleTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  'front-desk': 'Front Desk',
  reservations: 'Reservations',
  rooms: 'Rooms',
  guests: 'Guests',
  billing: 'Billing',
  accounts: 'Accounts',
  staff: 'Staff & Payroll',
  inventory: 'Inventory',
  reports: 'Reports',
  rules: 'Hotel Rules',
  security: 'Security',
  cloud: 'Cloud Storage',
  settings: 'Settings',
};

const moduleDescriptions: Record<string, string> = {
  dashboard: 'Overview of hotel operations and key metrics',
  'front-desk': 'Guest check-in, check-out, and walk-in registration',
  reservations: 'Manage room reservations and bookings',
  rooms: 'Room management, floor plans, and housekeeping',
  guests: 'Guest profiles, preferences, and stay history',
  billing: 'Guest bills, invoices, and payment processing',
  accounts: 'Financial summaries and transaction records',
  staff: 'Staff management, attendance, and payroll',
  inventory: 'Stock levels, supplies, and procurement',
  reports: 'Analytics, reports, and business insights',
  rules: 'Hotel policies and regulations',
  security: 'User management, audit logs, and security',
  cloud: 'File storage and document management',
  settings: 'Hotel configuration and system preferences',
};

export function Header() {
  const { currentModule } = useAppStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex flex-col">
        <h1 className="text-base font-semibold">{moduleTitles[currentModule] || 'Dashboard'}</h1>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {moduleDescriptions[currentModule] || ''}
        </p>
      </div>
    </header>
  );
}
