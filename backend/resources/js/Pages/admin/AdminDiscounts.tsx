import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Coupon, GiftCard } from '@/types';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminDiscounts() {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Discounts & Gift Cards</h1>

        <Tabs defaultValue="coupons">
          <TabsList>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="giftcards">Gift Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="coupons" className="mt-6">
            <CouponsSection />
          </TabsContent>

          <TabsContent value="giftcards" className="mt-6">
            <GiftCardsSection />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function CouponsSection() {
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: coupons } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/coupons');
      return data as Coupon[];
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await axios.put(`/api/admin/coupons/${id}/toggle`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/admin/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Coupon deleted');
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditCoupon(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editCoupon ? 'Edit Coupon' : 'Add Coupon'}</DialogTitle>
            </DialogHeader>
            <CouponForm
              coupon={editCoupon}
              onSuccess={() => {
                setIsDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons?.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                <TableCell className="capitalize">{coupon.discount_type}</TableCell>
                <TableCell>
                  {coupon.discount_type === 'percent' ? `${coupon.value}%` : `$${coupon.value}`}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={coupon.is_active}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: coupon.id, is_active: checked })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditCoupon(coupon); setIsDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                      if (confirm('Delete this coupon?')) deleteCoupon.mutate(coupon.id);
                    }}>
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
  );
}

function CouponForm({ coupon, onSuccess }: { coupon: Coupon | null; onSuccess: () => void }) {
  const [form, setForm] = useState<{
    code: string;
    discount_type: 'percent' | 'fixed';
    value: string;
    is_active: boolean;
  }>({
    code: coupon?.code || '',
    discount_type: (coupon?.discount_type as 'percent' | 'fixed') || 'percent',
    value: coupon?.value?.toString() || '',
    is_active: coupon?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.toUpperCase(),
        type: form.discount_type,
        value: parseFloat(form.value),
        is_active: form.is_active,
      };

      if (coupon) {
        await axios.put(`/api/admin/coupons/${coupon.id}`, payload);
      } else {
        await axios.post('/api/admin/coupons', payload);
      }
    },
    onSuccess: () => {
      toast.success(coupon ? 'Coupon updated' : 'Coupon created');
      onSuccess();
    },
    onError: (error: any) => toast.error('Error: ' + (error.response?.data?.message || error.message))
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Code</Label>
        <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as 'percent' | 'fixed' })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percent</SelectItem>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Value</Label>
          <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
        <Label>Active</Label>
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : (coupon ? 'Update Coupon' : 'Create Coupon')}
      </Button>
    </form>
  );
}

function GiftCardsSection() {
  const [editCard, setEditCard] = useState<GiftCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: giftCards } = useQuery({
    queryKey: ['admin-giftcards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/gift-cards');
      return data as GiftCard[];
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await axios.put(`/api/admin/gift-cards/${id}/toggle`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-giftcards'] })
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditCard(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Gift Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editCard ? 'Edit Gift Card' : 'Add Gift Card'}</DialogTitle>
            </DialogHeader>
            <GiftCardForm
              card={editCard}
              onSuccess={() => {
                setIsDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['admin-giftcards'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Initial</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {giftCards?.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="font-mono font-medium">{card.code}</TableCell>
                <TableCell className="text-right font-bold">${Number(card.balance).toFixed(2)}</TableCell>
                <TableCell className="text-right">${Number(card.initial_balance).toFixed(2)}</TableCell>
                <TableCell>
                  <Switch
                    checked={card.is_active}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: card.id, is_active: checked })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function GiftCardForm({ card, onSuccess }: { card: GiftCard | null; onSuccess: () => void }) {
  const [form, setForm] = useState({
    code: card?.code || '',
    balance: card?.balance?.toString() || '',
    initial_balance: card?.initial_balance?.toString() || '',
    is_active: card?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const balance = parseFloat(form.balance);
      const initial = parseFloat(form.initial_balance || form.balance);

      if (card) {
        await axios.put(`/api/admin/gift-cards/${card.id}`, {
          code: form.code.toUpperCase(),
          is_active: form.is_active,
        });
      } else {
        await axios.post('/api/admin/gift-cards', {
          code: form.code.toUpperCase() || undefined,
          initial_balance: initial,
          is_active: form.is_active,
        });
      }
    },
    onSuccess: () => {
      toast.success(card ? 'Gift card updated' : 'Gift card created');
      onSuccess();
    },
    onError: (error: any) => toast.error('Error: ' + (error.response?.data?.message || error.message))
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Code</Label>
        <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required={!card} placeholder={card ? card.code : 'Auto-generate if blank'} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{card ? 'Balance (read-only)' : 'Balance'}</Label>
          <Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} required={!card} disabled={!!card} />
        </div>
        <div className="space-y-2">
          <Label>Initial Balance</Label>
          <Input type="number" step="0.01" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} disabled={!!card} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
        <Label>Active</Label>
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : (card ? 'Update Gift Card' : 'Create Gift Card')}
      </Button>
    </form>
  );
}
