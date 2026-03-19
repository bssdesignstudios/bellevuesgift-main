import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Plus, Minus, RotateCcw, Loader2, Pencil, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Category } from '@/types';

interface InventoryItem {
  id: string;
  product_id: string;
  location: string;
  qty_on_hand: number;
  qty_reserved: number;
  reorder_level: number;
  product: {
    id: string;
    name: string;
    sku: string;
    category: { name: string } | null;
  };
}

interface PaginatedInventory {
  data: InventoryItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// Inline editable cell — click the number to edit
function InlineEdit({
  value,
  onSave,
  label,
}: {
  value: number;
  onSave: (v: number) => void;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const parsed = parseInt(draft);
    if (!isNaN(parsed) && parsed >= 0) {
      onSave(parsed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className="flex items-center justify-end gap-1 cursor-pointer group"
        onClick={() => { setDraft(String(value)); setEditing(true); }}
        title={`Click to edit ${label}`}
      >
        {value}
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
      </span>
    );
  }

  return (
    <span className="flex items-center justify-end gap-1">
      <Input
        type="number"
        min="0"
        value={draft}
        autoFocus
        className="w-20 h-7 text-right text-sm p-1"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
      />
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={commit}>
        <Check className="h-3 w-3 text-emerald-600" />
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancel}>
        <X className="h-3 w-3 text-red-500" />
      </Button>
    </span>
  );
}

export default function AdminInventory() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out_of_stock'>('all');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [adjustDialog, setAdjustDialog] = useState<{ item: InventoryItem; type: 'receive' | 'adjust' | 'count' } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [filter, categoryId]);

  const { data: paginated, isLoading } = useQuery<PaginatedInventory>({
    queryKey: ['admin-inventory', debouncedSearch, filter, categoryId, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 25, filter };
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryId) params.category_id = categoryId;
      const response = await axios.get('/api/admin/inventory', { params });
      return response.data as PaginatedInventory;
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/categories');
      return response.data as Category[];
    }
  });

  // Direct PATCH update (qty or reorder level)
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; qty_on_hand?: number; reorder_level?: number }) => {
      const { data } = await axios.patch(`/api/admin/inventory/${id}`, payload);
      return data as InventoryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      toast.success('Inventory updated');
    },
    onError: (error: any) => {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
    },
  });

  const inventory = paginated?.data ?? [];
  const totalPages = paginated?.last_page ?? 1;
  const total = paginated?.total ?? 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory</h1>
            <p className="text-sm text-muted-foreground">{total} items</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Click any <strong>On Hand</strong> or <strong>Reorder Level</strong> number to edit it directly.
          Use the +/−/↺ buttons for logged adjustments.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryId || 'all'} onValueChange={(v) => setCategoryId(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'low' | 'out_of_stock')}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading inventory...
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && inventory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No inventory items found.
                  </TableCell>
                </TableRow>
              )}
              {inventory.map((item) => {
                const available = item.qty_on_hand - item.qty_reserved;
                const isLow = item.qty_on_hand > 0 && item.qty_on_hand < item.reorder_level;
                const isOut = item.qty_on_hand <= 0;

                return (
                  <TableRow key={item.id} className={isOut ? 'bg-red-50/50' : isLow ? 'bg-orange-50/50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.product?.name}</span>
                        {isOut && <Badge variant="destructive" className="text-xs">Out</Badge>}
                        {isLow && <Badge className="bg-orange-500 text-white text-xs">Low</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.product?.sku || '—'}</TableCell>
                    <TableCell>{item.product?.category?.name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <InlineEdit
                        value={item.qty_on_hand}
                        label="On Hand"
                        onSave={(v) => updateMutation.mutate({ id: item.id, qty_on_hand: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">{item.qty_reserved}</TableCell>
                    <TableCell className={`text-right font-bold ${available <= 0 ? 'text-red-600' : ''}`}>
                      {available}
                    </TableCell>
                    <TableCell className="text-right">
                      <InlineEdit
                        value={item.reorder_level}
                        label="Reorder Level"
                        onSave={(v) => updateMutation.mutate({ id: item.id, reorder_level: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Receive Stock"
                          onClick={() => setAdjustDialog({ item, type: 'receive' })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Adjustment (damage/shrink)"
                          onClick={() => setAdjustDialog({ item, type: 'adjust' })}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Cycle Count"
                          onClick={() => setAdjustDialog({ item, type: 'count' })}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} — {total} total</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Adjustment Dialog */}
        <Dialog open={!!adjustDialog} onOpenChange={() => setAdjustDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {adjustDialog?.type === 'receive' && 'Receive Stock'}
                {adjustDialog?.type === 'adjust' && 'Inventory Adjustment'}
                {adjustDialog?.type === 'count' && 'Cycle Count'}
              </DialogTitle>
            </DialogHeader>
            {adjustDialog && (
              <AdjustmentForm
                item={adjustDialog.item}
                type={adjustDialog.type}
                onSuccess={() => {
                  setAdjustDialog(null);
                  queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function AdjustmentForm({
  item,
  type,
  onSuccess,
}: {
  item: InventoryItem;
  type: 'receive' | 'adjust' | 'count';
  onSuccess: () => void;
}) {
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('remove');

  const mutation = useMutation({
    mutationFn: async () => {
      let amount = parseInt(qty);
      if (type === 'adjust' && adjustType === 'remove') {
        amount = -amount;
      } else if (type === 'count') {
        // count: amount is the NEW qty, so compute the delta
        amount = amount - item.qty_on_hand;
      }

      await axios.post(`/api/admin/inventory/${item.id}/adjust`, {
        adjustment_type: type === 'count' ? 'count' : type === 'receive' ? 'receive' : (adjustType === 'add' ? 'receive' : 'shrink'),
        qty_change: amount,
        notes,
      });
    },
    onSuccess: () => {
      toast.success('Inventory updated');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="p-3 bg-muted rounded-md">
        <div className="font-medium">{item.product?.name}</div>
        <div className="text-sm text-muted-foreground">
          Current: {item.qty_on_hand} on hand · {item.qty_reserved} reserved ·{' '}
          {item.qty_on_hand - item.qty_reserved} available
        </div>
      </div>

      {type === 'adjust' && (
        <div className="space-y-2">
          <Label>Adjustment Type</Label>
          <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'add' | 'remove')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Add Stock (Receive)</SelectItem>
              <SelectItem value="remove">Remove Stock (Damage / Shrink)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>
          {type === 'receive' && 'Quantity to Receive'}
          {type === 'adjust' && 'Quantity'}
          {type === 'count' && `Counted Quantity (currently ${item.qty_on_hand})`}
        </Label>
        <Input
          type="number"
          min="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder={type === 'count' ? String(item.qty_on_hand) : '0'}
          required
        />
        {type === 'count' && qty && !isNaN(parseInt(qty)) && (
          <p className="text-xs text-muted-foreground">
            Change: {parseInt(qty) - item.qty_on_hand >= 0 ? '+' : ''}{parseInt(qty) - item.qty_on_hand} units
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reason for adjustment..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
