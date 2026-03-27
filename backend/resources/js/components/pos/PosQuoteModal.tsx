import { useState } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, Printer, CheckCircle } from 'lucide-react';
import { PosCustomerModal, PosCustomer } from './PosCustomerModal';

export interface PosCartItemDoc {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  discount: number;
  line_total: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  cartItems: PosCartItemDoc[];
  cartTotal: number;
}

export function PosQuoteModal({ open, onClose, cartItems, cartTotal }: Props) {
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedQuote, setSavedQuote] = useState<{ id: string; quote_number: string } | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const handleSave = async () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.post('/api/admin/pos-docs/quotes', {
        customer_id: customer?.id ?? null,
        notes: notes || null,
        issued_date: new Date().toISOString().split('T')[0],
        valid_until: validUntil || null,
        items: cartItems,
      });
      setSavedQuote({ id: data.id, quote_number: data.quote_number });
      toast.success(`Quote ${data.quote_number} saved`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCustomer(null);
    setNotes('');
    setValidUntil('');
    setSavedQuote(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Quote</DialogTitle>
          </DialogHeader>

          {savedQuote ? (
            <div className="space-y-4 text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <div className="text-xl font-bold">{savedQuote.quote_number}</div>
                <div className="text-muted-foreground text-sm">Quote saved successfully</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`/admin/quotes/${savedQuote.id}`, '_blank')}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  View / Print
                </Button>
                <Button className="flex-1" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Customer selector */}
              <div>
                <Label>Customer</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start mt-1"
                  onClick={() => setCustomerModalOpen(true)}
                >
                  <User className="h-4 w-4 mr-2 shrink-0" />
                  {customer ? (
                    <span className="truncate">{customer.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Select customer (optional)</span>
                  )}
                </Button>
              </div>

              {/* Cart summary */}
              <div className="border rounded-md p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Items ({cartItems.length})</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {cartItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="truncate mr-2">{item.name} × {item.quantity}</span>
                      <span className="shrink-0">${item.line_total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Fields */}
              <div>
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving || cartItems.length === 0}
                >
                  {saving ? 'Saving...' : 'Save Quote'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PosCustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSelect={(c) => setCustomer(c)}
      />
    </>
  );
}
