import { useState } from 'react';
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
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Category } from '@/types';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface CategoryWithCount extends Category {
  products_count: number;
}

export default function AdminCategories() {
  const [editCategory, setEditCategory] = useState<CategoryWithCount | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: categories } = useQuery<CategoryWithCount[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/categories');
      return response.data as CategoryWithCount[];
    }
  });

  const filtered = (categories ?? []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await axios.put(`/api/admin/categories/${id}`, { is_active });
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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-sm text-muted-foreground">{categories?.length ?? 0} categories</p>
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

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Sort Order</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No categories found
                  </TableCell>
                </TableRow>
              ) : filtered.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="font-mono text-sm">{category.slug}</TableCell>
                  <TableCell className="text-center">{category.sort_order}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{category.products_count ?? 0}</Badge>
                  </TableCell>
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
                          if (category.products_count > 0) {
                            toast.error(`Cannot delete — ${category.products_count} products use this category`);
                            return;
                          }
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
