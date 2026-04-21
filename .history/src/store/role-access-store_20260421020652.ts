import { create } from 'zustand';
import { useAuthStore } from './auth-store';

// All possible module keys
const ALL_MODULE_KEYS = [
  'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
  'billing', 'invoices', 'expenses', 'accounts', 'staff', 'inventory',
  'reports', 'rules', 'security', 'cloud', 'settings', 'developer_tools',
] as const;

type ModuleKey = (typeof ALL_MODULE_KEYS)[number];

// Roles that can be configured (developer and super_admin always see everything)
const CONFIGURABLE_ROLES = ['manager', 'front_desk', 'accountant', 'auditor', 'housekeeping', 'staff'] as const;
type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

// Default module access per role
const DEFAULT_ACCESS: Record<ConfigurableRole, ModuleKey[]> = {
  manager: [
    'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
    'billing', 'invoices', 'expenses', 'accounts', 'staff', 'inventory', 'reports',
    'rules', 'security', 'cloud',
  ],
  front_desk: [
    'dashboard', 'front_desk', 'reservations', 'rooms', 'guests', 'billing', 'invoices',
  ],
  accountant: [
    'dashboard', 'billing', 'invoices', 'accounts', 'expenses', 'reports', 'cloud',
  ],
  auditor: [
    'dashboard', 'billing', 'invoices', 'accounts', 'expenses', 'reports',
  ],
  housekeeping: [
    'dashboard', 'rooms', 'inventory',
  ],
  staff: [
    'dashboard',
  ],
};

interface RoleAccessState {
  // role -> modules[]
  accessMap: Record<string, ModuleKey[]>;
  isLoaded: boolean;

  // Actions
  init: () => Promise<void>;
  canSee: (role: string, module: string) => boolean;
  getModulesForRole: (role: string) => ModuleKey[];
  saveToServer: (role: string, modules: string[]) => Promise<boolean>;
  toggleModule: (role: string, module: string) => void;
}

export const useRoleAccessStore = create<RoleAccessState>((set, get) => ({
  accessMap: { ...DEFAULT_ACCESS },
  isLoaded: false,

  init: async () => {
    try {
      const res = await fetch('/api/role-access');
      if (res.ok) {
        const data: Record<string, string[]> = await res.json();

        // Merge server data with defaults
        const merged: Record<string, ModuleKey[]> = {};
        for (const [role, modules] of Object.entries(DEFAULT_ACCESS)) {
          merged[role] = [...modules];
        }
        for (const [role, modules] of Object.entries(data)) {
          if (CONFIGURABLE_ROLES.includes(role as ConfigurableRole)) {
            merged[role] = modules as ModuleKey[];
          }
        }

        set({ accessMap: merged, isLoaded: true });
      } else {
        // Use defaults if server fails
        set({ accessMap: { ...DEFAULT_ACCESS }, isLoaded: true });
      }
    } catch {
      set({ accessMap: { ...DEFAULT_ACCESS }, isLoaded: true });
    }
  },

  canSee: (role: string, module: string) => {
    // developer and super_admin see everything
    if (role === 'developer') return true;
    if (role === 'super_admin') {
      // super_admin sees everything EXCEPT developer_tools
      if (module === 'developer_tools') return false;
      return true;
    }

    const state = get();
    const allowed = state.accessMap[role];
    if (!allowed) return false;
    return allowed.includes(module as ModuleKey);
  },

  getModulesForRole: (role: string) => {
    if (role === 'developer') return [...ALL_MODULE_KEYS];
    if (role === 'super_admin') return ALL_MODULE_KEYS.filter(m => m !== 'developer_tools');
    const state = get();
    return state.accessMap[role] || [];
  },

  saveToServer: async (role: string, modules: string[]) => {
    try {
      const res = await fetch('/api/role-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, modules }),
      });
      if (res.ok) {
        // Update local state
        set((state) => ({
          accessMap: {
            ...state.accessMap,
            [role]: modules as ModuleKey[],
          },
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  toggleModule: (role: string, module: string) => {
    set((state) => {
      const current = state.accessMap[role] || [];
      const exists = current.includes(module as ModuleKey);
      const updated = exists
        ? current.filter((m) => m !== module)
        : [...current, module as ModuleKey];

      return {
        accessMap: {
          ...state.accessMap,
          [role]: updated,
        },
      };
    });
  },
}));