import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Plus, Minus, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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

  const { data: inventory } = useQuery({
    queryKey: ['admin-inventory', search, filter],
    queryFn: async () => {
      let query = supabase
        .from('inventory')
        .select('*, product:products(id, name, sku, category:categories(name))')
        .order('qty_on_hand', { ascending: true });

      if (filter === 'low') {
        query = query.lt('qty_on_hand', 10);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let results = data as InventoryItem[];
      
      if (search) {
        results = results.filter(item => 
          item.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
          item.product?.sku?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return results;
    }
  });

  return (
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
              onSuccess={() => {
                setAdjustDialog(null);
                queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdjustmentForm({
  item,
  type,
  staffId,
  onSuccess,
}: {
  item: InventoryItem;
  type: 'receive' | 'adjust' | 'count';
  staffId?: string;
  onSuccess: () => void;
}) {
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('remove');

  const mutation = useMutation({
    mutationFn: async () => {
      let qtyChange = parseInt(qty);
      let newQty = item.qty_on_hand;

      if (type === 'receive') {
        newQty = item.qty_on_hand + qtyChange;
      } else if (type === 'adjust') {
        qtyChange = adjustType === 'add' ? qtyChange : -qtyChange;
        newQty = item.qty_on_hand + qtyChange;
      } else if (type === 'count') {
        qtyChange = qtyChange - item.qty_on_hand;
        newQty = parseInt(qty);
      }

      // Update inventory
      const { error: invError } = await supabase
        .from('inventory')
        .update({ qty_on_hand: newQty, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (invError) throw invError;

      // Create adjustment record
      const { error: adjError } = await supabase
        .from('inventory_adjustments')
        .insert({
          product_id: item.product_id,
          adjustment_type: type,
          qty_change: qtyChange,
          staff_id: staffId,
          notes,
        });

      if (adjError) throw adjError;
    },
    onSuccess: () => {
      toast.success('Inventory updated');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
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
