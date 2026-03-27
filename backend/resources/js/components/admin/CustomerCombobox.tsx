import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronsUpDown, X, User, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Props {
  value: string | null;      // customer_id
  label: string | null;      // display name
  onChange: (id: string | null, name: string | null) => void;
  placeholder?: string;
}

export function CustomerCombobox({ value, label, onChange, placeholder = 'Search customer…' }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Quick-create form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState('personal');

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['customer-search', search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data } = await axios.get('/api/admin/customers', { params: { search, limit: 10 } });
      return data as Customer[];
    },
    enabled: open && search.length >= 1,
    staleTime: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post('/api/admin/customers', {
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
        account_type: newType,
      });
      return data as Customer;
    },
    onSuccess: (customer) => {
      toast.success(`Customer "${customer.name}" created`);
      qc.invalidateQueries({ queryKey: ['customer-search'] });
      onChange(customer.id, customer.name);
      setCreateOpen(false);
      setOpen(false);
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewType('personal');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create customer'),
  });

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    setSearch('');
  };

  const openCreate = () => {
    setNewName(search); // pre-fill name from what they typed
    setOpen(false);
    setCreateOpen(true);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
          >
            <span className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              {label ?? placeholder}
            </span>
            <span className="flex items-center gap-1 shrink-0 ml-2">
              {value && (
                <X
                  className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                  onClick={clear}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-2 border-b">
            <Input
              autoFocus
              placeholder="Name, email, or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {isFetching && (
              <p className="text-center text-sm text-muted-foreground py-4">Searching…</p>
            )}
            {!isFetching && search && results.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No customers found.</p>
            )}
            {!search && (
              <p className="text-center text-sm text-muted-foreground py-4">Type to search customers.</p>
            )}
            {results.map(c => (
              <button
                key={c.id}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col gap-0.5',
                  value === c.id && 'bg-accent'
                )}
                onClick={() => {
                  onChange(c.id, c.name);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.email} {c.phone ? `· ${c.phone}` : ''}</span>
              </button>
            ))}
          </div>
          {/* Create new customer footer */}
          <div className="border-t p-1.5">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm"
              onClick={openCreate}
            >
              <UserPlus className="h-4 w-4" />
              Create new customer{search ? ` "${search}"` : ''}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick-create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              New Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Business or person name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  placeholder="242-xxx-xxxx"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Account Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Saving…' : 'Save Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
