import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  Heart, 
  Gift, 
  Settings, 
  LogOut,
  Truck,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { StorefrontHeader } from '@/components/layout/StorefrontHeader';
import { StorefrontFooter } from '@/components/layout/StorefrontFooter';

const navItems = [
  { to: '/account', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/account/orders', icon: Package, label: 'Orders' },
  { to: '/account/tracking', icon: Truck, label: 'Order Tracking' },
  { to: '/account/addresses', icon: MapPin, label: 'Addresses' },
  { to: '/account/wishlist', icon: Heart, label: 'Wishlist' },
  { to: '/account/gift-cards', icon: Gift, label: 'Gift Cards' },
  { to: '/account/settings', icon: Settings, label: 'Profile Settings' },
];

export function AccountLayout() {
  const { customer, signOut, loading, authError, retryAuth } = useCustomerAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading your account...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-destructive text-lg">Authentication Error</div>
        <p className="text-sm text-muted-foreground">{authError}</p>
        <div className="flex gap-2">
          <button onClick={retryAuth} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Retry
          </button>
          <a href="/account/login" className="px-4 py-2 border rounded-md">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!customer) {
    navigate('/account/login');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Mobile menu button */}
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Sidebar */}
          <aside className={cn(
            "fixed lg:relative inset-y-0 left-0 z-40 w-64 bg-background border-r lg:border lg:rounded-lg transform transition-transform lg:transform-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}>
            <div className="p-6 lg:p-4">
              <div className="mb-6">
                <h2 className="font-semibold text-lg">{customer.name}</h2>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-left text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </nav>
            </div>
          </aside>

          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      <StorefrontFooter />
    </div>
  );
}
