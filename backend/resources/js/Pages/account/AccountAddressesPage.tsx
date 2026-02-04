import { useState } from 'react';
import { AccountLayout } from '@/components/layout/AccountLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Pencil, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { BAHAMIAN_ISLANDS } from '@/lib/constants';

interface Address {
  id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  island: string;
  postal_code: string | null;
  phone: string | null;
  is_default: boolean;
}

export default function AccountAddressesPage() {
  const { customer } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    label: 'Home',
    address_line1: '',
    address_line2: '',
    city: '',
    island: 'Grand Bahama',
    postal_code: '',
    phone: '',
    is_default: false
  });

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['customer-addresses', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customer.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data as Address[];
    },
    enabled: !!customer?.id
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('customer_addresses')
          .update({
            label: data.label,
            address_line1: data.address_line1,
            address_line2: data.address_line2 || null,
            city: data.city,
            island: data.island,
            postal_code: data.postal_code || null,
            phone: data.phone || null,
            is_default: data.is_default
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customer_addresses')
          .insert({
            customer_id: customer!.id,
            label: data.label,
            address_line1: data.address_line1,
            address_line2: data.address_line2 || null,
            city: data.city,
            island: data.island,
            postal_code: data.postal_code || null,
            phone: data.phone || null,
            is_default: data.is_default
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success(editingAddress ? 'Address updated' : 'Address added');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success('Address deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      // First unset all defaults
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', customer!.id);

      // Then set the new default
      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success('Default address updated');
    }
  });

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        label: address.label,
        address_line1: address.address_line1,
        address_line2: address.address_line2 || '',
        city: address.city,
        island: address.island,
        postal_code: address.postal_code || '',
        phone: address.phone || '',
        is_default: address.is_default
      });
    } else {
      setEditingAddress(null);
      setFormData({
        label: 'Home',
        address_line1: '',
        address_line2: '',
        city: '',
        island: 'Grand Bahama',
        postal_code: '',
        phone: '',
        is_default: false
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAddress(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingAddress?.id
    });
  };

  if (isLoading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Addresses</h1>
            <p className="text-muted-foreground">Manage your delivery addresses</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="label">Label</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="Home, Work, etc."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (242) 555-0123"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address_line1">Address Line 1 *</Label>
                  <Input
                    id="address_line1"
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    placeholder="Street address"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input
                    id="address_line2"
                    value={formData.address_line2}
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    placeholder="Apt, Suite, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Freeport"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="island">Island *</Label>
                    <Select
                      value={formData.island}
                      onValueChange={(v) => setFormData({ ...formData, island: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BAHAMIAN_ISLANDS.map((island) => (
                          <SelectItem key={island} value={island}>{island}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  />
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Address'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {addresses?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No addresses saved</h2>
              <p className="text-muted-foreground mb-6">
                Add an address to make checkout faster.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses?.map((address) => (
              <Card key={address.id} className={address.is_default ? 'border-primary' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{address.label}</h3>
                      {address.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(address)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(address.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{address.address_line1}</p>
                    {address.address_line2 && <p>{address.address_line2}</p>}
                    <p>{address.city}, {address.island}</p>
                    {address.postal_code && <p>{address.postal_code}</p>}
                    {address.phone && <p>{address.phone}</p>}
                  </div>

                  {!address.is_default && (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-3 p-0 h-auto"
                      onClick={() => setDefaultMutation.mutate(address.id)}
                    >
                      Set as default
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
