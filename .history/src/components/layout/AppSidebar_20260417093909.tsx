'use client';

import {
  LayoutDashboard,
  ConciergeBell,
  CalendarDays,
  BedDouble,
  Users,
  Receipt,
  Landmark,
  UserCog,
  Package,
  BarChart3,
  ScrollText,
  ShieldCheck,
  Cloud,
  Settings,
  LogOut,
  Hotel,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppStore, type ModuleKey } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MenuItem {
  key: ModuleKey;
  label: string;
  icon: React.ElementType;
}

const allMenuItems: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'front-desk', label: 'Front Desk', icon: ConciergeBell },
  { key: 'reservations', label: 'Reservations', icon: CalendarDays },
  { key: 'rooms', label: 'Rooms', icon: BedDouble },
  { key: 'guests', label: 'Guests', icon: Users },
  { key: 'billing', label: 'Billing', icon: Receipt },
  { key: 'accounts', label: 'Accounts', icon: Landmark },
  { key: 'staff', label: 'Staff & Payroll', icon: UserCog },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'rules', label: 'Hotel Rules', icon: ScrollText },
  { key: 'security', label: 'Security', icon: ShieldCheck },
  { key: 'cloud', label: 'Cloud Storage', icon: Cloud },
  { key: 'settings', label: 'Settings', icon: Settings },
];

// Role-based module access
const roleAccess: Record<string, ModuleKey[]> = {
  super_admin: [
    'dashboard', 'front-desk', 'reservations', 'rooms', 'guests',
    'billing', 'accounts', 'staff', 'inventory', 'reports',
    'rules', 'security', 'cloud', 'settings',
  ],
  developer: [
    'dashboard', 'front-desk', 'reservations', 'rooms', 'guests',
    'billing', 'accounts', 'staff', 'inventory', 'reports',
    'rules', 'security', 'cloud', 'settings',
  ],
  manager: [
    'dashboard', 'front-desk', 'reservations', 'rooms', 'guests',
    'billing', 'accounts', 'inventory', 'reports', 'rules',
  ],
  front_desk: [
    'dashboard', 'front-desk', 'reservations', 'rooms', 'guests', 'billing',
  ],
  housekeeping: [
    'dashboard', 'rooms', 'inventory',
  ],
  accountant: [
    'dashboard', 'billing', 'accounts', 'reports',
  ],
  auditor: [
    'dashboard', 'billing', 'accounts', 'reports', 'guests',
  ],
  staff: [
    'dashboard',
  ],
};

export function AppSidebar() {
  const { currentModule, setCurrentModule } = useAppStore();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
    } catch {
      // ignore
    }
    logout();
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const roleLabel = user?.role?.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Staff';

  // Filter menu items based on user role
  const allowedModules = roleAccess[user?.role || 'staff'] || roleAccess.staff;
  const visibleMenuItems = allMenuItems.filter((item) => allowedModules.includes(item.key));

  // If current module is not in allowed list, redirect to dashboard
  const effectiveModule = allowedModules.includes(currentModule) ? currentModule : 'dashboard';

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
            <Hotel className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-sidebar-foreground tracking-tight">Royal Loft</h2>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Hotel Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="custom-scrollbar">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={effectiveModule === item.key}
                    tooltip={item.label}
                    onClick={() => setCurrentModule(item.key)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="p-3">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8 border border-amber-500/30">
              <AvatarFallback className="bg-amber-500/20 text-amber-300 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || 'User'}</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-300 border-amber-500/30">
                {roleLabel}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-500/10 h-8"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}