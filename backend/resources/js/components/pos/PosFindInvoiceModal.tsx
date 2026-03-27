import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, ShoppingCart, Printer } from 'lucide-react';
import { PosCartItemDoc } from './PosQuoteModal';

interface InvoiceResult {
  id: string;
  invoice_number: string;
  status: string;
  customer: { id: string; name: string } | null;
  total: number;
  amount_paid: number;
  balance: number;
  issued_date: string | null;
  due_date: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onLoadCart: (items: PosCartItemDoc[]) => void;
}

export function PosFindInvoiceModal({ open, onClose, onLoadCart }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InvoiceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      doSearch('');
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const doSearch = async (q: string) => {
    setSearching(true);
    try {
      const { data } = await axios.get('/api/admin/pos-docs/invoices/search', { params: { q } });
      setResults(data);
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  };

  const handleLoadCart = async (inv: InvoiceResult) => {
    setLoadingId(inv.id);
    try {
      const { data } = await axios.get(`/api/admin/pos-docs/invoices/${inv.id}/items`);
      onLoadCart(data.items as PosCartItemDoc[]);
      toast.success(`Loaded ${inv.invoice_number} into cart`);
      onClose();
    } catch {
      toast.error('Failed to load invoice items');
    } finally {
      setLoadingId(null);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      void: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Find Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by invoice number or customer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="border rounded-md overflow-hidden max-h-80 overflow-y-auto">
            {searching && (
              <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
            )}
            {!searching && results.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground text-center">No invoices found</div>
            )}
            {results.map((inv) => (
              <div key={inv.id} className="border-b last:border-0 p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{inv.invoice_number}</span>
                    {statusBadge(inv.status)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {inv.customer?.name || 'No customer'}
                    {inv.due_date && ` · Due: ${inv.due_date}`}
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-sm font-semibold">${Number(inv.total).toFixed(2)}</span>
                    {Number(inv.balance) > 0 && (
                      <span className="text-xs text-red-600">Balance: ${Number(inv.balance).toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/admin/invoices/${inv.id}`, '_blank')}
                    title="View / Print"
                  >
                    <Printer className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleLoadCart(inv)}
                    disabled={loadingId === inv.id}
                    title="Load to Cart"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    {loadingId === inv.id ? '...' : 'Load'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
