import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Package, FolderOpen, X } from 'lucide-react';
import { Category } from '@/types';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface CategoryWithCount extends Category {
  products_count?: number;
}

export default function AdminCategories() {
  const [editCategory, setEditCategory] = useState<CategoryWithCount | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/categories');
      return response.data as CategoryWithCount[];
    }
  });

  // Client-side filtering — clean implementation, easy to upgrade to server-side by
  // adding `search` and `status` params to the API query
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter((cat) => {
      if (searchQuery && !cat.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter === 'active' && !cat.is_active) return false;
      if (statusFilter === 'inactive' && cat.is_active) return false;
      return true;
    });
  }, [categories, searchQuery, statusFilter]);

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await axios.patch(`/api/admin/categories/${id}/toggle-active`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Status updated');
    }
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/admin/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category deleted');
    }
  });

  const totalProducts = categories?.reduce((sum, cat) => sum + (cat.products_count ?? 0), 0) ?? 0;
  const activeCount = categories?.filter(c => c.is_active).length ?? 0;
  const inactiveCount = (categories?.length ?? 0) - activeCount;
  const hasFilters = searchQuery !== '' || statusFilter !== 'all';

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {categories?.length ?? 0} categories · {totalProducts} products
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditCategory(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
              </DialogHeader>
              <CategoryForm
                category={editCategory}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + Status Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center border rounded-lg overflow-hidden">
            {([
              { key: 'all' as const, label: 'All', count: categories?.length ?? 0 },
              { key: 'active' as const, label: 'Active', count: activeCount },
              { key: 'inactive' as const, label: 'Inactive', count: inactiveCount },
            ]).map((f) => (
              <Button
                key={f.key}
                variant={statusFilter === f.key ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
                <Badge variant="secondary" className={`ml-1.5 text-xs px-1.5 py-0 ${statusFilter === f.key ? 'bg-white/20 text-inherit' : ''}`}>
                  {f.count}
                </Badge>
              </Button>
            ))}
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">SKU Prefix</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead className="text-center">Sort</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Loading categories...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {hasFilters
                      ? 'No categories match your filters.'
                      : 'No categories yet. Create one to get started.'}
                  </TableCell>
                </TableRow>
              )}
              {filteredCategories.map((category) => (
                <TableRow key={category.id} className={!category.is_active ? 'opacity-60' : ''}>
                  <TableCell>
                    <span className="font-medium">{category.name}</span>
                    {category.slug && (
                      <span className="text-xs text-muted-foreground ml-2 font-mono">/{category.slug}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(category as any).sku_prefix ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {(category as any).sku_prefix}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">
                      <Package className="h-3 w-3 mr-1" />
                      {category.products_count ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-muted-foreground">{category.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: category.id, is_active: checked })
                        }
                      />
                      <span className={`text-xs ${category.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditCategory(category);
                          setIsDialogOpen(true);
                        }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Delete this category? Products in this category will become uncategorized.')) {
                            deleteCategory.mutate(category.id);
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

function CategoryForm({
  category,
  onSuccess
}: {
  category: Category | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    sku_prefix: (category as any)?.sku_prefix || '',
    sort_order: category?.sort_order?.toString() || '0',
    is_active: category?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sku_prefix: form.sku_prefix || null,
        sort_order: parseInt(form.sort_order) || 0,
        is_active: form.is_active,
      };

      if (category) {
        await axios.put(`/api/admin/categories/${category.id}`, data);
      } else {
        await axios.post('/api/admin/categories', data);
      }
    },
    onSuccess: () => {
      toast.success(category ? 'Category updated' : 'Category created');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="auto-generated from name"
          />
        </div>
        <div className="space-y-2">
          <Label>SKU Prefix</Label>
          <Input
            value={form.sku_prefix}
            onChange={(e) => setForm({ ...form, sku_prefix: e.target.value.toUpperCase() })}
            placeholder="e.g. ELEC, ACCS"
            maxLength={10}
          />
          <p className="text-xs text-muted-foreground">Used to auto-generate product SKUs</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sort Order</Label>
        <Input
          type="number"
          value={form.sort_order}
          onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
        <Label>Active</Label>
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : (category ? 'Update Category' : 'Create Category')}
      </Button>
    </form>
  );
}
