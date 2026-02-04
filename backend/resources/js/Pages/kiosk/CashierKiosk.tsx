import { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';

export default function CashierKiosk() {
  useEffect(() => {
    router.visit('/pos', { replace: true });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading Cashier POS...</p>
      </div>
    </div>
  );
}
