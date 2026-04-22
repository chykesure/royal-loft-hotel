'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionTimeoutDialog } from '@/components/auth/SessionTimeoutDialog';
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
import { FrontDeskModule } from '@/components/skeletons/FrontDeskModule';
import { AccountsModule } from '@/components/skeletons/AccountsModule';
import { StaffPayrollModule } from '@/components/skeletons/StaffPayrollModule';
import { InventoryModule } from '@/components/skeletons/InventoryModule';
import { ReportsModule } from '@/components/skeletons/ReportsModule';
import { HotelRulesModule } from '@/components/skeletons/HotelRulesModule';
import { CloudStorageModule } from '@/components/skeletons/CloudStorageModule';
import { SettingsModule } from '@/components/skeletons/SettingsModule';
import { DeveloperToolModule } from '@/components/skeletons/DeveloperToolModule';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Map from ModuleKey (kebab-case used in app) to permission module string (snake_case used in RBAC)
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
  expenses: () => <div className="p-6 text-muted-foreground">Expenses module — manage via the Expenses page.</div>,
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
  const { isAuthenticated, isLoading, setUser, user, logout } = useAuthStore();
  const { currentModule, setCurrentModule } = useAppStore();
  const { isLoaded, canSee, init } = useRoleAccessStore();

  // Session timeout: auto-logout after 30 minutes of inactivity
  const handleTimeoutLogout = useCallback(() => {
    logout();
  }, [logout]);
  const { showWarning, countdownSeconds, stayLoggedIn } = useSessionTimeout(
    handleTimeoutLogout,
    isAuthenticated
  );

  useEffect(() => {
    const initApp = async () => {
      try {
        // Seed database
        console.log('[APP] Calling /api/seed ...');
        const seedRes = await fetch('/api/seed', { method: 'POST' });
        console.log('[APP] /api/seed response:', seedRes.status, await seedRes.json().catch(() => 'no body'));

        // Verify auth
        const res = await fetch('/api/auth/verify');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error('[APP] initApp error:', err);
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    };
    initApp();
  }, [setUser]);

  // Load RBAC config when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoaded) {
      init();
    }
  }, [isAuthenticated, isLoaded, init]);

  // Guard: redirect if current module is not accessible
  useEffect(() => {
    if (!isLoaded || !user) return;
    const role = user.role;
    const permModule = MODULE_PERM_MAP[currentModule];
    if (!canSee(role, permModule)) {
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

  // Wait for RBAC to load before rendering
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

  const CurrentModuleComponent = moduleComponents[currentModule] || DashboardModule;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto">
          <CurrentModuleComponent />
        </main>
      </SidebarInset>
      <ChatBubble />
      <Toaster richColors position="top-right" />
      <SessionTimeoutDialog
        open={showWarning}
        countdownSeconds={countdownSeconds}
        onStayLoggedIn={stayLoggedIn}
      />
    </SidebarProvider>
  );
}
