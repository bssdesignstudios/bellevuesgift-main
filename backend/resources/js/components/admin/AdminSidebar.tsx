import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link, usePage } from '@inertiajs/react';
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  Warehouse,
  ShoppingCart,
  Users,
  UserCog,
  Tag,
  BarChart3,
  LogOut,
  Store,
  Wrench,
  Gift,
  Building2,
  Clock,
  Wallet,
  RefreshCw,
  Monitor,
  LogIn,
  Menu,
  X,
  BookOpen,
  Settings,
  UserCircle,
  FileText,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import bellevueLogo from '@/assets/bellevue-logo.webp';

const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'finance'], moduleKey: 'dashboard' },
  { label: 'Products', href: '/admin/products', icon: Package, roles: ['admin', 'warehouse', 'warehouse_manager'], moduleKey: 'products' },
  { label: 'Categories', href: '/admin/categories', icon: FolderOpen, roles: ['admin', 'warehouse', 'warehouse_manager'], moduleKey: 'categories' },
  { label: 'Inventory', href: '/admin/inventory', icon: Warehouse, roles: ['admin', 'warehouse', 'warehouse_manager', 'finance'], moduleKey: 'inventory' },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart, roles: ['admin', 'finance'], moduleKey: 'orders' },
  { label: 'Quotes', href: '/admin/quotes', icon: FileText, roles: ['admin', 'finance'], moduleKey: 'quotes' },
  { label: 'Invoices', href: '/admin/invoices', icon: Receipt, roles: ['admin', 'finance'], moduleKey: 'invoices' },
  { label: 'Statements', href: '/admin/statements', icon: FileText, roles: ['admin', 'finance'], moduleKey: 'statements' },
  { label: 'Repair Tickets', href: '/admin/repairs', icon: Wrench, roles: ['admin', 'finance'], moduleKey: 'repairs' },
  { label: 'Gift Cards', href: '/admin/gift-cards', icon: Gift, roles: ['admin', 'finance'], moduleKey: 'gift_cards' },
  { label: 'Customers', href: '/admin/customers', icon: Users, roles: ['admin', 'finance'], moduleKey: 'customers' },
  { label: 'Vendors', href: '/admin/vendors', icon: Building2, roles: ['admin', 'finance'], moduleKey: 'vendors' },
  { label: 'Staff', href: '/admin/staff', icon: UserCog, roles: ['admin'], moduleKey: 'staff' },
  { label: 'Registers', href: '/admin/registers', icon: Monitor, roles: ['admin'], moduleKey: 'registers' },
  { label: 'Discounts', href: '/admin/discounts', icon: Tag, roles: ['admin', 'finance'], moduleKey: 'discounts' },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, roles: ['admin', 'finance'], moduleKey: 'reports' },
  { label: 'Timesheets', href: '/admin/timesheets', icon: Clock, roles: ['admin', 'finance'], moduleKey: 'timesheets' },
  { label: 'Expenses', href: '/admin/expenses', icon: Wallet, roles: ['admin', 'finance'], moduleKey: 'expenses' },
  { label: 'Payroll', href: '/admin/payroll', icon: Wallet, roles: ['admin', 'finance'], moduleKey: 'payroll' },
  { label: 'Recurring Bills', href: '/admin/recurring-invoices', icon: RefreshCw, roles: ['admin', 'finance'] },
  { label: 'Email Logs', href: '/admin/email-logs', icon: LogIn, roles: ['admin'] },
  { label: 'Help / SOP', href: '/admin/sop', icon: BookOpen, roles: ['admin', 'finance', 'warehouse', 'warehouse_manager'], moduleKey: 'help' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, roles: ['admin'] }, // no moduleKey — always visible
];

function SidebarContent({ filteredNav, currentStaff, url, impersonating, impersonate, signOut, onNavClick }: {
  filteredNav: typeof ADMIN_NAV;
  currentStaff: any;
  url: string;
  impersonating: boolean;
  impersonate: (id: string | null) => void;
  signOut: () => void;
  onNavClick?: () => void;
}) {
  return (
    <>
      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <img
            src={bellevueLogo}
            alt="Bellevue"
            className="h-8 brightness-0 invert"
          />
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = url === item.href ||
            (item.href !== '/admin' && url.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        {impersonating && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => impersonate(null)}
          >
            Stop Impersonating
          </Button>
        )}

        <Link href="/pos" className="block w-full">
          <Button variant="ghost" size="sm" className="w-full text-white border border-white/20 hover:bg-white/10 hover:text-white">
            <Store className="h-4 w-4 mr-2" />
            Open POS
          </Button>
        </Link>

        <Link href="/staff/profile" className="block w-full">
          <Button variant="ghost" size="sm" className="w-full text-white/70 hover:bg-white/10 hover:text-white">
            <UserCircle className="h-4 w-4 mr-2" />
            My Profile
          </Button>
        </Link>

        <div className="flex items-center justify-between text-sm text-white/70">
          <div className="min-w-0">
            <div className="font-medium text-white line-clamp-1">
              {currentStaff?.name ? String(currentStaff.name) : 'Unknown User'}
            </div>
            <div className="capitalize text-xs text-white/50">
              {currentStaff?.role ? String(currentStaff.role).replace(/_/g, ' ') : 'No Role'}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10 shrink-0"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const { url, props } = usePage();
  const { effectiveStaff, signOut, impersonating, impersonate } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch module settings to hide disabled modules from sidebar
  const { data: moduleSettings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/settings');
      return data as { key: string; value: string }[];
    },
    staleTime: 60_000, // cache for 1 minute
  });

  const moduleMap: Record<string, string> = {};
  for (const s of moduleSettings) moduleMap[s.key] = s.value;

  const isModuleEnabled = (key?: string): boolean => {
    if (!key) return true; // no moduleKey means always visible (e.g. Settings)
    const val = moduleMap[`module_${key}`];
    if (val === undefined) return true; // default on
    return val === '1' || val === 'true';
  };

  const pageStaff = (props as any)?.auth?.staff;
  const currentStaff = effectiveStaff ?? (pageStaff ? { ...pageStaff, id: String(pageStaff.id), is_active: true, created_at: '' } : null);

  const filteredNav = ADMIN_NAV.filter(item => {
    // Check module toggle
    if (!isModuleEnabled((item as any).moduleKey)) return false;
    // Check role
    if (!item.roles) return true;
    const rawRole = currentStaff?.role;
    if (!rawRole) return false;
    const userRoleStr = String(rawRole).toLowerCase().replace(/\s+/g, '_');
    return item.roles.includes(userRoleStr as any);
  });

  const sharedProps = {
    filteredNav,
    currentStaff,
    url,
    impersonating: !!impersonating,
    impersonate,
    signOut,
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-brand-navy text-white flex items-center justify-between px-4 h-14 shadow-lg">
        <Link href="/" className="flex items-center gap-2">
          <img src={bellevueLogo} alt="Bellevue" className="h-7 brightness-0 invert" />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md hover:bg-white/10 transition-colors"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 w-72 h-full bg-brand-navy text-white flex flex-col shadow-xl transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent {...sharedProps} onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-brand-navy text-white flex-col min-h-screen shadow-xl shrink-0">
        <SidebarContent {...sharedProps} />
      </aside>
    </>
  );
}
