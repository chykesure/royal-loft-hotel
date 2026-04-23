import { create } from 'zustand';

// ── All possible module keys ──
export const ALL_MODULE_KEYS = [
  'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
  'billing', 'invoices', 'expenses', 'accounts', 'staff', 'inventory',
  'reports', 'rules', 'security', 'cloud', 'settings', 'developer_tools',
] as const;

export type ModuleKey = (typeof ALL_MODULE_KEYS)[number];

// ── Roles that can be configured (developer and super_admin always see everything) ──
export const CONFIGURABLE_ROLES = ['manager', 'front_desk', 'accountant', 'auditor', 'housekeeping', 'staff'] as const;
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

// ── Default module access per role ──
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

// ── Visible modules that configurable roles can toggle (exclude dev-only ones) ──
export const VISIBLE_MODULE_KEYS: ModuleKey[] = ALL_MODULE_KEYS.filter(
  (m) => m !== 'developer_tools'
);

interface RoleAccessState {
  // role -> modules[]
  accessMap: Record<string, ModuleKey[]>;
  isLoaded: boolean;
  isSaving: boolean;

  // Actions
  init: () => Promise<void>;
  canSee: (role: string, module: string) => boolean;
  getModulesForRole: (role: string) => ModuleKey[];
  saveToServer: (role?: string, modules?: string[]) => Promise<boolean>;
  toggleModule: (role: string, module: string) => void;
  grantAll: (role: string) => void;
  revokeAll: (role: string) => void;
  resetToDefaults: () => void;
}

export const useRoleAccessStore = create<RoleAccessState>((set, get) => ({
  accessMap: { ...DEFAULT_ACCESS },
  isLoaded: false,
  isSaving: false,

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

  // Save a single role, or ALL roles if called with no arguments
  saveToServer: async (role?: string, modules?: string[]) => {
    // ── No args: save ALL configurable roles ──
    if (!role || !modules) {
      set({ isSaving: true });
      try {
        const state = get();
        let allOk = true;
        for (const r of CONFIGURABLE_ROLES) {
          const mods = state.accessMap[r] || [];
          try {
            const res = await fetch('/api/role-access', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: r, modules: mods }),
            });
            if (!res.ok) {
              console.error(`Failed to save role access for ${r}`);
              allOk = false;
            }
          } catch (err) {
            console.error(`Error saving role access for ${r}:`, err);
            allOk = false;
          }
        }
        return allOk;
      } finally {
        set({ isSaving: false });
      }
    }

    // ── Single role save ──
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

  grantAll: (role: string) => {
    // Grant all visible modules except developer-only ones
    const allVisible = ALL_MODULE_KEYS.filter(
      (m) => m !== 'developer_tools'
    );
    set((state) => ({
      accessMap: {
        ...state.accessMap,
        [role]: [...allVisible],
      },
    }));
  },

  revokeAll: (role: string) => {
    // Revoke all except dashboard (always visible)
    set((state) => ({
      accessMap: {
        ...state.accessMap,
        [role]: ['dashboard' as ModuleKey],
      },
    }));
  },

  resetToDefaults: () => {
    set({ accessMap: { ...DEFAULT_ACCESS } });
  },
}));