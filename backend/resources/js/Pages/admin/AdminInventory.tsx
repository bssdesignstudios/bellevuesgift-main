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
import { toast } from 'sonner';
import {
  Search, Plus, Minus, RotateCcw, Loader2, Pencil, Check, X,
  ChevronLeft, ChevronRight, AlertTriangle, XCircle, Warehouse, LayoutList, Grid3x3,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Category } from '@/types';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  product_id: string;
  qty_on_hand: number;
  qty_reserved: number;
  reorder_level: number;
  product: { id: string; name: string; sku: string; category: { name: string } | null };
}

interface InventorySummary { total: number; low_stock: number; out_of_stock: number; }

interface PaginatedInventory {
  data: InventoryItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  summary: InventorySummary;
}

// ─── Inline editable cell ─────────────────────────────────────────────────────
function InlineEdit({ value, onSave, label }: { value: number; onSave: (v: number) => void; label: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const parsed = parseInt(draft);
    if (!isNaN(parsed) && parsed >= 0) onSave(parsed);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span className="flex items-center justify-end gap-1 cursor-pointer group" onClick={() => { setDraft(String(value)); setEditing(true); }} title={`Click to edit ${label}`}>
        {value}
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
      </span>
    );
  }

  return (
    <span className="flex items-center justify-end gap-1">
      <Input type="number" min="0" value={draft} autoFocus className="w-20 h-7 text-right text-sm p-1"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); } }}
      />
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={commit}><Check className="h-3 w-3 text-emerald-600" /></Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setDraft(String(value)); setEditing(false); }}><X className="h-3 w-3 text-red-500" /></Button>
    </span>
  );
}

// ─── Stock indicator ──────────────────────────────────────────────────────────
function StockIndicator({ qty, reorder }: { qty: number; reorder: number }) {
  if (qty <= 0) return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><XCircle className="h-3.5 w-3.5" /> Out</span>;
  if (qty <= reorder) return <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600"><AlertTriangle className="h-3.5 w-3.5" /> Low</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-green-600"><span className="h-2 w-2 rounded-full bg-green-500" /> OK</span>;
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      'px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap',
      active ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
    )}>
      {label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminInventory() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out_of_stock'>('all');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'warehouse'>('table');
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
      const params: Record<string, string | number> = { page, per_page: viewMode === 'warehouse' ? 50 : 25, filter };
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryId) params.category_id = categoryId;
      return (await axios.get('/api/admin/inventory', { params })).data as PaginatedInventory;
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => (await axios.get('/api/admin/categories')).data as Category[],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; qty_on_hand?: number; reorder_level?: number }) => {
      return (await axios.patch(`/api/admin/inventory/${id}`, payload)).data as InventoryItem;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-inventory'] }); toast.success('Updated'); },
    onError: (e: any) => toast.error('Error: ' + (e.response?.data?.message || e.message)),
  });

  const inventory = paginated?.data ?? [];
  const summary = paginated?.summary;
  const totalPages = paginated?.last_page ?? 1;
  const total = paginated?.total ?? 0;
  const clearAll = () => { setFilter('all'); setCategoryId(''); setSearch(''); };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Inventory</h1>
          <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/30">
            <button
              onClick={() => setViewMode('table')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all', viewMode === 'table' ? 'bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <LayoutList className="h-4 w-4" /> Table View
            </button>
            <button
              onClick={() => setViewMode('warehouse')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all', viewMode === 'warehouse' ? 'bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <Warehouse className="h-4 w-4" /> Warehouse Mode
            </button>
          </div>
        </div>

        {/* Summary metric cards */}
        {summary && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { setFilter('all'); setCategoryId(''); }}
              className={cn('flex-1 min-w-[130px] p-4 rounded-xl border-2 text-left transition-all', filter === 'all' && !categoryId ? 'border-primary bg-primary/5' : 'border-border bg-white hover:border-primary/40')}
            >
              <div className="text-2xl font-bold text-slate-700">{summary.total.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total SKUs</div>
            </button>
            <button
              onClick={() => setFilter(filter === 'low' ? 'all' : 'low')}
              className={cn('flex-1 min-w-[130px] p-4 rounded-xl border-2 text-left transition-all', filter === 'low' ? 'border-orange-500 bg-orange-50' : 'border-border bg-white hover:border-orange-300')}
            >
              <div className="text-2xl font-bold text-orange-600">{summary.low_stock.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-orange-500" /> Low Stock</div>
            </button>
            <button
              onClick={() => setFilter(filter === 'out_of_stock' ? 'all' : 'out_of_stock')}
              className={cn('flex-1 min-w-[130px] p-4 rounded-xl border-2 text-left transition-all', filter === 'out_of_stock' ? 'border-red-500 bg-red-50' : 'border-border bg-white hover:border-red-300')}
            >
              <div className="text-2xl font-bold text-red-600">{summary.out_of_stock.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> Out of Stock</div>
            </button>
          </div>
        )}

        {/* Search + filter pills */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by product name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill label="All Items" active={filter === 'all' && !categoryId} onClick={clearAll} />
            <Pill label="⚠️ Low Stock" active={filter === 'low'} onClick={() => setFilter(filter === 'low' ? 'all' : 'low')} />
            <Pill label="❌ Out of Stock" active={filter === 'out_of_stock'} onClick={() => setFilter(filter === 'out_of_stock' ? 'all' : 'out_of_stock')} />
            {categories?.map(cat => (
              <Pill key={cat.id} label={cat.name} active={categoryId === cat.id}
                onClick={() => { setCategoryId(categoryId === cat.id ? '' : cat.id); setFilter('all'); }}
              />
            ))}
          </div>
          {total > 0 && <p className="text-sm text-muted-foreground">{total} item{total !== 1 ? 's' : ''}</p>}
        </div>

        {/* ── Warehouse Mode ── */}
        {viewMode === 'warehouse' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isLoading ? (
              <div className="col-span-3 py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading...
              </div>
            ) : inventory.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-muted-foreground">No items found</div>
            ) : inventory.map(item => {
              const isOut = item.qty_on_hand <= 0;
              const isLow = item.qty_on_hand > 0 && item.qty_on_hand <= item.reorder_level;
              return (
                <div key={item.id} className={cn(
                  'rounded-xl border-2 p-4 space-y-3 bg-white',
                  isOut ? 'border-red-200 bg-red-50/30' : isLow ? 'border-orange-200 bg-orange-50/30' : 'border-border',
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold leading-tight">{item.product?.name}</div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5">{item.product?.sku}</div>
                    </div>
                    <StockIndicator qty={item.qty_on_hand} reorder={item.reorder_level} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <div className={cn('text-3xl font-bold', isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-slate-800')}>
                        {item.qty_on_hand}
                      </div>
                      <div className="text-xs text-muted-foreground">on hand</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" variant="outline" className="h-9 w-24 gap-1 text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => setAdjustDialog({ item, type: 'receive' })}>
                        <Plus className="h-4 w-4" /> Receive
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 w-24 gap-1 text-orange-700 border-orange-200 hover:bg-orange-50"
                        onClick={() => setAdjustDialog({ item, type: 'adjust' })}>
                        <Minus className="h-4 w-4" /> Remove
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 w-24 gap-1"
                        onClick={() => setAdjustDialog({ item, type: 'count' })}>
                        <RotateCcw className="h-4 w-4" /> Count
                      </Button>
                    </div>
                  </div>
                  {item.product?.category && (
                    <div className="text-xs text-muted-foreground border-t pt-2">{item.product.category.name}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Table Mode ── */}
        {viewMode === 'table' && (
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[35%]">Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reorder At</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory...
                    </div>
                  </TableCell></TableRow>
                )}
                {!isLoading && inventory.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No items found.</TableCell></TableRow>
                )}
                {inventory.map((item) => {
                  const available = item.qty_on_hand - item.qty_reserved;
                  const isLow = item.qty_on_hand > 0 && item.qty_on_hand <= item.reorder_level;
                  const isOut = item.qty_on_hand <= 0;
                  return (
                    <TableRow key={item.id} className={cn('group', isOut ? 'bg-red-50/40' : isLow ? 'bg-orange-50/40' : '')}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StockIndicator qty={item.qty_on_hand} reorder={item.reorder_level} />
                          <div>
                            <div className="font-medium leading-tight">{item.product?.name}</div>
                            <div className="font-mono text-xs text-muted-foreground">{item.product?.sku}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.product?.category?.name || '—'}</TableCell>
                      <TableCell className="text-right">
                        <InlineEdit value={item.qty_on_hand} label="On Hand" onSave={(v) => updateMutation.mutate({ id: item.id, qty_on_hand: v })} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.qty_reserved}</TableCell>
                      <TableCell className={cn('text-right font-semibold', available <= 0 ? 'text-red-600' : '')}>{available}</TableCell>
                      <TableCell className="text-right">
                        <InlineEdit value={item.reorder_level} label="Reorder Level" onSave={(v) => updateMutation.mutate({ id: item.id, reorder_level: v })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" title="Receive Stock" onClick={() => setAdjustDialog({ item, type: 'receive' })}>
                            <Plus className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Remove / Damage" onClick={() => setAdjustDialog({ item, type: 'adjust' })}>
                            <Minus className="h-4 w-4 text-orange-600" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Cycle Count" onClick={() => setAdjustDialog({ item, type: 'count' })}>
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} — {total} total</p>
            <div className="flex gap-2">
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
                {adjustDialog?.type === 'receive' && '+ Receive Stock'}
                {adjustDialog?.type === 'adjust' && '− Remove / Damage Stock'}
                {adjustDialog?.type === 'count' && '↺ Cycle Count'}
              </DialogTitle>
            </DialogHeader>
            {adjustDialog && (
              <AdjustmentForm
                item={adjustDialog.item}
                type={adjustDialog.type}
                onSuccess={() => { setAdjustDialog(null); queryClient.invalidateQueries({ queryKey: ['admin-inventory'] }); }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

// ─── Adjustment form ──────────────────────────────────────────────────────────
function AdjustmentForm({ item, type, onSuccess }: {
  item: InventoryItem; type: 'receive' | 'adjust' | 'count'; onSuccess: () => void;
}) {
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('remove');

  const mutation = useMutation({
    mutationFn: async () => {
      let amount = parseInt(qty);
      if (type === 'adjust' && adjustType === 'remove') amount = -amount;
      else if (type === 'count') amount = amount - item.qty_on_hand;

      await axios.post(`/api/admin/inventory/${item.id}/adjust`, {
        adjustment_type: type === 'count' ? 'count' : type === 'receive' ? 'receive' : (adjustType === 'add' ? 'receive' : 'shrink'),
        qty_change: amount,
        notes,
      });
    },
    onSuccess: () => { toast.success('Inventory updated'); onSuccess(); },
    onError: (e: any) => toast.error('Error: ' + (e.response?.data?.message || e.message)),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="p-3 bg-muted rounded-lg">
        <div className="font-semibold">{item.product?.name}</div>
        <div className="text-sm text-muted-foreground font-mono">{item.product?.sku}</div>
        <div className="text-sm mt-1">
          Currently: <strong>{item.qty_on_hand}</strong> on hand · <strong>{item.qty_on_hand - item.qty_reserved}</strong> available
        </div>
      </div>

      {type === 'adjust' && (
        <div className="space-y-2">
          <Label>Adjustment Type</Label>
          <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'add' | 'remove')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Add Stock (Receive)</SelectItem>
              <SelectItem value="remove">Remove Stock (Damage / Shrink)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>
          {type === 'receive' && 'Quantity Received'}
          {type === 'adjust' && 'Quantity'}
          {type === 'count' && `Counted Quantity (currently ${item.qty_on_hand})`}
        </Label>
        <Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)}
          placeholder={type === 'count' ? String(item.qty_on_hand) : '0'} required className="text-lg h-12 font-semibold" />
        {type === 'count' && qty && !isNaN(parseInt(qty)) && (
          <p className="text-sm text-muted-foreground">
            Change: <strong>{parseInt(qty) - item.qty_on_hand >= 0 ? '+' : ''}{parseInt(qty) - item.qty_on_hand}</strong> units
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for adjustment..." rows={2} />
      </div>

      <Button type="submit" className="w-full h-11" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save Adjustment'}
      </Button>
    </form>
  );
}
