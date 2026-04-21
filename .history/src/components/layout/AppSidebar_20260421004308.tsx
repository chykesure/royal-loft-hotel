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
  DollarSign,
  Code,
} from 'lucide-react';
import { useAppStore, type ModuleKey } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { useRoleAccessStore } from '@/store/role-access-store';
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
import { useEffect } from 'react';
import { FileText,  Wallet } from 'lucide-react';

const menuItems: Array<{ key: ModuleKey; label: string; icon: React.ElementType; permModule: string }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permModule: 'dashboard' },
  { key: 'front-desk', label: 'Front Desk', icon: ConciergeBell, permModule: 'front_desk' },
  { key: 'reservations', label: 'Reservations', icon: CalendarDays, permModule: 'reservations' },
  { key: 'rooms', label: 'Rooms', icon: BedDouble, permModule: 'rooms' },
  { key: 'guests', label: 'Guests', icon: Users, permModule: 'guests' },
  { key: 'billing', label: 'Billing', icon: Receipt, permModule: 'billing' },
  { key: 'expenses', label: 'Expenses', icon: DollarSign, permModule: 'expenses' },
  { key: 'accounts', label: 'Accounts', icon: Landmark, permModule: 'accounts' },
  { key: 'staff', label: 'Staff & Payroll', icon: UserCog, permModule: 'staff' },
  { key: 'inventory', label: 'Inventory', icon: Package, permModule: 'inventory' },
  { key: 'reports', label: 'Reports', icon: BarChart3, permModule: 'reports' },
  { key: 'rules', label: 'Hotel Rules', icon: ScrollText, permModule: 'rules' },
  { key: 'security', label: 'Security', icon: ShieldCheck, permModule: 'security' },
  { key: 'cloud', label: 'Cloud Storage', icon: Cloud, permModule: 'cloud' },
  { key: 'settings', label: 'Settings', icon: Settings, permModule: 'settings' },
  { key: 'developer-tools', label: 'Developer Tools', icon: Code, permModule: 'developer_tools' },
    { key: 'billing', label: 'Billing', icon: Receipt, permModule: 'billing' },
  { key: 'invoices', label: 'Invoices', icon: FileText, permModule: 'invoices' },
  { key: 'expenses', label: 'Expenses', icon: Wallet, permModule: 'expenses' },
];

export function AppSidebar() {
  const { currentModule, setCurrentModule } = useAppStore();
  const { user, logout } = useAuthStore();
  const { canSee, isLoaded, init } = useRoleAccessStore();

  useEffect(() => {
    if (!isLoaded) init();
  }, [isLoaded, init]);

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

  // Filter using ONLY canSee() — no hardcoded fallbacks
  const visibleItems = menuItems.filter((item) => {
    const role = user?.role;
    if (!role) return false;
    if (!isLoaded) return false;
    return canSee(role, item.permModule);
  });

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
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={currentModule === item.key}
                    tooltip={item.label}
                    onClick={() => setCurrentModule(item.key)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {visibleItems.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No modules available for your role
                </div>
              )}
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