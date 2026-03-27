import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronsUpDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  inventory?: { qty_on_hand: number };
}

interface Props {
  value: string | null;
  label: string | null;
  onChange: (product: { id: string; name: string; price: number } | null) => void;
  placeholder?: string;
}

export function ProductCombobox({ value, label, onChange, placeholder = 'Search product or type description…' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['product-search', search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data } = await axios.get('/api/admin/products', {
        params: { search, is_active: 'true' },
      });
      return (data as Product[]).slice(0, 15);
    },
    enabled: open && search.length >= 1,
    staleTime: 10_000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal h-8 text-sm px-2', !value && 'text-muted-foreground')}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{label ?? placeholder}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            autoFocus
            placeholder="Name or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-60 overflow-auto">
          {isFetching && (
            <p className="text-center text-sm text-muted-foreground py-3">Searching…</p>
          )}
          {!isFetching && search && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-3">No products found.</p>
          )}
          {!search && (
            <p className="text-center text-sm text-muted-foreground py-3">Type to search inventory.</p>
          )}
          {results.map(p => {
            const stock = p.inventory?.qty_on_hand ?? 0;
            return (
              <button
                key={p.id}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2',
                  value === p.id && 'bg-accent'
                )}
                onClick={() => {
                  onChange({ id: p.id, name: p.name, price: p.price });
                  setOpen(false);
                  setSearch('');
                }}
              >
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.sku}</span>
                </span>
                <span className="flex flex-col items-end shrink-0 gap-0.5">
                  <span className="text-xs font-medium">${Number(p.price).toFixed(2)}</span>
                  <span className={cn('text-xs', stock <= 0 ? 'text-red-500' : 'text-muted-foreground')}>
                    {stock <= 0 ? 'Out of stock' : `${stock} in stock`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
