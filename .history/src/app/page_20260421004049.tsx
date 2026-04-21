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
import { SecurityModule } from '@/components/security/SecurityModule';
import { FrontDeskModule } from '@/components/skeletons/FrontDeskModule';
import { AccountsModule } from '@/components/skeletons/AccountsModule';
import { StaffPayrollModule } from '@/components/skeletons/StaffPayrollModule';
import { InventoryModule } from '@/components/skeletons/InventoryModule';
import { ReportsModule } from '@/components/skeletons/ReportsModule';
import { HotelRulesModule } from '@/components/skeletons/HotelRulesModule';
import { CloudStorageModule } from '@/components/skeletons/CloudStorageModule';
import { SettingsModule } from '@/components/skeletons/SettingsModule';
import { ExpensesModule } from '@/components/skeletons/ExpensesModule';
import { DeveloperToolsModule } from '@/components/developer/DeveloperToolsModule';
import { InvoicesModule } from '@/components/billing/InvoicesModule';
import { Toaster } from '@/components/ui/sonner';

const moduleComponents: Record<ModuleKey, React.ComponentType> = {
  dashboard: DashboardModule,
  'front-desk': FrontDeskModule,
  reservations: ReservationsModule,
  rooms: RoomsModule,
  guests: GuestsModule,
  billing: BillingModule,
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
  expenses: ExpensesModule,
  'developer-tools': DeveloperToolsModule,
};

const MODULE_PERM_MAP: Record<ModuleKey, string> = {
  dashboard: 'dashboard',
  'front-desk': 'front_desk',
  reservations: 'reservations',
  rooms: 'rooms',
  guests: 'guests',
  billing: 'billing',
  accounts: 'accounts',
  staff: 'staff',
  inventory: 'inventory',
  reports: 'reports',
  rules: 'rules',
  security: 'security',
  cloud: 'cloud',
  settings: 'settings',
  expenses: 'expenses',
  'developer-tools': 'developer_tools',
  billing: 'billing',
  invoices: 'invoices',
  expenses: 'expenses',
};

export default function Home() {
  const { isAuthenticated, isLoading, setUser, setPermissions, user } = useAuthStore();
  const { currentModule, setCurrentModule } = useAppStore();
  const { canSee, isLoaded, init } = useRoleAccessStore();

  useEffect(() => {
    const initAuthAndAccess = async () => {
      try {
        const res = await fetch('/api/auth/verify');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            if (data.permissions) {
              setPermissions(data.permissions);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    };
    initAuthAndAccess();
  }, [setUser, setPermissions]);

  useEffect(() => {
    if (!isLoaded) init();
  }, [isLoaded, init]);

  // Guard: redirect to dashboard if current module is not allowed
  useEffect(() => {
    if (!user || !isLoaded) return;
    const role = user.role;
    const permModule = MODULE_PERM_MAP[currentModule];
    if (canSee(role, permModule)) return;
    setCurrentModule('dashboard');
  }, [user, isLoaded, currentModule, setCurrentModule, canSee]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg shadow-amber-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
              <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" />
              <path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16" />
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
    </SidebarProvider>
  );
}