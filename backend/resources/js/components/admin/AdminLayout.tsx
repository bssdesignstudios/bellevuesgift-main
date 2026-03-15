import { Link, router } from '@inertiajs/react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, staff, loading, effectiveStaff, authError, retryAuth } = useAuth();

  useEffect(() => {
    if (!loading && !authError) {
      if (!user || !staff) {
        router.visit('/staff/login');
      } else {
        const role = effectiveStaff?.role;

        // 1. Cashier role always redirects to POS
        if (role === 'cashier') {
          router.visit('/pos');
          return;
        }

        // 2. Redirect warehouse staff to inventory if they hit the admin root
        if ((role === 'warehouse' || role === 'warehouse_manager') && window.location.pathname === '/admin') {
          router.visit('/admin/inventory');
          return;
        }

        const allowedRoles = ['admin', 'finance', 'warehouse', 'warehouse_manager'];
        if (!allowedRoles.includes(role || '')) {
          router.visit('/not-authorized');
        }
      }
    }
  }, [user, staff, loading, authError, effectiveStaff]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Authentication Error</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">{authError}</p>
        <div className="flex gap-2">
          <Button onClick={retryAuth} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button asChild>
            <Link href="/staff/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!user || !staff) {
    return null; // Redirect handled by useEffect
  }

  // Check role access - cashiers cannot access admin
  const allowedRoles = ['admin', 'finance', 'warehouse', 'warehouse_manager'];
  if (!allowedRoles.includes(effectiveStaff?.role || '')) {
    return null; // Redirect handled by useEffect
  }

  return (
    <div className="flex min-h-screen bg-muted font-sans">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
