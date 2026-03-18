import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, ShoppingCart, CreditCard, CheckCircle, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GiftCardResult {
  code: string;
  balance: number;
  initial_balance: number;
  is_active: boolean;
}

export default function GiftCardsPage() {
  const denominations = [25, 50, 75, 100, 150, 200];
  const [checkCode, setCheckCode] = useState('');
  const [checkedCard, setCheckedCard] = useState<GiftCardResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkCode.trim()) return;

    setIsChecking(true);
    setCheckedCard(null);

    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('code, balance, initial_balance, is_active')
        .eq('code', checkCode.toUpperCase().trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCheckedCard(data as GiftCardResult);
      } else {
        toast.error('Gift card not found');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Gift className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Bellevue Gift Cards</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Give the gift of choice! Bellevue gift cards are perfect for students, teachers, 
          office workers, and anyone who loves quality supplies.
        </p>
      </div>

      {/* Check Balance Section */}
      <Card className="max-w-md mx-auto mb-12">
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
            <Button type="submit" className="w-full" disabled={isChecking}>
              {isChecking ? 'Checking...' : 'Check Balance'}
            </Button>
          </form>

          {checkedCard && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-lg">{checkedCard.code}</span>
                {checkedCard.is_active ? (
                  <span className="text-success text-sm font-medium">Active</span>
                ) : (
                  <span className="text-destructive text-sm font-medium">Inactive</span>
                )}
              </div>
              <div className="text-3xl font-bold text-primary">
                ${Number(checkedCard.balance).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Original value: ${Number(checkedCard.initial_balance).toFixed(2)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Denominations */}
      <div className="max-w-4xl mx-auto mb-12">
        <h2 className="text-2xl font-bold text-center mb-6">Choose Your Amount</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {denominations.map((amount) => (
            <Card 
              key={amount} 
              className="hover:border-primary cursor-pointer transition-all hover:shadow-lg"
            >
              <CardContent className="py-8 text-center">
                <div className="text-3xl font-bold text-primary mb-2">${amount}</div>
                <p className="text-sm text-muted-foreground">Gift Card</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Gift cards are available for purchase in-store
        </p>
      </div>

      {/* Features */}
      <div className="bg-muted/50 rounded-2xl p-8 max-w-4xl mx-auto mb-12">
        <h2 className="text-2xl font-bold text-center mb-8">Why Choose Bellevue Gift Cards?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Wide Selection</h3>
            <p className="text-sm text-muted-foreground">
              Use on any product in our store - school supplies, office essentials, gifts, and more
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Easy to Use</h3>
            <p className="text-sm text-muted-foreground">
              Simply present your card at checkout - works online and in-store
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Never Expires</h3>
            <p className="text-sm text-muted-foreground">
              Your gift card balance never expires - use it whenever you're ready
            </p>
          </div>
        </div>
      </div>

      {/* Manage CTA */}
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Want to manage your gift cards?</p>
        <Button variant="outline" asChild>
          <Link to="/account/gift-cards">Go to My Gift Cards</Link>
        </Button>
      </div>
    </div>
  );
}
