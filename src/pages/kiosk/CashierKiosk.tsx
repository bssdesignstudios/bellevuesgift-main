import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setDemoSession, enableDemoMode } from '@/lib/demoSession';
import { Loader2 } from 'lucide-react';

export default function CashierKiosk() {
  const navigate = useNavigate();

  useEffect(() => {
    // Set up demo session for cashier role
    enableDemoMode();
    setDemoSession('cashier');
    
    // Navigate to POS
    navigate('/pos', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading Cashier POS...</p>
      </div>
    </div>
  );
}
