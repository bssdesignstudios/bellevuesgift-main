import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, LogOut, Loader2 } from 'lucide-react';

interface SwitchCashierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCashierName: string;
  onSwitchCashier: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function SwitchCashierDialog({
  open,
  onOpenChange,
  currentCashierName,
  onSwitchCashier,
  onSignOut,
}: SwitchCashierDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleSwitch = async () => {
    setLoading(true);
    try {
      await onSwitchCashier();
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await onSignOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Cashier Options</DialogTitle>
        </DialogHeader>

        <div className="py-2 text-center text-sm text-muted-foreground">
          Logged in as <span className="font-semibold text-foreground">{currentCashierName}</span>
        </div>

        <div className="space-y-3">
          {/* Switch Cashier — keeps register session open */}
          <button
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors text-left disabled:opacity-50"
            onClick={handleSwitch}
            disabled={loading}
          >
            <div className="h-12 w-12 rounded-lg bg-cyan-500/10 border border-cyan-300 flex items-center justify-center shrink-0">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
              ) : (
                <ArrowLeftRight className="h-5 w-5 text-cyan-600" />
              )}
            </div>
            <div>
              <div className="font-bold text-cyan-700 dark:text-cyan-400">Switch Cashier</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Clock out and hand off to another cashier. The register drawer stays open.
              </div>
            </div>
          </button>

          {/* Sign Out — simple logout */}
          <button
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-muted/30 hover:bg-muted/60 transition-colors text-left disabled:opacity-50"
            onClick={handleSignOut}
            disabled={loading}
          >
            <div className="h-12 w-12 rounded-lg bg-muted border flex items-center justify-center shrink-0">
              <LogOut className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-bold">Sign Out</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Leave the register active and return to the login screen.
              </div>
            </div>
          </button>
        </div>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
