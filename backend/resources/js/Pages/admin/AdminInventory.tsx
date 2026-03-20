import { useState, useCallback } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Plus, Minus, RotateCcw, Loader2, Pencil, Check, X, ArrowUpDown, Package, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

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
    image_url?: string;
    category: { id: string; name: string } | null;
  };
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

// Stock level bar for card view
function StockBar({ qty, reorderLevel }: { qty: number; reorderLevel: number }) {
  const max = Math.max(qty, reorderLevel, 1) * 1.5;
  const pct = Math.min((qty / max) * 100, 100);
  const color = qty <= 0 ? 'bg-red-400' : qty <= reorderLevel ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function getStockColor(qty: number, reorderLevel: number) {
  if (qty <= 0) return { border: 'border-l-red-400', text: 'text-red-600', bg: 'bg-red-50' };
  if (qty <= reorderLevel) return { border: 'border-l-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' };
  return { border: 'border-l-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50' };
}

export default function AdminInventory() {
  // Read URL params for default view mode and stock filter
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const defaultMode = urlParams?.get('mode') === 'cards' ? 'cards' : 'table';
  const defaultStockFilter = urlParams?.get('stockFilter') || 'all';

  const [viewMode, setViewMode] = useState<'table' | 'cards'>(defaultMode);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>(defaultStockFilter);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [adjustDialog, setAdjustDialog] = useState<{ item: InventoryItem; type: 'receive' | 'adjust' | 'count' } | null>(null);
  const [adjustingItems, setAdjustingItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: rawInventory, isLoading } = useQuery({
    queryKey: ['admin-inventory', search],
    queryFn: async () => {
      const response = await axios.get('/api/admin/inventory', { params: { search } });
      return response.data as InventoryItem[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/categories');
      return response.data as Array<{ id: string; name: string }>;
    },
  });

  // Client-side filters
  const inventory = rawInventory?.filter(item => {
    if (categoryFilter !== 'all' && item.product?.category?.id !== categoryFilter) return false;
    if (stockFilter === 'out' && item.qty_on_hand > 0) return false;
    if (stockFilter === 'low' && !(item.qty_on_hand > 0 && item.qty_on_hand <= item.reorder_level)) return false;
    if (stockFilter === 'in' && item.qty_on_hand <= item.reorder_level) return false;
    return true;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = (a.product?.name ?? '').localeCompare(b.product?.name ?? '');
    else if (sortBy === 'sku') cmp = (a.product?.sku ?? '').localeCompare(b.product?.sku ?? '');
    else if (sortBy === 'qty') cmp = a.qty_on_hand - b.qty_on_hand;
    else if (sortBy === 'available') cmp = (a.qty_on_hand - a.qty_reserved) - (b.qty_on_hand - b.qty_reserved);
    return sortDir === 'desc' ? -cmp : cmp;
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

  // Quick adjust for card view +/- buttons
  const quickAdjust = useCallback(async (itemId: string, type: 'receive' | 'shrink') => {
    if (adjustingItems.has(itemId)) return; // prevent spam
    setAdjustingItems(prev => new Set(prev).add(itemId));
    try {
      await axios.post(`/api/admin/inventory/${itemId}/adjust`, {
        adjustment_type: type,
        qty_change: type === 'receive' ? 1 : -1,
        notes: `Quick ${type === 'receive' ? '+1' : '-1'} from Inventory Mode`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      toast.success(type === 'receive' ? '+1 received' : '-1 removed');
    } catch (error: any) {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setAdjustingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, [adjustingItems, queryClient]);

  const totalCount = rawInventory?.length ?? 0;
  const lowCount = rawInventory?.filter(i => i.qty_on_hand > 0 && i.qty_on_hand <= i.reorder_level).length ?? 0;
  const outCount = rawInventory?.filter(i => i.qty_on_hand <= 0).length ?? 0;
  const inStockCount = totalCount - outCount;

  const hasActiveFilters = categoryFilter !== 'all' || stockFilter !== 'all' || search !== '';
  const clearFilters = () => { setCategoryFilter('all'); setStockFilter('all'); setSearch(''); };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Inventory</h1>
        </div>

        {/* Summary Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="py-1.5 px-3 text-sm">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            {totalCount} items
          </Badge>
          <Badge variant="outline" className="py-1.5 px-3 text-sm text-green-700 border-green-200 bg-green-50">
            {inStockCount} in stock
          </Badge>
          {lowCount > 0 && (
            <Badge variant="outline" className="py-1.5 px-3 text-sm text-amber-700 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              {lowCount} low stock
            </Badge>
          )}
          {outCount > 0 && (
            <Badge variant="outline" className="py-1.5 px-3 text-sm text-red-700 border-red-200 bg-red-50">
              {outCount} out of stock
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Click any <strong>On Hand</strong> or <strong>Reorder Level</strong> number to edit it directly.
          Use the +/−/↺ buttons for logged adjustments.
        </p>

        {/* Filters + View Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}

          {/* View Mode Toggle */}
          <div className="ml-auto flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4 mr-1.5" />
              Table
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Inventory Mode
            </Button>
          </div>
        </div>

        {/* TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground">
                      Product {sortBy === 'name' && <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort('sku')} className="flex items-center gap-1 hover:text-foreground">
                      SKU {sortBy === 'sku' && <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">
                    <button onClick={() => toggleSort('qty')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                      On Hand {sortBy === 'qty' && <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">
                    <button onClick={() => toggleSort('available')} className="flex items-center gap-1 ml-auto hover:text-foreground">
                      Available {sortBy === 'available' && <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </TableHead>
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
                {!isLoading && inventory?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      No inventory items found.
                    </TableCell>
                  </TableRow>
                )}
                {inventory?.map((item) => {
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
        )}

        {/* CARD VIEW (Inventory Mode) */}
        {viewMode === 'cards' && (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading inventory...
              </div>
            )}
            {!isLoading && inventory?.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                No inventory items found.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inventory?.map((item) => {
                const colors = getStockColor(item.qty_on_hand, item.reorder_level);
                const isAdjusting = adjustingItems.has(item.id);

                return (
                  <Card
                    key={item.id}
                    className={`border-l-4 ${colors.border} overflow-hidden`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Product info */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.product?.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate" title={item.product?.name}>
                            {item.product?.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {item.product?.sku || '—'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.product?.category?.name || 'Uncategorized'}
                          </div>
                        </div>
                      </div>

                      {/* Stock bar + info */}
                      <div className="space-y-1.5">
                        <StockBar qty={item.qty_on_hand} reorderLevel={item.reorder_level} />
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-bold ${colors.text}`}>
                            {item.qty_on_hand} on hand
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Reorder: {item.reorder_level}
                          </span>
                        </div>
                      </div>

                      {/* Quick action buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={isAdjusting}
                          onClick={() => quickAdjust(item.id, 'shrink')}
                        >
                          {isAdjusting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Minus className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={isAdjusting}
                          onClick={() => quickAdjust(item.id, 'receive')}
                        >
                          {isAdjusting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setAdjustDialog({ item, type: 'count' })}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Count
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Adjustment Dialog (shared by both views) */}
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
