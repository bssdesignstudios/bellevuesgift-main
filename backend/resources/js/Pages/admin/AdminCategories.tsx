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
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
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

  const { data: categories } = useQuery({
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
      // Search filter
      if (searchQuery && !cat.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Status filter
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

        {/* Search + Filters */}
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
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none capitalize"
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead className="text-center">Sort Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No categories match your filters.'
                      : 'No categories yet.'}
                  </TableCell>
                </TableRow>
              )}
              {filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">
                      <Package className="h-3 w-3 mr-1" />
                      {category.products_count ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{category.sort_order}</TableCell>
                  <TableCell>
                    <Switch
                      checked={category.is_active}
                      onCheckedChange={(checked) =>
                        toggleActive.mutate({ id: category.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditCategory(category);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Delete this category?')) {
                            deleteCategory.mutate(category.id);
                          }
                        }}
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
    sort_order: category?.sort_order?.toString() || '0',
    is_active: category?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
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

      <div className="space-y-2">
        <Label>Slug</Label>
        <Input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="auto-generated from name"
        />
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
