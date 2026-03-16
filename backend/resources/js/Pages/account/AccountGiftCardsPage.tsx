import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Search, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface GiftCard {
  id: string;
  code: string;
  balance: number;
  initial_balance: number;
  is_active: boolean;
  created_at: string;
}

export default function AccountGiftCardsPage() {
  const { customer } = useCustomerAuth();
  const [checkCode, setCheckCode] = useState('');
  const [checkedCard, setCheckedCard] = useState<GiftCard | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Fetch customer gift cards
  const { data: customerCards } = useQuery({
    queryKey: ['customer-gift-cards', customer?.id],
    queryFn: async () => {
      const { data } = await axios.get('/api/customer/gift-cards');
      return data as GiftCard[];
    },
    enabled: !!customer?.id
  });

  const handleCheckBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkCode.trim()) return;

    setIsChecking(true);
    setCheckedCard(null);

    try {
      const { data } = await axios.post('/api/pos/gift-cards/check', {
        code: checkCode.toUpperCase().trim()
      });

      if (data.gift_card) {
        setCheckedCard(data.gift_card as GiftCard);
      } else {
        toast.error('Gift card not found');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Gift Cards</h1>
        <p className="text-muted-foreground">Check balances and manage your gift cards</p>
      </div>

      {/* Check Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Check Gift Card Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckBalance} className="space-y-4">
            <div>
              <Label htmlFor="code">Gift Card Code</Label>
              <Input
                id="code"
                value={checkCode}
                onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                placeholder="Enter gift card code"
                className="font-mono"
              />
            </div>
            <Button type="submit" disabled={isChecking}>
              {isChecking ? 'Checking...' : 'Check Balance'}
            </Button>
          </form>

          {checkedCard && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-lg">{checkedCard.code}</span>
                {checkedCard.is_active ? (
                  <span className="text-green-600 text-sm font-medium">Active</span>
                ) : (
                  <span className="text-red-600 text-sm font-medium">Inactive</span>
                )}
              </div>
              <div className="text-3xl font-bold text-primary">
                ${checkedCard.balance.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Original value: ${checkedCard.initial_balance.toFixed(2)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Gift Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            My Gift Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customerCards?.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {customerCards.map((card) => (
                <div
                  key={card.id}
                  className="p-4 border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Gift className="h-8 w-8 text-primary" />
                    <span className={`text-sm font-medium ${card.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {card.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="font-mono text-lg mb-2">{card.code}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="text-2xl font-bold">${card.balance.toFixed(2)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      of ${card.initial_balance.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No gift cards yet</h3>
              <p className="text-sm text-muted-foreground">
                Gift cards you receive will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Buy Gift Card CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-8 text-center">
          <Gift className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <h3 className="text-xl font-bold mb-2">Give the Gift of Choice</h3>
          <p className="opacity-90 mb-6">
            Bellevue gift cards are the perfect present for any occasion
          </p>
          <Button variant="secondary" asChild>
            <a href="/gift-cards">Buy Gift Cards</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
