import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Search, CreditCard, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GiftCardResult {
  code: string;
  balance: number;
  initial_balance: number;
  is_active: boolean;
}

export default function GiftCardsBalancePage() {
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
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Check Gift Card Balance</h1>
        <p className="text-muted-foreground">
          Enter your gift card code to check your remaining balance
        </p>
      </div>

      {/* Check Balance Card */}
      <Card className="max-w-md mx-auto mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Gift Card Balance Lookup
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
                placeholder="Enter your gift card code"
                className="font-mono text-lg tracking-wider"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isChecking}>
              {isChecking ? 'Checking...' : 'Check Balance'}
            </Button>
          </form>

          {checkedCard && (
            <div className="mt-6 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-lg font-medium">{checkedCard.code}</span>
                {checkedCard.is_active ? (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">Active</span>
                ) : (
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">Inactive</span>
                )}
              </div>
              
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-4xl font-bold text-primary">${checkedCard.balance.toFixed(2)}</p>
              </div>
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Original Value</span>
                <span>${checkedCard.initial_balance.toFixed(2)}</span>
              </div>
              
              {checkedCard.balance > 0 && checkedCard.balance < checkedCard.initial_balance && (
                <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(checkedCard.balance / checkedCard.initial_balance) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Looking to purchase a gift card?</p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" asChild>
            <Link to="/gift-cards">
              <Gift className="h-4 w-4 mr-2" />
              Buy Gift Cards
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Store
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
