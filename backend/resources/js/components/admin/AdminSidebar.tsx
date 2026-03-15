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
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import bellevueLogo from '@/assets/bellevue-logo.webp';

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'finance'] },
  { label: 'Products', href: '/admin/products', icon: Package, roles: ['admin', 'warehouse', 'warehouse_manager'] },
  { label: 'Categories', href: '/admin/categories', icon: FolderOpen, roles: ['admin', 'warehouse', 'warehouse_manager'] },
  { label: 'Inventory', href: '/admin/inventory', icon: Warehouse, roles: ['admin', 'warehouse', 'warehouse_manager', 'finance'] },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart, roles: ['admin', 'finance'] },
  { label: 'Repair Tickets', href: '/admin/repairs', icon: Wrench, roles: ['admin', 'finance'] },
  { label: 'Gift Cards', href: '/admin/gift-cards', icon: Gift, roles: ['admin', 'finance'] },
  { label: 'Customers', href: '/admin/customers', icon: Users, roles: ['admin', 'finance'] },
  { label: 'Vendors', href: '/admin/vendors', icon: Building2, roles: ['admin', 'finance'] },
  { label: 'Staff', href: '/admin/staff', icon: UserCog, roles: ['admin'] },
  { label: 'Registers', href: '/admin/registers', icon: Monitor, roles: ['admin'] },
  { label: 'Discounts', href: '/admin/discounts', icon: Tag, roles: ['admin', 'finance'] },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, roles: ['admin', 'finance'] },
  { label: 'Timesheets', href: '/admin/timesheets', icon: Clock, roles: ['admin', 'finance'] },
  { label: 'Petty Cash', href: '/admin/petty-cash', icon: Wallet, roles: ['admin', 'finance'] },
  { label: 'Recurring Bills', href: '/admin/recurring-invoices', icon: RefreshCw, roles: ['admin', 'finance'] },
];

export function AdminSidebar() {
  const { url, props } = usePage();
  const { effectiveStaff, signOut, impersonating, impersonate } = useAuth();

  // Fallback: read staff directly from Inertia props if AuthContext hasn't synced yet
  const pageStaff = (props as any)?.auth?.staff;
  const currentStaff = effectiveStaff ?? (pageStaff ? { ...pageStaff, id: String(pageStaff.id), is_active: true, created_at: '' } : null);

  const filteredNav = ADMIN_NAV.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(currentStaff?.role || '');
  });

  return (
    <aside className="w-64 bg-brand-navy text-white flex flex-col min-h-screen shadow-xl">
      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <img
            src={bellevueLogo}
            alt="Bellevue"
            className="h-8 brightness-0 invert"
          />
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive = url === item.href ||
            (item.href !== '/admin' && url.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
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

        <div className="flex items-center justify-between text-sm text-white/70">
          <div>
            <div className="font-medium text-white line-clamp-1">{currentStaff?.name}</div>
            <div className="capitalize">{currentStaff?.role?.replace('_', ' ')}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
