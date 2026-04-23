'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore, type ModuleKey } from '@/store/app-store';
import { useRoleAccessStore } from '@/store/role-access-store';
import { LoginForm } from '@/components/auth/LoginForm';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Header } from '@/components/layout/Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ChatBubble } from '@/components/chatbot/ChatBubble';
import { DashboardModule } from '@/components/dashboard/DashboardModule';
import { RoomsModule } from '@/components/rooms/RoomsModule';
import { ReservationsModule } from '@/components/reservations/ReservationsModule';
import { GuestsModule } from '@/components/guests/GuestsModule';
import { BillingModule } from '@/components/billing/BillingModule';
import { InvoicesModule } from '@/components/billing/InvoicesModule';
import { SecurityModule } from '@/components/security/SecurityModule';
import { ExpensesModule } from '@/components/expenses/ExpensesModule';
import { FrontDeskModule } from '@/components/skeletons/FrontDeskModule';
import { AccountsModule } from '@/components/skeletons/AccountsModule';
import { AccountsModule } from '@/components/accounts/AccountsModule';
import { StaffPayrollModule } from '@/components/skeletons/StaffPayrollModule';
import { InventoryModule } from '@/components/skeletons/InventoryModule';
import { ReportsModule } from '@/components/skeletons/ReportsModule';
import { HotelRulesModule } from '@/components/skeletons/HotelRulesModule';
import { CloudStorageModule } from '@/components/skeletons/CloudStorageModule';
import { SettingsModule } from '@/components/skeletons/SettingsModule';
import { DeveloperToolModule } from '@/components/skeletons/DeveloperToolModule';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';

const MODULE_PERM_MAP: Record<ModuleKey, string> = {
  dashboard: 'dashboard',
  'front-desk': 'front_desk',
  reservations: 'reservations',
  rooms: 'rooms',
  guests: 'guests',
  billing: 'billing',
  invoices: 'invoices',
  expenses: 'expenses',
  accounts: 'accounts',
  staff: 'staff',
  inventory: 'inventory',
  reports: 'reports',
  rules: 'rules',
  security: 'security',
  cloud: 'cloud',
  settings: 'settings',
  'developer-tools': 'developer_tools',
};

const moduleComponents: Record<ModuleKey, React.ComponentType> = {
  dashboard: DashboardModule,
  'front-desk': FrontDeskModule,
  reservations: ReservationsModule,
  rooms: RoomsModule,
  guests: GuestsModule,
  billing: BillingModule,
  invoices: InvoicesModule,
  expenses: ExpensesModule,
  accounts: AccountsModule,
  staff: StaffPayrollModule,
  inventory: InventoryModule,
  reports: ReportsModule,
  rules: HotelRulesModule,
  security: SecurityModule,
  cloud: CloudStorageModule,
  settings: SettingsModule,
  'developer-tools': DeveloperToolModule,
};

export default function Home() {
  const { isAuthenticated, isLoading, setUser, user } = useAuthStore();
  const { currentModule, setCurrentModule } = useAppStore();
  const { isLoaded, canSee, init } = useRoleAccessStore();

  // Build list of visible modules based on role
  const visibleModules = user && isLoaded
    ? (Object.keys(moduleComponents) as ModuleKey[]).filter(
        (key) => canSee(user.role, MODULE_PERM_MAP[key])
      )
    : [];

  useEffect(() => {
    const initApp = async () => {
      try {
        const seeded = typeof window !== 'undefined' ? localStorage.getItem('rl_seeded') : null;
        const promises: Promise<void>[] = [];

        const authPromise = fetch('/api/auth/verify').then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
              setUser(data.user);
            }
          }
        });
        promises.push(authPromise);

        if (!seeded) {
          const seedPromise = fetch('/api/seed', { method: 'POST' }).then((seedRes) => {
            if (seedRes.ok && typeof window !== 'undefined') {
              localStorage.setItem('rl_seeded', '1');
            }
          }).catch(() => {});
          promises.push(seedPromise);
        }

        const rbacPromise = init().catch(() => {});
        promises.push(rbacPromise);

        await authPromise;
      } catch (err) {
        console.error('[APP] initApp error:', err);
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    };
    initApp();
  }, [setUser, init]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const permModule = MODULE_PERM_MAP[currentModule];
    if (!canSee(user.role, permModule)) {
      setCurrentModule('dashboard');
    }
  }, [isLoaded, user, currentModule, canSee, setCurrentModule]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg shadow-amber-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
              <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
              <path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"/>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading Royal Loft...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginForm />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="text-center">
          <Skeleton className="h-8 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto relative z-0">
          {/* Only render modules the user's role can see.
              This prevents hidden modules from firing API calls
              and showing error toasts. */}
          {visibleModules.map((key) => {
            const Component = moduleComponents[key];
            return (
              <div
                key={key}
                style={{ display: key === currentModule ? 'block' : 'none' }}
              >
                <Component />
              </div>
            );
          })}
        </main>
      </SidebarInset>
      <ChatBubble />
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}