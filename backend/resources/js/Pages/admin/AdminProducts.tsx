import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Product, Category, Vendor } from '@/types';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const isWarehouse = staff?.role === 'warehouse';
  const canManageProducts = staff?.role === 'admin' || staff?.role === 'warehouse_manager' || staff?.role === 'warehouse';

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products', search],
    queryFn: async () => {
      const response = await axios.get('/api/admin/products', { params: { search } });
      return response.data as Product[];
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/categories');
      return response.data as Category[];
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await axios.patch(`/api/admin/products/${id}/toggle-active`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    }
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted');
    }
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Products</h1>
          {canManageProducts && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditProduct(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                </DialogHeader>
                <ProductForm
                  product={editProduct}
                  categories={categories || []}
                  onSuccess={() => {
                    setIsDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Sale</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell>{product.category?.name}</TableCell>
                  <TableCell className="text-right">${Number(product.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-success">
                    {product.sale_price ? `$${Number(product.sale_price).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.inventory?.qty_on_hand || 0}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.is_active}
                      disabled={!canManageProducts}
                      onCheckedChange={(checked) =>
                        toggleActive.mutate({ id: product.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditProduct(product);
                          setIsDialogOpen(true);
                        }}
                      >
                        {canManageProducts ? <Pencil className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                      </Button>
                      {canManageProducts && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Delete this product?')) {
                              deleteProduct.mutate(product.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}

function ProductForm({
  product,
  categories,
  onSuccess
}: {
  product: Product | null;
  categories: Category[];
  onSuccess: () => void;
}) {
  const { staff } = useAuth();
  const canManageProducts = staff?.role === 'admin' || staff?.role === 'warehouse_manager' || staff?.role === 'warehouse';
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
    queryFn: async () => {
      const response = await axios.get('/api/admin/vendors', { params: { search: vendorSearch } });
      return response.data as Vendor[];
    },
    enabled: vendorSearch.length >= 2,
  });

  // Automatically update Price when Cost or Markup changes
  useEffect(() => {
    const costValue = parseFloat(form.cost);
    const markupValue = parseFloat(form.markup_percentage);

    if (!isNaN(costValue) && !isNaN(markupValue)) {
      const calculatedPrice = costValue + (costValue * markupValue / 100);
      setForm(prev => ({ ...prev, price: calculatedPrice.toFixed(2) }));
    }
  }, [form.cost, form.markup_percentage]);

  // Dynamic SKU generation based on category
  const handleCategoryChange = (val: string) => {
    const cat = categories.find(c => c.id === val);
    let newSku = form.sku;

    // Only auto-generate SKU for NEW products if SKU is empty
    if (!product && cat?.sku_prefix) {
      const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const timestamp = Date.now().toString().slice(-4);
      newSku = `${cat.sku_prefix}-${randomId}${timestamp}`;
    }

    setForm({ ...form, category_id: val, sku: newSku });
  };

  const createVendorMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await axios.post('/api/admin/vendors', { name });
      return response.data as Vendor;
    },
    onSuccess: (newVendor) => {
      setForm(prev => ({ ...prev, vendor_id: newVendor.id, vendor: newVendor.name }));
      setVendorSearch(newVendor.name);
      toast.success('New vendor added');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const data = {
        name: form.name,
        slug,
        sku: form.sku,
        barcode: form.barcode || null,
        category_id: form.category_id || null,
        vendor_id: form.vendor_id || null, // Link to the table
        vendor: form.vendor || null,        // Keep string for legacy/display
        cost: form.cost ? parseFloat(form.cost) : null,
        markup_percentage: form.markup_percentage ? parseFloat(form.markup_percentage) : null,
        description: form.description || null,
        price: parseFloat(form.price),
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        image_url: form.image_url || null,
        is_active: form.is_active,
      };

      if (product) {
        await axios.put(`/api/admin/products/${product.id}`, data);
      } else {
        await axios.post('/api/admin/products', data);
      }
    },
    onSuccess: () => {
      toast.success(product ? 'Product updated' : 'Product created');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4 max-h-[85vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={form.category_id} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Vendor</Label>
          <div className="relative">
            <Input
              value={vendorSearch}
              onChange={(e) => {
                setVendorSearch(e.target.value);
                setForm(prev => ({ ...prev, vendor: e.target.value, vendor_id: '' }));
              }}
              placeholder="Search or type new vendor..."
            />
            {vendorSearch.length >= 2 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                {vendors?.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                    onClick={() => {
                      setForm(prev => ({ ...prev, vendor_id: v.id, vendor: v.name }));
                      setVendorSearch(v.name);
                    }}
                  >
                    {v.name}
                  </button>
                ))}
                {vendorSearch.length >= 3 && !vendors?.some(v => v.name.toLowerCase() === vendorSearch.toLowerCase()) && (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-brand-blue/10 text-brand-blue text-sm font-medium border-t flex items-center gap-2"
                    onClick={() => createVendorMutation.mutate(vendorSearch)}
                    disabled={createVendorMutation.isPending}
                  >
                    <Plus className="h-3 w-3" />
                    Add "{vendorSearch}" to Vendor List
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t pt-4">
        <div className="space-y-2">
          <Label>Cost ($)</Label>
          <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Margin (%)</Label>
          <Select value={form.markup_percentage} onValueChange={(v) => setForm({ ...form, markup_percentage: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select margin" />
            </SelectTrigger>
            <SelectContent>
              {[0, 25, 50, 75, 100, 150, 200, 300].map(val => (
                <SelectItem key={val} value={val.toString()}>{val}%</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 text-brand-blue font-bold">
          <Label className="text-brand-blue">Final Price ($)</Label>
          <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="border-brand-blue/30" />
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

      <div className="flex items-center gap-2">
        <Switch checked={form.is_active} disabled={!canManageProducts} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
        <Label>Active</Label>
      </div>

      {canManageProducts ? (
        <Button type="submit" className="w-full h-12 text-lg" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
        </Button>
      ) : (
        <Button type="button" variant="outline" className="w-full h-12 text-lg" onClick={onSuccess}>
          Close (View Only)
        </Button>
      )}
    </form>
  );
}
