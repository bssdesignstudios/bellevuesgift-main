import { Link, useLocation } from 'react-router-dom';
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
  Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import bellevueLogo from '@/assets/bellevue-logo.webp';

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Categories', href: '/admin/categories', icon: FolderOpen },
  { label: 'Inventory', href: '/admin/inventory', icon: Warehouse },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Repair Tickets', href: '/admin/repair-tickets', icon: Wrench },
  { label: 'Gift Cards', href: '/admin/gift-cards', icon: Gift },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Staff', href: '/admin/staff', icon: UserCog, adminOnly: true },
  { label: 'Discounts', href: '/admin/discounts', icon: Tag },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
];

export function AdminSidebar() {
  const location = useLocation();
  const { effectiveStaff, signOut, impersonating, impersonate } = useAuth();

  const isWarehouse = effectiveStaff?.role === 'warehouse_manager';

  const filteredNav = ADMIN_NAV.filter(item => {
    if (item.adminOnly && isWarehouse) return false;
    return true;
  });

  return (
    <aside className="w-64 bg-header text-white flex flex-col min-h-screen">
      <div className="p-4 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2">
          <img src={bellevueLogo} alt="Bellevue" className="h-8" />
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/admin' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
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
        
        <Link to="/pos">
          <Button variant="outline" size="sm" className="w-full text-white border-white/20 hover:bg-white/10">
            <Store className="h-4 w-4 mr-2" />
            Open POS
          </Button>
        </Link>

        <div className="flex items-center justify-between text-sm text-white/70">
          <div>
            <div className="font-medium text-white">{effectiveStaff?.name}</div>
            <div className="capitalize">{effectiveStaff?.role?.replace('_', ' ')}</div>
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
