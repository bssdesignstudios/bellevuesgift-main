import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDemoModeEnabled, getDemoSession, enableDemoMode, setDemoSession } from '@/lib/demoSession';

export function AdminLayout() {
  const { user, staff, loading, effectiveStaff, authError, retryAuth, demoSession } = useAuth();

  // Check for demo mode
  const demoModeActive = isDemoModeEnabled();
  const storedDemoSession = getDemoSession();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
      </div>
    );
  }

  if (authError && !demoModeActive) {
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
          <Button onClick={() => {
            enableDemoMode();
            setDemoSession('admin');
            window.location.reload();
          }} variant="secondary">
            Continue Demo Mode
          </Button>
          <Button asChild>
            <Link to="/staff/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check demo mode access
  if (demoModeActive && storedDemoSession?.enabled) {
    const role = storedDemoSession.role;
    // Cashiers cannot access admin even in demo mode
    if (role === 'cashier') {
      return <Navigate to="/not-authorized" replace />;
    }
    // Allow admin and warehouse in demo mode
    return (
      <div className="flex min-h-screen bg-muted">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    );
  }

  if (!user || !staff) {
    return <Navigate to="/staff/login" replace />;
  }

  // Check role access - cashiers cannot access admin
  const allowedRoles = ['admin', 'warehouse_manager'];
  if (!allowedRoles.includes(effectiveStaff?.role || '')) {
    // Cashiers see a "not authorized" page
    return <Navigate to="/not-authorized" replace />;
  }

  return (
    <div className="flex min-h-screen bg-muted">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
