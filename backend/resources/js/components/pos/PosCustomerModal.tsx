import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, UserPlus, X } from 'lucide-react';

export interface PosCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: PosCustomer) => void;
}

export function PosCustomerModal({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PosCustomer[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New customer form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [island, setIsland] = useState('');
  const [saving, setSaving] = useState(false);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Load recent customers on open
  useEffect(() => {
    if (open) {
      doSearch('');
      setShowCreate(false);
      setQuery('');
    }
  }, [open]);

  const doSearch = async (q: string) => {
    setSearching(true);
    try {
      const { data } = await axios.get('/api/admin/pos-docs/customers/search', { params: { q } });
      setResults(data);
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (c: PosCustomer) => {
    onSelect(c);
    onClose();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await axios.post('/api/admin/pos-docs/customers', {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        island: island.trim() || null,
      });
      toast.success(`Customer "${data.name}" created`);
      onSelect(data);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Failed to create customer';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
        </DialogHeader>

        {!showCreate ? (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name, email or phone..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Results */}
            <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
              {searching && (
                <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
              )}
              {!searching && results.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground text-center">No customers found</div>
              )}
              {results.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-0 transition-colors"
                  onClick={() => handleSelect(c)}
                >
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[c.email, c.phone].filter(Boolean).join(' · ')}
                  </div>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreate(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3">
            <button
              type="button"
              className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground"
              onClick={() => setShowCreate(false)}
            >
              <X className="h-3 w-3" /> Back to search
            </button>

            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label>Island</Label>
              <Input value={island} onChange={(e) => setIsland(e.target.value)} />
            </div>

            <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
              {saving ? 'Creating...' : 'Create Customer'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
