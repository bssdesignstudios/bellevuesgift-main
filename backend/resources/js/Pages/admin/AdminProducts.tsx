import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, AlertTriangle, XCircle, Package, PowerOff } from 'lucide-react';
import { Product, Category, Vendor } from '@/types';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { cn } from '@/lib/utils';

interface ProductSummary {
  total: number;
  low_stock: number;
  out_of_stock: number;
  inactive: number;
}

interface PaginatedProducts {
  data: Product[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  summary: ProductSummary;
}

// ─── Visual stock badge ───────────────────────────────────────────────────────
function StockBadge({ qty, reorderLevel }: { qty: number; reorderLevel?: number }) {
  if (qty <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
        <XCircle className="h-3 w-3" /> Out of Stock
      </span>
    );
  }
  if (reorderLevel && qty <= reorderLevel) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
        <AlertTriangle className="h-3 w-3" /> Low: {qty}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {qty} In Stock
    </span>
  );
}

// ─── Metric card (clickable to set filter) ────────────────────────────────────
function MetricCard({
  label, value, icon: Icon, color, active, onClick,
}: {
  label: string; value: number; icon: any; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 min-w-[140px] p-4 rounded-xl border-2 text-left transition-all',
        active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-white hover:border-primary/40 hover:shadow-sm',
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className={cn('text-2xl font-bold', color)}>{value.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
        <Icon className={cn('h-5 w-5 mt-0.5 opacity-60', color)} />
      </div>
    </button>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap',
        active
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [categoryId, stockStatus, isActive]);

  const { data: paginated, isLoading } = useQuery<PaginatedProducts>({
    queryKey: ['admin-products', debouncedSearch, categoryId, stockStatus, isActive, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 25 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryId) params.category_id = categoryId;
      if (stockStatus) params.stock_status = stockStatus;
      if (isActive !== '') params.is_active = isActive;
      const res = await axios.get('/api/admin/products', { params });
      return res.data as PaginatedProducts;
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => (await axios.get('/api/admin/categories')).data as Category[],
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await axios.put(`/api/admin/products/${id}`, { is_active });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => { await axios.delete(`/api/admin/products/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted');
    },
  });

  const products = paginated?.data ?? [];
  const summary = paginated?.summary;
  const totalPages = paginated?.last_page ?? 1;
  const filteredTotal = paginated?.total ?? 0;

  // Quick-filter handlers
  const setQuickFilter = (ss: string, active: string) => {
    setStockStatus(ss); setIsActive(active); setCategoryId('');
  };
  const clearAll = () => { setSearch(''); setDebouncedSearch(''); setStockStatus(''); setIsActive(''); setCategoryId(''); setPage(1); };
  const hasFilter = !!(debouncedSearch || stockStatus || isActive !== '' || categoryId);

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Products</h1>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditProduct(null)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                </DialogHeader>
                <ProductForm
                  product={editProduct}
                  categories={categories || []}
                  onSuccess={() => { setIsDialogOpen(false); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Metric cards */}
        {summary && (
          <div className="flex flex-wrap gap-3">
            <MetricCard
              label="Total Products" value={summary.total} icon={Package} color="text-slate-700"
              active={!stockStatus && isActive === ''} onClick={clearAll}
            />
            <MetricCard
              label="Low Stock" value={summary.low_stock} icon={AlertTriangle} color="text-orange-600"
              active={stockStatus === 'low_stock'} onClick={() => setQuickFilter('low_stock', '')}
            />
            <MetricCard
              label="Out of Stock" value={summary.out_of_stock} icon={XCircle} color="text-red-600"
              active={stockStatus === 'out_of_stock'} onClick={() => setQuickFilter('out_of_stock', '')}
            />
            <MetricCard
              label="Inactive" value={summary.inactive} icon={PowerOff} color="text-slate-400"
              active={isActive === 'false'} onClick={() => setQuickFilter('', 'false')}
            />
          </div>
        )}

        {/* Search + filter pills */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Pill label="All" active={!stockStatus && isActive === '' && !categoryId} onClick={clearAll} />
            <Pill label="⚠️ Low Stock" active={stockStatus === 'low_stock'} onClick={() => setQuickFilter('low_stock', '')} />
            <Pill label="❌ Out of Stock" active={stockStatus === 'out_of_stock'} onClick={() => setQuickFilter('out_of_stock', '')} />
            <Pill label="✅ In Stock" active={stockStatus === 'in_stock'} onClick={() => setQuickFilter('in_stock', '')} />
            <Pill label="Active" active={isActive === 'true'} onClick={() => setQuickFilter('', 'true')} />
            <Pill label="Inactive" active={isActive === 'false'} onClick={() => setQuickFilter('', 'false')} />

            {/* Category pills */}
            {categories?.map(cat => (
              <Pill
                key={cat.id}
                label={cat.name}
                active={categoryId === cat.id}
                onClick={() => { setCategoryId(categoryId === cat.id ? '' : cat.id); setStockStatus(''); setIsActive(''); setPage(1); }}
              />
            ))}

            {hasFilter && (
              <button onClick={clearAll} className="text-xs text-muted-foreground underline ml-1 hover:text-foreground">
                Clear all
              </button>
            )}
          </div>

          {hasFilter && (
            <p className="text-sm text-muted-foreground">{filteredTotal} result{filteredTotal !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[40%]">Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No products found
                  </TableCell>
                </TableRow>
              ) : products.map((product) => {
                const qty = product.inventory?.qty_on_hand ?? 0;
                const reorder = product.inventory?.reorder_level ?? 0;
                return (
                  <TableRow key={product.id} className={cn('group', !product.is_active && 'opacity-60')}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover border flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium leading-tight">{product.name}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{product.sku}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{product.category?.name ?? <span className="text-muted-foreground">—</span>}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(product.price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <StockBadge qty={qty} reorderLevel={reorder} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: product.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setEditProduct(product); setIsDialogOpen(true); }}
                          className="h-8 px-2"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm('Delete this product?')) deleteProduct.mutate(product.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
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
      </div>
    </AdminLayout>
  );
}

// ─── Product form (unchanged logic, same fields) ──────────────────────────────
function ProductForm({ product, categories, onSuccess }: {
  product: Product | null; categories: Category[]; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    category_id: product?.category_id || '',
    vendor_id: product?.vendor_id || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    sale_price: product?.sale_price?.toString() || '',
    cost: product?.cost?.toString() || '',
    markup_percentage: product?.markup_percentage?.toString() || '100',
    vendor: product?.vendor || '',
    image_url: product?.image_url || '',
    is_active: product?.is_active ?? true,
  });

  const [vendorSearch, setVendorSearch] = useState(product?.vendor || '');
  const queryClient = useQueryClient();

  const { data: vendors } = useQuery({
    queryKey: ['vendors', vendorSearch],
    queryFn: async () => (await axios.get('/api/vendors', { params: { search: vendorSearch } })).data as Vendor[],
    enabled: vendorSearch.length >= 2,
  });

  useEffect(() => {
    const cost = parseFloat(form.cost);
    const markup = parseFloat(form.markup_percentage);
    if (!isNaN(cost) && !isNaN(markup)) {
      setForm(prev => ({ ...prev, price: (cost + (cost * markup / 100)).toFixed(2) }));
    }
  }, [form.cost, form.markup_percentage]);

  const handleCategoryChange = (val: string) => {
    const cat = categories.find(c => c.id === val);
    let sku = form.sku;
    if (!product && (cat as any)?.sku_prefix) {
      sku = `${(cat as any).sku_prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`;
    }
    setForm({ ...form, category_id: val, sku });
  };

  const createVendor = useMutation({
    mutationFn: async (name: string) => (await axios.post('/api/vendors', { name })).data as Vendor,
    onSuccess: (v) => {
      setForm(prev => ({ ...prev, vendor_id: v.id, vendor: v.name }));
      setVendorSearch(v.name);
      toast.success('Vendor added');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: form.name,
        slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sku: form.sku, barcode: form.barcode || null,
        category_id: form.category_id || null, vendor_id: form.vendor_id || null,
        vendor: form.vendor || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        markup_percentage: form.markup_percentage ? parseFloat(form.markup_percentage) : null,
        description: form.description || null,
        price: parseFloat(form.price),
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        image_url: form.image_url || null,
        is_active: form.is_active,
      };
      if (product) await axios.put(`/api/admin/products/${product.id}`, data);
      else await axios.post('/api/admin/products', data);
    },
    onSuccess: () => { toast.success(product ? 'Updated' : 'Created'); onSuccess(); },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={form.category_id} onValueChange={handleCategoryChange}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>SKU</Label>
          <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Barcode</Label>
          <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Vendor</Label>
        <div className="relative">
          <Input
            value={vendorSearch}
            onChange={(e) => { setVendorSearch(e.target.value); setForm(p => ({ ...p, vendor: e.target.value, vendor_id: '' })); }}
            placeholder="Search or type vendor name..."
          />
          {vendorSearch.length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
              {vendors?.map(v => (
                <button key={v.id} type="button" className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                  onClick={() => { setForm(p => ({ ...p, vendor_id: v.id, vendor: v.name })); setVendorSearch(v.name); }}>
                  {v.name}
                </button>
              ))}
              {vendorSearch.length >= 3 && !vendors?.some(v => v.name.toLowerCase() === vendorSearch.toLowerCase()) && (
                <button type="button" className="w-full text-left px-3 py-2 hover:bg-primary/5 text-primary text-sm font-medium border-t flex gap-2"
                  onClick={() => createVendor.mutate(vendorSearch)} disabled={createVendor.isPending}>
                  <Plus className="h-4 w-4" /> Add "{vendorSearch}"
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t pt-4">
        <div className="space-y-2">
          <Label>Cost ($)</Label>
          <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Markup (%)</Label>
          <Select value={form.markup_percentage} onValueChange={(v) => setForm({ ...form, markup_percentage: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0, 25, 50, 75, 100, 150, 200, 300].map(v => <SelectItem key={v} value={String(v)}>{v}%</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-primary font-semibold">Price ($)</Label>
          <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sale Price ($)</Label>
          <Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Image URL</Label>
          <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
        <Label>Active (visible in POS and storefront)</Label>
      </div>

      <Button type="submit" className="w-full h-11" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
      </Button>
    </form>
  );
}
