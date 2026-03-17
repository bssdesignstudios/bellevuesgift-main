import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { ImpersonationBanner } from './ImpersonationBanner';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { effectiveStaff, authError, retryAuth } = useAuth();

  // Read directly from Inertia page props as reliable source of truth
  const pageProps = usePage().props as any;
  const pageStaff = pageProps?.auth?.staff;
  const resolvedStaff = effectiveStaff ?? (pageStaff ? {
    id: String(pageStaff.id),
    name: pageStaff.name,
    email: pageStaff.email,
    role: pageStaff.role,
  } : null);

  useEffect(() => {
    if (!authError && resolvedStaff) {
      const role = resolvedStaff.role;

      // 1. Cashier role always redirects to POS
      if (role === 'cashier') {
        window.location.href = '/pos';
        return;
      }

      // 2. Redirect warehouse staff to inventory if they hit the admin root
      if ((role === 'warehouse' || role === 'warehouse_manager') && window.location.pathname === '/admin') {
        window.location.href = '/admin/inventory';
        return;
      }

      const allowedRoles = ['admin', 'finance', 'warehouse', 'warehouse_manager'];
      if (!allowedRoles.includes(role || '')) {
        window.location.href = '/not-authorized';
      }
    }
  }, [resolvedStaff?.id, authError]);

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

  if (!resolvedStaff) {
    // Server-side auth middleware protects admin routes.
    // If we get here without staff, redirect to login.
    window.location.href = '/staff/login';
    return null;
  }

  // Check role access
  const allowedRoles = ['admin', 'finance', 'warehouse', 'warehouse_manager'];
  if (!allowedRoles.includes(resolvedStaff.role || '')) {
    return null; // Redirect handled by useEffect
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted font-sans">
      <ImpersonationBanner />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
