'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore, type ModuleKey } from '@/store/app-store';
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
import { ExpensesModule } from '@/components/expenses/ExpensesModule';
import { FrontDeskModule } from '@/components/frontdesk/FrontDeskModule';
import { AccountsModule } from '@/components/accounts/AccountsModule';
import { StaffPayrollModule } from '@/components/staff/StaffPayrollModule';
import { InventoryModule } from '@/components/inventory/InventoryModule';
import { ReportsModule } from '@/components/reports/ReportsModule';
import { HotelRulesModule } from '@/components/rules/HotelRulesModule';
import { CloudStorageModule } from '@/components/cloud/CloudStorageModule';
import { SettingsModule } from '@/components/settings/SettingsModule';
import { DeveloperToolsModule } from '@/components/developer/DeveloperToolsModule';
import { Toaster } from '@/components/ui/sonner';

const moduleComponents: Record<ModuleKey, React.ComponentType> = {
  dashboard: DashboardModule,
  'front-desk': FrontDeskModule,
  reservations: ReservationsModule,
  rooms: RoomsModule,
  guests: GuestsModule,
  billing: BillingModule,
  expenses: ExpensesModule,
  accounts: AccountsModule,
  staff: StaffPayrollModule,
  inventory: InventoryModule,
  reports: ReportsModule,
  rules: HotelRulesModule,
  security: SecurityModule,
  cloud: CloudStorageModule,
  settings: SettingsModule,
  'developer-tools': DeveloperToolsModule,
};

export default function Home() {
  const { isAuthenticated, isLoading, setUser, user } = useAuthStore();
  const { currentModule } = useAppStore();

  useEffect(() => {
    const init = async () => {
      try {
        // Seed database
        await fetch('/api/seed', { method: 'POST' });

        // Verify auth
        const res = await fetch('/api/auth/verify');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        }
      } catch {
        // ignore
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    };
    init();
  }, [setUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg shadow-amber-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
              <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
              <path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"/>
              <path d="M8 7h.01"/>
              <path d="M16 7h.01"/>
              <path d="M12 7h.01"/>
              <path d="M12 11h.01"/>
              <path d="M16 11h.01"/>
              <path d="M8 11h.01"/>
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

  const developerModules: ModuleKey[] = ['developer-tools', 'cloud'];
  const isDeveloperUser = user?.role === 'developer' || user?.role === 'super_admin';
  
  // Block non-developers from accessing developer-only modules
  if (!isDeveloperUser && developerModules.includes(currentModule)) {
    const { setCurrentModule } = useAppStore.getState();
    setCurrentModule('dashboard');
    return null;
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
