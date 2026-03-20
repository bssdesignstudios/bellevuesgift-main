import { useState, useCallback, useRef, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Search, Plus, Minus, RotateCcw, Loader2, Pencil, Check, X,
  ArrowUpDown, Package, LayoutGrid, List, History, Truck,
  AlertTriangle, Download, ScanBarcode, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

// ── Types ──

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
    barcode?: string;
    image_url?: string;
    category: { id: string; name: string } | null;
  };
}

interface Movement {
  id: string;
  product_name: string;
  sku: string;
  barcode: string;
  adjustment_type: string;
  qty_change: number;
  old_qty: number;
  new_qty: number;
  notes: string | null;
  staff_name: string | null;
  created_at: string;
}

interface ReorderItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  barcode: string;
  category: string;
  vendor: string | null;
  qty_on_hand: number;
  reorder_level: number;
  deficit: number;
  is_out: boolean;
}

interface ReceiveEntry {
  inventory_id: string;
  product_name: string;
  sku: string;
  current_qty: number;
  qty: number;
  notes: string;
}

// ── Helpers ──

function InlineEdit({ value, onSave, label }: { value: number; onSave: (v: number) => void; label: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const parsed = parseInt(draft);
    if (!isNaN(parsed) && parsed >= 0) onSave(parsed);
    setEditing(false);
  };
  const cancel = () => { setDraft(String(value)); setEditing(false); };

  if (!editing) {
    return (
      <span className="flex items-center justify-end gap-1 cursor-pointer group"
        onClick={() => { setDraft(String(value)); setEditing(true); }}
        title={`Click to edit ${label}`}>
        {value}
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
      </span>
    );
  }

  return (
    <span className="flex items-center justify-end gap-1">
      <Input type="number" min="0" value={draft} autoFocus
        className="w-20 h-7 text-right text-sm p-1"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }} />
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={commit}><Check className="h-3 w-3 text-emerald-600" /></Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancel}><X className="h-3 w-3 text-red-500" /></Button>
    </span>
  );
}

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
  if (qty <= 0) return { border: 'border-l-red-400', text: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700 border-red-200' };
  if (qty <= reorderLevel) return { border: 'border-l-amber-400', text: 'text-amber-600', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { border: 'border-l-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
}

function getStockLabel(qty: number, reorderLevel: number) {
  if (qty <= 0) return 'Out of Stock';
  if (qty <= reorderLevel) return 'Low Stock';
  return 'In Stock';
}

const ADJUSTMENT_LABELS: Record<string, { label: string; color: string }> = {
  receive: { label: 'Received', color: 'bg-emerald-100 text-emerald-700' },
  damage: { label: 'Damage', color: 'bg-red-100 text-red-700' },
  shrink: { label: 'Shrink', color: 'bg-orange-100 text-orange-700' },
  count: { label: 'Count', color: 'bg-blue-100 text-blue-700' },
  sale: { label: 'Sale', color: 'bg-purple-100 text-purple-700' },
  refund: { label: 'Refund', color: 'bg-indigo-100 text-indigo-700' },
  reserve: { label: 'Reserve', color: 'bg-gray-100 text-gray-700' },
  unreserve: { label: 'Unreserve', color: 'bg-gray-100 text-gray-600' },
};

function exportCSV(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const escape = (val: any) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = data.map(row => headers.map(h => escape(row[h])).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bellevue_${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ──

export default function AdminInventory() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const defaultMode = urlParams?.get('mode') === 'cards' ? 'cards'
    : urlParams?.get('mode') === 'reorder' ? 'reorder' : 'table';

  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'reorder'>(defaultMode);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>(urlParams?.get('stockFilter') || 'all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [adjustDialog, setAdjustDialog] = useState<{ item: InventoryItem; type: 'receive' | 'adjust' | 'count' } | null>(null);
  const [adjustingItems, setAdjustingItems] = useState<Set<string>>(new Set());
  const [showMovements, setShowMovements] = useState(false);
  const [movementProductFilter, setMovementProductFilter] = useState<string>('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');
  const [showReceiveBatch, setShowReceiveBatch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  // Movement history query
  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ['inventory-movements', movementProductFilter, movementTypeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (movementProductFilter) params.search = movementProductFilter;
      if (movementTypeFilter !== 'all') params.type = movementTypeFilter;
      const { data } = await axios.get('/api/admin/inventory/movements', { params });
      return data as Movement[];
    },
    enabled: showMovements,
  });

  // Reorder list query
  const { data: reorderItems, isLoading: reorderLoading } = useQuery({
    queryKey: ['inventory-reorder'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/inventory/reorder');
      return data as ReorderItem[];
    },
    enabled: viewMode === 'reorder',
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; qty_on_hand?: number; reorder_level?: number }) => {
      const { data } = await axios.patch(`/api/admin/inventory/${id}`, payload);
      return data as InventoryItem;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-inventory'] }); toast.success('Inventory updated'); },
    onError: (error: any) => { toast.error('Error: ' + (error.response?.data?.message || error.message)); },
  });

  const quickAdjust = useCallback(async (itemId: string, type: 'receive' | 'shrink') => {
    if (adjustingItems.has(itemId)) return;
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
      toast.error('Adjustment failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setAdjustingItems(prev => { const next = new Set(prev); next.delete(itemId); return next; });
    }
  }, [adjustingItems, queryClient]);

  const totalCount = rawInventory?.length ?? 0;
  const lowCount = rawInventory?.filter(i => i.qty_on_hand > 0 && i.qty_on_hand <= i.reorder_level).length ?? 0;
  const outCount = rawInventory?.filter(i => i.qty_on_hand <= 0).length ?? 0;
  const inStockCount = totalCount - outCount - lowCount;

  const hasActiveFilters = categoryFilter !== 'all' || stockFilter !== 'all' || search !== '';
  const clearFilters = () => { setCategoryFilter('all'); setStockFilter('all'); setSearch(''); };
  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // Auto-focus search on keyboard shortcut (/)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold">Inventory</h1>
          <div className="flex items-center gap-2">
            {/* Warehouse Actions */}
            <Button variant="outline" size="sm" onClick={() => setShowReceiveBatch(true)}>
              <Truck className="h-4 w-4 mr-1.5" />
              Receive Stock
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowMovements(true)}>
              <History className="h-4 w-4 mr-1.5" />
              Movement Log
            </Button>
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="rounded-none"
                onClick={() => setViewMode('table')}>
                <List className="h-4 w-4 mr-1.5" />Table
              </Button>
              <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="sm" className="rounded-none"
                onClick={() => setViewMode('cards')}>
                <LayoutGrid className="h-4 w-4 mr-1.5" />Cards
              </Button>
              <Button variant={viewMode === 'reorder' ? 'default' : 'ghost'} size="sm" className="rounded-none"
                onClick={() => setViewMode('reorder')}>
                <AlertTriangle className="h-4 w-4 mr-1.5" />Reorder
              </Button>
            </div>
          </div>
        </div>

        {/* STOCK FILTER BUTTONS */}
        {viewMode !== 'reorder' && (
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All', count: totalCount },
              { key: 'in', label: 'In Stock', count: inStockCount, color: 'text-emerald-700' },
              { key: 'low', label: 'Low Stock', count: lowCount, color: 'text-amber-700' },
              { key: 'out', label: 'Out of Stock', count: outCount, color: 'text-red-700' },
            ].map((f) => (
              <Button key={f.key} variant={stockFilter === f.key ? 'default' : 'outline'} size="sm"
                onClick={() => setStockFilter(f.key)}
                className={stockFilter !== f.key && f.color ? f.color : ''}>
                {f.label}
                <Badge variant="secondary"
                  className={`ml-1.5 text-xs px-1.5 py-0 ${stockFilter === f.key ? 'bg-white/20 text-inherit' : ''}`}>
                  {f.count}
                </Badge>
              </Button>
            ))}
          </div>
        )}

        {/* SEARCH + CATEGORY + CLEAR */}
        {viewMode !== 'reorder' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder='Search name, SKU, or barcode... (press "/" to focus)'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />Clear filters
              </Button>
            )}
          </div>
        )}

        {viewMode === 'table' && (
          <p className="text-sm text-muted-foreground">
            Click any <strong>On Hand</strong> or <strong>Reorder Level</strong> number to edit directly.
            Use +/−/↺ for logged adjustments.
          </p>
        )}

        {/* ═══ TABLE VIEW ═══ */}
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
                  <TableRow><TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading inventory...</div>
                  </TableCell></TableRow>
                )}
                {!isLoading && inventory?.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">No inventory items found.</TableCell></TableRow>
                )}
                {inventory?.map((item) => {
                  const available = item.qty_on_hand - item.qty_reserved;
                  const isLow = item.qty_on_hand > 0 && item.qty_on_hand <= item.reorder_level;
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
                        <InlineEdit value={item.qty_on_hand} label="On Hand"
                          onSave={(v) => updateMutation.mutate({ id: item.id, qty_on_hand: v })} />
                      </TableCell>
                      <TableCell className="text-right">{item.qty_reserved}</TableCell>
                      <TableCell className={`text-right font-bold ${available <= 0 ? 'text-red-600' : ''}`}>{available}</TableCell>
                      <TableCell className="text-right">
                        <InlineEdit value={item.reorder_level} label="Reorder Level"
                          onSave={(v) => updateMutation.mutate({ id: item.id, reorder_level: v })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" title="Receive Stock"
                            onClick={() => setAdjustDialog({ item, type: 'receive' })}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Adjustment (damage/shrink)"
                            onClick={() => setAdjustDialog({ item, type: 'adjust' })}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Cycle Count"
                            onClick={() => setAdjustDialog({ item, type: 'count' })}>
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

        {/* ═══ CARD VIEW ═══ */}
        {viewMode === 'cards' && (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />Loading inventory...
              </div>
            )}
            {!isLoading && inventory?.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">No inventory items found.</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inventory?.map((item) => {
                const colors = getStockColor(item.qty_on_hand, item.reorder_level);
                const statusLabel = getStockLabel(item.qty_on_hand, item.reorder_level);
                const isAdjusting = adjustingItems.has(item.id);
                return (
                  <Card key={item.id} className={`border-l-4 ${colors.border} overflow-hidden`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.product?.image_url ? (
                            <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate" title={item.product?.name}>{item.product?.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.product?.sku || '—'}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.product?.category?.name || 'Uncategorized'}</div>
                        </div>
                        <Badge variant="outline" className={`text-xs shrink-0 ${colors.badge}`}>{statusLabel}</Badge>
                      </div>
                      <div className="space-y-1.5">
                        <StockBar qty={item.qty_on_hand} reorderLevel={item.reorder_level} />
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-bold ${colors.text}`}>{item.qty_on_hand} on hand</span>
                          <span className="text-xs text-muted-foreground">Reorder: {item.reorder_level}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t">
                        <Button variant="outline" size="sm" className="flex-1"
                          disabled={isAdjusting || item.qty_on_hand <= 0}
                          onClick={() => quickAdjust(item.id, 'shrink')}>
                          {isAdjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Minus className="h-4 w-4 mr-1" /><span className="text-xs">-1</span></>}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1"
                          disabled={isAdjusting} onClick={() => quickAdjust(item.id, 'receive')}>
                          {isAdjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /><span className="text-xs">+1</span></>}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1"
                          onClick={() => setAdjustDialog({ item, type: 'count' })} disabled={isAdjusting}>
                          <RotateCcw className="h-4 w-4 mr-1" /><span className="text-xs">Count</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* ═══ REORDER VIEW ═══ */}
        {viewMode === 'reorder' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Items Needing Reorder
                </h2>
                <p className="text-sm text-muted-foreground">
                  {reorderItems?.length ?? 0} item{(reorderItems?.length ?? 0) !== 1 ? 's' : ''} at or below reorder level
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  if (!reorderItems?.length) return;
                  exportCSV(reorderItems.map(r => ({
                    Product: r.product_name, SKU: r.sku, Barcode: r.barcode,
                    Category: r.category, Vendor: r.vendor || '',
                    'On Hand': r.qty_on_hand, 'Reorder Level': r.reorder_level,
                    'Deficit': r.deficit, Status: r.is_out ? 'OUT' : 'LOW',
                  })), 'reorder_list');
                }}>
                  <Download className="h-4 w-4 mr-1" />Export Reorder List
                </Button>
                <Button size="sm" onClick={() => setShowReceiveBatch(true)}>
                  <Truck className="h-4 w-4 mr-1.5" />Receive Stock
                </Button>
              </div>
            </div>

            {reorderLoading && (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />Loading...
              </div>
            )}
            {!reorderLoading && reorderItems?.length === 0 && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                All stock levels are healthy. Nothing to reorder.
              </CardContent></Card>
            )}
            {!reorderLoading && reorderItems && reorderItems.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Reorder At</TableHead>
                      <TableHead className="text-right">Need</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reorderItems.map((item) => (
                      <TableRow key={item.id} className={item.is_out ? 'bg-red-50/50' : 'bg-amber-50/30'}>
                        <TableCell>
                          {item.is_out
                            ? <Badge variant="destructive" className="text-xs">OUT</Badge>
                            : <Badge className="bg-amber-500 text-white text-xs">LOW</Badge>}
                        </TableCell>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-sm">{item.sku || '—'}</TableCell>
                        <TableCell className="text-sm">{item.category}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.vendor || '—'}</TableCell>
                        <TableCell className={`text-right font-bold ${item.is_out ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.qty_on_hand}
                        </TableCell>
                        <TableCell className="text-right">{item.reorder_level}</TableCell>
                        <TableCell className="text-right font-medium text-blue-600">+{item.deficit}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm"
                            onClick={() => {
                              const invItem = rawInventory?.find(i => i.id === item.id);
                              if (invItem) setAdjustDialog({ item: invItem, type: 'receive' });
                            }}>
                            <Plus className="h-3 w-3 mr-1" />Receive
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* ═══ ADJUSTMENT DIALOG ═══ */}
        <Dialog open={!!adjustDialog} onOpenChange={() => setAdjustDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {adjustDialog?.type === 'receive' && 'Receive Stock'}
                {adjustDialog?.type === 'adjust' && 'Inventory Adjustment'}
                {adjustDialog?.type === 'count' && 'Physical Count'}
              </DialogTitle>
            </DialogHeader>
            {adjustDialog && (
              <AdjustmentForm item={adjustDialog.item} type={adjustDialog.type}
                onSuccess={() => {
                  setAdjustDialog(null);
                  queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
                  queryClient.invalidateQueries({ queryKey: ['inventory-reorder'] });
                }} />
            )}
          </DialogContent>
        </Dialog>

        {/* ═══ STOCK MOVEMENT HISTORY DIALOG ═══ */}
        <Dialog open={showMovements} onOpenChange={setShowMovements}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Stock Movement History
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search product, SKU, barcode..."
                    value={movementProductFilter}
                    onChange={(e) => setMovementProductFilter(e.target.value)}
                    className="pl-10" />
                </div>
                <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="receive">Received</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="shrink">Shrink</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => {
                  if (!movements?.length) return;
                  exportCSV(movements.map(m => ({
                    Date: format(new Date(m.created_at), 'yyyy-MM-dd HH:mm'),
                    Product: m.product_name, SKU: m.sku,
                    Type: m.adjustment_type, Change: m.qty_change,
                    'Old Qty': m.old_qty, 'New Qty': m.new_qty,
                    Staff: m.staff_name || '', Notes: m.notes || '',
                  })), 'stock_movements');
                }}>
                  <Download className="h-4 w-4 mr-1" />CSV
                </Button>
              </div>

              {movementsLoading && (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />Loading movements...
                </div>
              )}
              {!movementsLoading && movements && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                        <TableHead className="text-right">Before</TableHead>
                        <TableHead className="text-right">After</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No movements found
                        </TableCell></TableRow>
                      )}
                      {movements.map((m) => {
                        const typeInfo = ADJUSTMENT_LABELS[m.adjustment_type] || { label: m.adjustment_type, color: 'bg-gray-100 text-gray-600' };
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {format(new Date(m.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="font-medium text-sm">{m.product_name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{m.sku || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</Badge>
                            </TableCell>
                            <TableCell className={`text-right font-bold ${m.qty_change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {m.qty_change > 0 ? '+' : ''}{m.qty_change}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{m.old_qty}</TableCell>
                            <TableCell className="text-right font-medium">{m.new_qty}</TableCell>
                            <TableCell className="text-sm">{m.staff_name || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={m.notes || ''}>
                              {m.notes || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══ BATCH RECEIVE DIALOG ═══ */}
        <Dialog open={showReceiveBatch} onOpenChange={setShowReceiveBatch}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" />
                Receive Stock
              </DialogTitle>
            </DialogHeader>
            <BatchReceiveForm
              inventory={rawInventory || []}
              onSuccess={() => {
                setShowReceiveBatch(false);
                queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
                queryClient.invalidateQueries({ queryKey: ['inventory-reorder'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

// ── Adjustment Form ──

function AdjustmentForm({ item, type, onSuccess }: { item: InventoryItem; type: 'receive' | 'adjust' | 'count'; onSuccess: () => void }) {
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('remove');
  const [reason, setReason] = useState<string>('shrink');

  const mutation = useMutation({
    mutationFn: async () => {
      let amount = parseInt(qty);
      let adjType: string;

      if (type === 'receive') {
        adjType = 'receive';
      } else if (type === 'count') {
        amount = amount - item.qty_on_hand;
        adjType = 'count';
      } else {
        if (adjustType === 'remove') {
          amount = -amount;
          adjType = reason; // shrink, damage
        } else {
          adjType = 'receive';
        }
      }

      await axios.post(`/api/admin/inventory/${item.id}/adjust`, {
        adjustment_type: adjType,
        qty_change: amount,
        notes,
      });
    },
    onSuccess: () => { toast.success('Inventory updated'); onSuccess(); },
    onError: (error: any) => { toast.error('Error: ' + (error.response?.data?.message || error.message)); },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="p-3 bg-muted rounded-md">
        <div className="font-medium">{item.product?.name}</div>
        <div className="text-sm text-muted-foreground font-mono">{item.product?.sku}</div>
        <div className="text-sm text-muted-foreground">
          Current: {item.qty_on_hand} on hand · {item.qty_reserved} reserved · {item.qty_on_hand - item.qty_reserved} available
        </div>
      </div>

      {type === 'adjust' && (
        <>
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'add' | 'remove')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Stock (Receive)</SelectItem>
                <SelectItem value="remove">Remove Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {adjustType === 'remove' && (
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shrink">Shrinkage / Loss</SelectItem>
                  <SelectItem value="damage">Damage / Breakage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        <Label>
          {type === 'receive' && 'How many units received?'}
          {type === 'adjust' && 'Quantity'}
          {type === 'count' && 'Enter actual count from physical inventory'}
        </Label>
        <Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)}
          placeholder={type === 'count' ? String(item.qty_on_hand) : '0'} required autoFocus />
        {type === 'count' && qty && !isNaN(parseInt(qty)) && (
          <p className="text-xs text-muted-foreground">
            Change: {parseInt(qty) - item.qty_on_hand >= 0 ? '+' : ''}{parseInt(qty) - item.qty_on_hand} units
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder={type === 'receive' ? 'e.g. Supplier delivery, PO #...' : 'Reason for adjustment...'} />
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : type === 'receive' ? 'Confirm Receiving' : 'Save Adjustment'}
      </Button>
    </form>
  );
}

// ── Batch Receive Form ──

function BatchReceiveForm({ inventory, onSuccess }: { inventory: InventoryItem[]; onSuccess: () => void }) {
  const [entries, setEntries] = useState<ReceiveEntry[]>([]);
  const [batchNotes, setBatchNotes] = useState('');
  const [scanInput, setScanInput] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);

  // Add item by scanning or searching
  const addItem = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    const match = inventory.find(i =>
      i.product?.sku?.toLowerCase() === q ||
      i.product?.barcode?.toLowerCase() === q ||
      i.product?.name?.toLowerCase().includes(q)
    );

    if (!match) {
      toast.error(`No product found for "${query}"`);
      return;
    }

    // If already in list, increment qty
    const existing = entries.findIndex(e => e.inventory_id === match.id);
    if (existing >= 0) {
      setEntries(prev => prev.map((e, i) => i === existing ? { ...e, qty: e.qty + 1 } : e));
      toast.success(`+1 ${match.product.name} (now ${entries[existing].qty + 1})`);
    } else {
      setEntries(prev => [...prev, {
        inventory_id: match.id,
        product_name: match.product.name,
        sku: match.product.sku,
        current_qty: match.qty_on_hand,
        qty: 1,
        notes: '',
      }]);
      toast.success(`Added ${match.product.name}`);
    }
    setScanInput('');
    scanRef.current?.focus();
  };

  const updateEntry = (idx: number, field: keyof ReceiveEntry, value: any) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const removeEntry = (idx: number) => {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      await axios.post('/api/admin/inventory/batch-receive', {
        items: entries.map(e => ({
          inventory_id: e.inventory_id,
          qty: e.qty,
          notes: e.notes || undefined,
        })),
        batch_notes: batchNotes || undefined,
      });
    },
    onSuccess: () => {
      toast.success(`${entries.length} item(s) received successfully`);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
    },
  });

  return (
    <div className="space-y-4">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-sm text-emerald-800">
          <strong>Scan or type</strong> a barcode, SKU, or product name to add items. Each scan adds +1 to the quantity.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={scanRef}
            placeholder="Scan barcode or type SKU / product name..."
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(scanInput); } }}
            className="pl-10"
            autoFocus
          />
        </div>
        <Button variant="outline" onClick={() => addItem(scanInput)} disabled={!scanInput.trim()}>
          <Plus className="h-4 w-4 mr-1" />Add
        </Button>
      </div>

      {entries.length > 0 && (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right w-24">Receiving</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, idx) => (
                  <TableRow key={entry.inventory_id}>
                    <TableCell className="font-medium">{entry.product_name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{entry.sku}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{entry.current_qty}</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min="1" value={entry.qty}
                        className="w-20 h-8 text-right ml-auto"
                        onChange={(e) => updateEntry(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))} />
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {entry.current_qty + entry.qty}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeEntry(idx)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <Label>Batch Notes (optional)</Label>
            <Textarea value={batchNotes} onChange={(e) => setBatchNotes(e.target.value)}
              placeholder="e.g. Supplier delivery from ABC Corp, Invoice #1234..." />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              {entries.length} product{entries.length !== 1 ? 's' : ''} ·{' '}
              {entries.reduce((s, e) => s + e.qty, 0)} total units
            </span>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Processing...</> : <><Truck className="h-4 w-4 mr-1" />Confirm Receiving</>}
            </Button>
          </div>
        </>
      )}

      {entries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Scan or search for products to start receiving</p>
        </div>
      )}
    </div>
  );
}
