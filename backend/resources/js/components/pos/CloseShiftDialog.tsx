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
  onConfirm: (closingBalance: number, notes?: string) => void;
}

export function CloseShiftDialog({ open, onOpenChange, sessionId, onConfirm }: CloseShiftDialogProps) {
  const [closingBalance, setClosingBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['shift-summary', sessionId],
    queryFn: async () => {
      const response = await axios.get(`/api/pos/session/${sessionId}/summary`);
      return response.data as ShiftSummary;
    },
    enabled: open && !!sessionId,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setClosingBalance('');
      setNotes('');
      setSubmitting(false);
    }
  }, [open]);

  const closingNum = parseFloat(closingBalance) || 0;
  const variance = summary ? closingNum - summary.expected_cash : 0;
  const hasEnteredBalance = closingBalance !== '';

  const handleConfirm = async () => {
    if (!hasEnteredBalance) return;
    setSubmitting(true);
    try {
      await onConfirm(closingNum, notes || undefined);
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
          <DialogTitle>Close Shift</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : summary ? (
          <div className="space-y-4">
            {/* Shift Duration */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Shift started {format(new Date(summary.opened_at), 'h:mm a')} ({formatDuration(summary.opened_at)})
              </span>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Opening Float
                </div>
                <div className="text-lg font-semibold">${summary.opening_balance.toFixed(2)}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Total Sales
                </div>
                <div className="text-lg font-semibold">${summary.total_sales.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{summary.order_count} order{summary.order_count !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="border rounded-lg divide-y">
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-green-600" />
                  Cash
                </span>
                <span className="font-medium">${summary.cash_sales.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  Card
                </span>
                <span className="font-medium">${summary.card_sales.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-purple-600" />
                  Gift Card
                </span>
                <span className="font-medium">${summary.gift_card_sales.toFixed(2)}</span>
              </div>
            </div>

            {/* Expected Cash */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-0.5">Expected Cash in Drawer</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">${summary.expected_cash.toFixed(2)}</div>
              <div className="text-xs text-blue-500 dark:text-blue-400">
                ${summary.opening_balance.toFixed(2)} float + ${summary.cash_sales.toFixed(2)} cash sales
              </div>
            </div>

            {/* Actual Cash Input */}
            <div className="space-y-2">
              <Label htmlFor="closing-balance">Actual Cash in Drawer</Label>
              <Input
                id="closing-balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                autoFocus
                className="text-lg font-semibold"
              />
            </div>

            {/* Variance */}
            {hasEnteredBalance && (
              <div
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                  variance === 0
                    ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                    : variance > 0
                      ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {variance < 0 && <AlertTriangle className="h-4 w-4" />}
                  Variance
                </span>
                <span>
                  {variance >= 0 ? '+' : ''}${variance.toFixed(2)}
                </span>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="shift-notes">Notes (optional)</Label>
              <Textarea
                id="shift-notes"
                placeholder="Any notes about this shift..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Confirm Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirm}
              disabled={!hasEnteredBalance || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Closing Shift...
                </>
              ) : (
                'Close Shift & Sign Out'
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
