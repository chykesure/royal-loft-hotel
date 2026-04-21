import { create } from 'zustand';

export type ModuleKey =
  | 'dashboard'
  | 'front-desk'
  | 'reservations'
  | 'rooms'
  | 'guests'
  | 'billing'
  | 'invoices'
  | 'expenses'
  | 'accounts'
  | 'staff'
  | 'inventory'
  | 'reports'
  | 'rules'
  | 'security'
  | 'cloud'
  | 'settings'
  | 'developer-tools';

interface AppState {
  currentModule: ModuleKey;
  sidebarOpen: boolean;
  frontDeskTab: string;
  setCurrentModule: (module: ModuleKey) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setFrontDeskTab: (tab: string) => void;
  navigateToFrontDeskTab: (tab: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentModule: 'dashboard',
  sidebarOpen: true,
  frontDeskTab: 'walkin',
  setCurrentModule: (currentModule) => set({ currentModule }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setFrontDeskTab: (frontDeskTab) => set({ frontDeskTab }),
  navigateToFrontDeskTab: (tab) => set({ currentModule: 'front-desk', frontDeskTab: tab }),
}));