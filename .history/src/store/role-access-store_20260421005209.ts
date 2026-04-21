import { create } from 'zustand';
import { toast } from 'sonner';

// ── Types ──

export type ConfigurableRole =
  | 'manager'
  | 'front_desk'
  | 'accountant'
  | 'auditor'
  | 'housekeeping'
  | 'staff';

export type ModuleKey =
  | 'dashboard'
  | 'front_desk'
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
  | 'developer_tools';

// All configurable roles (NOT developer or super_admin — they have fixed access)
export const CONFIGURABLE_ROLES: ConfigurableRole[] = [
  'manager',
  'front_desk',
  'accountant',
  'auditor',
  'housekeeping',
  'staff',
];

// All module keys
const ALL_MODULE_KEYS = [
  'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
  'billing', 'invoices', 'expenses', 'accounts', 'staff', 'inventory',
  'reports', 'rules', 'security', 'cloud', 'settings', 'developer_tools',
] as const;

// Default module access per role (hardcoded fallback if DB has nothing)
const DEFAULT_ACCESS: Record<ConfigurableRole, ModuleKey[]> = {
  manager: [
    'dashboard', 'front_desk', 'reservations', 'rooms', 'guests',
    'billing', 'invoices', 'expenses', 'accounts', 'staff', 'inventory', 'reports',
    'rules', 'security',
  ],
  front_desk: [
    'dashboard', 'front_desk', 'reservations', 'rooms', 'guests', 'billing', 'invoices',
  ],
  accountant: [
    'dashboard', 'billing', 'invoices', 'accounts', 'expenses', 'reports',
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

// Modules that can NEVER be given to non-developer roles
const BLOCKED_MODULES: ModuleKey[] = ['security', 'cloud', 'developer_tools'];

// Modules available for configuration (excludes developer-only modules)
const CONFIGURABLE_MODULES: ModuleKey[] = ALL_MODULE_KEYS.filter(
  (m) => !BLOCKED_MODULES.includes(m)
);

// ── Store Interface ──

interface RoleAccessState {
  // The access map: role → Set of module keys
  accessMap: Record<ConfigurableRole, Set<ModuleKey>>;
  // Default access (for reset)
  defaultAccess: Record<ConfigurableRole, ModuleKey[]>;
  // Loading state
  isLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  init: () => Promise<void>;
  canSee: (role: string, module: string) => boolean;
  toggleModule: (role: ConfigurableRole, module: ModuleKey) => void;
  grantAll: (role: ConfigurableRole) => void;
  revokeAll: (role: ConfigurableRole) => void;
  resetToDefaults: () => void;
  saveToServer: () => Promise<boolean>;
}

function toSet(modules: ModuleKey[]): Set<ModuleKey> {
  return new Set(modules);
}

function cloneMap(map: Record<ConfigurableRole, Set<ModuleKey>>): Record<ConfigurableRole, Set<ModuleKey>> {
  const clone: Record<string, Set<ModuleKey>> = {};
  for (const key of Object.keys(map) as ConfigurableRole[]) {
    clone[key] = new Set(map[key]);
  }
  return clone as Record<ConfigurableRole, Set<ModuleKey>>;
}

// ── Create the store ──

export const useRoleAccessStore = create<RoleAccessState>((set, get) => ({
  accessMap: Object.fromEntries(
    CONFIGURABLE_ROLES.map((role) => [role, toSet(DEFAULT_ACCESS[role])])
  ) as Record<ConfigurableRole, Set<ModuleKey>>,

  defaultAccess: { ...DEFAULT_ACCESS },

  isLoaded: false,
  isLoading: false,
  isSaving: false,

  // ── Initialize: load from server ──
  init: async () => {
    const state = get();
    if (state.isLoaded || state.isLoading) return;

    set({ isLoading: true });

    try {
      const res = await fetch('/api/role-access');
      if (res.ok) {
        const data = await res.json();
        const serverMap = data.accessMap as Record<string, string[]>;

        const newMap: Record<string, Set<ModuleKey>> = {};
        for (const role of CONFIGURABLE_ROLES) {
          const modules = serverMap[role] || DEFAULT_ACCESS[role];
          newMap[role] = toSet(modules as ModuleKey[]);
        }

        set({
          accessMap: newMap as Record<ConfigurableRole, Set<ModuleKey>>,
          defaultAccess: (data.defaultAccess || DEFAULT_ACCESS) as Record<ConfigurableRole, ModuleKey[]>,
          isLoaded: true,
          isLoading: false,
        });
      } else {
        console.warn('Failed to load role access, using defaults');
        set({
          accessMap: Object.fromEntries(
            CONFIGURABLE_ROLES.map((role) => [role, toSet(DEFAULT_ACCESS[role])])
          ) as Record<ConfigurableRole, Set<ModuleKey>>,
          isLoaded: true,
          isLoading: false,
        });
      }
    } catch {
      console.warn('Network error loading role access, using defaults');
      set({
        accessMap: Object.fromEntries(
          CONFIGURABLE_ROLES.map((role) => [role, toSet(DEFAULT_ACCESS[role])])
        ) as Record<ConfigurableRole, Set<ModuleKey>>,
        isLoaded: true,
        isLoading: false,
      });
    }
  },

  // ── Check if a role can see a module ──
  canSee: (role: string, module: string): boolean => {
    if (role === 'developer') return true;

    if (role === 'super_admin') {
      return module !== 'cloud' && module !== 'developer_tools';
    }

    if (CONFIGURABLE_ROLES.includes(role as ConfigurableRole)) {
      const map = get().accessMap;
      return map[role as ConfigurableRole]?.has(module as ModuleKey) || false;
    }

    return false;
  },

  // ── Toggle a module for a role (UI only until saved) ──
  toggleModule: (role: ConfigurableRole, module: ModuleKey) => {
    if (module === 'dashboard') return;
    if (BLOCKED_MODULES.includes(module)) return;

    const map = cloneMap(get().accessMap);
    const current = map[role];
    if (current.has(module)) {
      current.delete(module);
    } else {
      current.add(module);
    }
    set({ accessMap: map });
  },

  // ── Grant all configurable modules to a role ──
  grantAll: (role: ConfigurableRole) => {
    const map = cloneMap(get().accessMap);
    map[role] = toSet(CONFIGURABLE_MODULES);
    set({ accessMap: map });
  },

  // ── Revoke all modules except dashboard ──
  revokeAll: (role: ConfigurableRole) => {
    const map = cloneMap(get().accessMap);
    map[role] = toSet(['dashboard']);
    set({ accessMap: map });
  },

  // ── Reset to defaults (UI only until saved) ──
  resetToDefaults: () => {
    const defaults = get().defaultAccess;
    const map: Record<string, Set<ModuleKey>> = {};
    for (const role of CONFIGURABLE_ROLES) {
      map[role] = toSet(defaults[role]);
    }
    set({
      accessMap: map as Record<ConfigurableRole, Set<ModuleKey>>,
    });
  },

  // ── Persist current accessMap to server ──
  saveToServer: async (): Promise<boolean> => {
    const state = get();
    if (state.isSaving) return false;

    set({ isSaving: true });

    try {
      const serializable: Record<string, string[]> = {};
      for (const role of CONFIGURABLE_ROLES) {
        serializable[role] = Array.from(state.accessMap[role]);
      }

      const res = await fetch('/api/role-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessMap: serializable }),
      });

      if (res.ok) {
        toast.success('Module access saved successfully');
        set({ isSaving: false });
        return true;
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save module access');
        set({ isSaving: false });
        return false;
      }
    } catch {
      toast.error('Network error — could not save module access');
      set({ isSaving: false });
      return false;
    }
  },
}));