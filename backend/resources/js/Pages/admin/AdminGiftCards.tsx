import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Gift, Plus, Search, Ban, Loader2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface GiftCard {
  id: string;
  code: string;
  balance: number;
  initial_balance: number;
  is_active: boolean;
  created_at: string;
  used_at: string | null;
}

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function AdminGiftCards() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCardAmount, setNewCardAmount] = useState('');

  const { data: giftCards, isLoading } = useQuery({
    queryKey: ['admin-gift-cards', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('code', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GiftCard[];
    },
  });

  const createCardMutation = useMutation({
    mutationFn: async (amount: number) => {
      const code = generateGiftCardCode();
      const { error } = await supabase
        .from('gift_cards')
        .insert({
          code,
          initial_balance: amount,
          balance: amount,
        });
      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-cards'] });
      setShowCreateDialog(false);
      setNewCardAmount('');
      toast.success(`Gift card created: ${code}`);
    },
    onError: (error: any) => {
      toast.error('Failed to create gift card: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('gift_cards')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-cards'] });
      toast.success('Gift card updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  const handleCreateCard = () => {
    const amount = parseFloat(newCardAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    createCardMutation.mutate(amount);
  };

  const totalBalance = giftCards?.reduce((sum, card) => sum + (card.is_active ? card.balance : 0), 0) || 0;
  const activeCards = giftCards?.filter(c => c.is_active).length || 0;

  return (
    <AdminLayout>
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6" />
            Gift Cards
          </h1>
          <p className="text-muted-foreground">Manage gift cards and balances</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Issue Gift Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New Gift Card</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  min="1"
                  value={newCardAmount}
                  onChange={(e) => setNewCardAmount(e.target.value)}
                  placeholder="Enter gift card amount"
                />
              </div>
              <div className="flex gap-2">
                {[25, 50, 100, 250, 500].map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => setNewCardAmount(amt.toString())}
                  >
                    ${amt}
                  </Button>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={handleCreateCard}
                disabled={createCardMutation.isPending}
              >
                {createCardMutation.isPending ? 'Creating...' : 'Create Gift Card'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cards</p>
                <p className="text-2xl font-bold">{giftCards?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <Gift className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Cards</p>
                <p className="text-2xl font-bold">{activeCards}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-2xl font-bold">${totalBalance.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by gift card code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Gift Cards Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : giftCards?.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No gift cards found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {giftCards?.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-mono font-medium">{card.code}</TableCell>
                    <TableCell className="font-medium">${card.balance.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">${card.initial_balance.toFixed(2)}</TableCell>
                    <TableCell>
                      {card.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(card.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ id: card.id, is_active: !card.is_active })}
                      >
                        {card.is_active ? (
                          <>
                            <Ban className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          'Activate'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
