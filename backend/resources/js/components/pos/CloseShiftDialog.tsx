import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, DollarSign, ShoppingCart, CreditCard, Banknote, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ShiftSummary {
  session_id: string;
  opened_at: string;
  opening_balance: number;
  total_sales: number;
  order_count: number;
  cash_sales: number;
  card_sales: number;
  gift_card_sales: number;
  expected_cash: number;
}

interface CloseShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onConfirm: (closingBalance: number, adminPin: string, notes?: string) => void;
}

export function CloseShiftDialog({ open, onOpenChange, sessionId, onConfirm }: CloseShiftDialogProps) {
  const [closingBalance, setClosingBalance] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ... (summary fetching and other effects)
  const { data: summary, isLoading } = useQuery({
    queryKey: ['shift-summary', sessionId],
    queryFn: async () => {
      const response = await axios.get(`/api/pos/session/${sessionId}/summary`);
      return response.data as ShiftSummary;
    },
    enabled: open && !!sessionId,
  });

  useEffect(() => {
    if (open) {
      setClosingBalance('');
      setAdminPin('');
      setNotes('');
      setSubmitting(false);
    }
  }, [open]);

  const closingNum = parseFloat(closingBalance) || 0;
  const variance = summary ? closingNum - summary.expected_cash : 0;
  const hasEnteredBalance = closingBalance !== '';

  const handleConfirm = async () => {
    if (!hasEnteredBalance || !adminPin) return;
    setSubmitting(true);
    try {
      await onConfirm(closingNum, adminPin, notes || undefined);
    } catch {
      setSubmitting(false);
    }
  };

  const formatDuration = (openedAt: string) => {
    const start = new Date(openedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalize Register Closeout</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : summary ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded w-fit mx-auto">
              <Clock className="h-3 w-3" />
              <span>
                Session Active Since {format(new Date(summary.opened_at), 'h:mm a')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">Opening</div>
                <div className="text-lg font-bold">${summary.opening_balance.toFixed(2)}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">Expected Sales</div>
                <div className="text-lg font-bold text-primary">${summary.total_sales.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-3 text-center">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-0.5 font-medium uppercase tracking-tighter">Expected Cash in Drawer</div>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-300">${summary.expected_cash.toFixed(2)}</div>
            </div>

            <div className="space-y-3 p-4 border rounded-xl bg-card">
              <div className="space-y-1.5">
                <Label htmlFor="closing-balance" className="text-xs font-bold uppercase text-muted-foreground">Actual Cash Counted</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="closing-balance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    autoFocus
                    className="pl-9 text-xl font-bold h-12"
                  />
                </div>
              </div>

              {hasEnteredBalance && (
                <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold ${
                  variance === 0 
                    ? 'bg-green-100 text-green-700' 
                    : variance > 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                }`}>
                  <span className="flex items-center gap-1.5">
                    {variance < 0 && <AlertTriangle className="h-4 w-4" />}
                    {variance === 0 ? 'Balanced' : variance > 0 ? 'Overage' : 'Shortage'}
                  </span>
                  <span>{variance >= 0 ? '+' : ''}${variance.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 p-4 border rounded-xl bg-orange-50/30 border-orange-200">
               <div className="flex items-center gap-2 text-orange-600 mb-1">
                 <AlertTriangle className="h-4 w-4" />
                 <span className="text-xs font-bold uppercase">Administrator Authorization</span>
               </div>
               <div className="space-y-1.5">
                <Label htmlFor="admin-pin" className="text-xs font-bold uppercase text-muted-foreground">Manager/Admin PIN</Label>
                <Input
                  id="admin-pin"
                  type="password"
                  placeholder="••••"
                  maxLength={4}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="text-center text-2xl tracking-[0.5em] font-black h-12"
                />
              </div>
            </div>

            <div className="space-y-1.5 px-1">
              <Label htmlFor="shift-notes" className="text-xs font-bold uppercase text-muted-foreground">Closing Notes</Label>
              <Textarea
                id="shift-notes"
                placeholder="Discrepancy explanations, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            <Button
              className="w-full h-12 text-md font-bold uppercase tracking-tight"
              size="lg"
              onClick={handleConfirm}
              disabled={!hasEnteredBalance || !adminPin || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Finalize Closeout'
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Unable to load shift summary.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
