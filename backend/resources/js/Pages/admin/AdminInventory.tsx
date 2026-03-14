import { useState } from 'react';
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
import { Search, Plus, Minus, RotateCcw, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoModeEnabled } from '@/lib/demoSession';
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
    category: { name: string } | null;
  };
}

export default function AdminInventory() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [adjustDialog, setAdjustDialog] = useState<{ item: InventoryItem; type: 'receive' | 'adjust' | 'count' } | null>(null);
  const queryClient = useQueryClient();
  const { effectiveStaff } = useAuth();
  const isDemoMode = isDemoModeEnabled();

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['admin-inventory', search, filter, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        // Use demo data instead of DB if in demo mode and no data
        return [
          {
            id: '1', product_id: 'p1', location: 'Section A', qty_on_hand: 3, qty_reserved: 0, reorder_level: 5,
            product: { id: 'p1', name: 'iPhone 15 Pro 256GB', sku: 'PHN-APP-15P-256', category: { name: 'Electronics' } }
          },
          {
            id: '2', product_id: 'p2', location: 'Section B', qty_on_hand: 15, qty_reserved: 2, reorder_level: 10,
            product: { id: 'p2', name: 'Samsung 55" 4K Smart TV', sku: 'TV-SAM-55-4K', category: { name: 'Electronics' } }
          },
          {
            id: '3', product_id: 'p3', location: 'Section C', qty_on_hand: 2, qty_reserved: 1, reorder_level: 5,
            product: { id: 'p3', name: 'Apple MacBook Air M2', sku: 'LAP-APP-MBA-M2', category: { name: 'Computers' } }
          },
          {
            id: '4', product_id: 'p4', location: 'Section A', qty_on_hand: 24, qty_reserved: 5, reorder_level: 10,
            product: { id: 'p4', name: 'Sony WH-1000XM5 Headphones', sku: 'AUD-SNY-WH5', category: { name: 'Audio' } }
          }
        ].filter(item => {
          if (filter === 'low') return item.qty_on_hand < item.reorder_level;
          if (search) return item.product.name.toLowerCase().includes(search.toLowerCase()) || item.product.sku.toLowerCase().includes(search.toLowerCase());
          return true;
        }) as InventoryItem[];
      }

      const response = await axios.get('/api/admin/inventory', { params: { search, filter } });
      return response.data as InventoryItem[];
    }
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Inventory</h1>

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
          <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'low')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
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
                <TableHead></TableHead>
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
                const isLow = item.qty_on_hand < item.reorder_level;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product?.name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.product?.sku}</TableCell>
                    <TableCell>{item.product?.category?.name || '-'}</TableCell>
                    <TableCell className={`text-right ${isLow ? 'text-warning font-bold' : ''}`}>
                      {item.qty_on_hand}
                    </TableCell>
                    <TableCell className="text-right">{item.qty_reserved}</TableCell>
                    <TableCell className="text-right font-bold">{available}</TableCell>
                    <TableCell className="text-right">{item.reorder_level}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
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
                          title="Adjustment"
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
                staffId={effectiveStaff?.id}
                isDemoMode={isDemoMode}
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
  staffId,
  isDemoMode,
  onSuccess,
}: {
  item: InventoryItem;
  type: 'receive' | 'adjust' | 'count';
  staffId?: string;
  isDemoMode: boolean;
  onSuccess: () => void;
}) {
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('remove');
  const queryClient = useQueryClient(); // Added queryClient for invalidation

  const mutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return;
      }

      let amount = parseInt(qty);
      if (type === 'adjust' && adjustType === 'remove') {
        amount = -amount;
      } else if (type === 'count') {
        amount = amount - item.qty_on_hand;
      }

      await axios.post(`/api/admin/inventory/${item.id}/adjust`, {
        adjustment_type: type === 'count' ? 'count' : (type === 'receive' ? 'receive' : 'damage'), // simple mapping
        qty_change: amount,
        notes
      });
    },
    onSuccess: () => {
      toast.success('Inventory updated');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
    }
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="p-3 bg-muted rounded-md">
        <div className="font-medium">{item.product?.name}</div>
        <div className="text-sm text-muted-foreground">
          Current: {item.qty_on_hand} on hand, {item.qty_reserved} reserved
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
              <SelectItem value="add">Add Stock</SelectItem>
              <SelectItem value="remove">Remove Stock (Damage/Shrink)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>
          {type === 'receive' && 'Quantity to Receive'}
          {type === 'adjust' && 'Quantity to Adjust'}
          {type === 'count' && 'Counted Quantity'}
        </Label>
        <Input
          type="number"
          min="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          required
        />
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
