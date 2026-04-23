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
export const ALL_MODULE_KEYS = [
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

// Modules that can NEVER be toggled by configurable roles
const BLOCKED_MODULES: ModuleKey[] = ['developer_tools'];

// Modules available for configuration (excludes developer-only modules)
export const VISIBLE_MODULE_KEYS: ModuleKey[] = ALL_MODULE_KEYS.filter(
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
  getModulesForRole: (role: string) => ModuleKey[];
  toggleModule: (role: ConfigurableRole, module: ModuleKey) => void;
  grantAll: (role: ConfigurableRole) => void;
  revokeAll: (role: ConfigurableRole) => void;
  resetToDefaults: () => void;
  saveToServer: (role?: ConfigurableRole, modules?: string[]) => Promise<boolean>;
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
        // ── FIX: handle flat { role: string[] } response OR nested { accessMap: { role: string[] } } ──
        const data = await res.json();
        const serverMap: Record<string, string[]> = data.accessMap || data;

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
      return module !== 'developer_tools';
    }

    if (CONFIGURABLE_ROLES.includes(role as ConfigurableRole)) {
      const map = get().accessMap;
      return map[role as ConfigurableRole]?.has(module as ModuleKey) || false;
    }

    return false;
  },

  // ── Get modules for a role (returns array) ──
  getModulesForRole: (role: string): ModuleKey[] => {
    if (role === 'developer') return [...ALL_MODULE_KEYS];
    if (role === 'super_admin') return ALL_MODULE_KEYS.filter(m => m !== 'developer_tools');
    if (CONFIGURABLE_ROLES.includes(role as ConfigurableRole)) {
      return Array.from(get().accessMap[role as ConfigurableRole]);
    }
    return [];
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
    map[role] = toSet(VISIBLE_MODULE_KEYS);
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

  // ── Persist to server ──
  // FIX: now sends { role, modules } per role — matches API validation
  saveToServer: async (role?: ConfigurableRole, modules?: string[]): Promise<boolean> => {
    const state = get();
    if (state.isSaving) return false;

    // ── Called with no args: save ALL configurable roles ──
    if (!role || !modules) {
      set({ isSaving: true });
      try {
        let allOk = true;
        for (const r of CONFIGURABLE_ROLES) {
          const mods = Array.from(state.accessMap[r]);
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
        if (allOk) {
          toast.success('Module access saved successfully');
        } else {
          toast.error('Some roles failed to save');
        }
        return allOk;
      } finally {
        set({ isSaving: false });
      }
    }

    // ── Single role save ──
    set({ isSaving: true });
    try {
      const res = await fetch('/api/role-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, modules }),
      });

      if (res.ok) {
        // Update local state for this role
        set((s) => ({
          accessMap: {
            ...s.accessMap,
            [role]: toSet(modules as ModuleKey[]),
          },
          isSaving: false,
        }));
        toast.success(`Access updated for ${role}`);
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
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