import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatar?: string | null;
  role: string;
  department?: string | null;
}

export type Permissions = Record<string, Record<string, boolean>>;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: Permissions;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setPermissions: (permissions: Permissions) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  permissions: {},
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
  setPermissions: (permissions) => set({ permissions }),
  logout: () => {
    set({ user: null, isAuthenticated: false, permissions: {} });
    document.cookie = 'auth_token=; path=/; max-age=0';
  },
}));