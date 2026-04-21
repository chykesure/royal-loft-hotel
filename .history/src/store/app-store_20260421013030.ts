import { create } from 'zustand';

export type ModuleKey =
  | 'dashboard'
  | 'front-desk'
  | 'reservations'
  | 'rooms'
  | 'guests'
  | 'billing'
  
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
  setCurrentModule: (module: ModuleKey) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentModule: 'dashboard',
  sidebarOpen: true,
  setCurrentModule: (currentModule) => set({ currentModule }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
