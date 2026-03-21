
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';
import { PageMeta } from '@/components/PageMeta';
import { useCart } from '@/contexts/CartContext';
import { Product } from '@/types';

export default function GiftCardsPage() {
  const { addItem } = useCart();

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('Now');

  // Fetch gift card products
  const { data: giftCardProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['gift-card-products'],
    queryFn: async () => {
      const response = await axios.get('/api/storefront/products', {
        params: {
          sku_prefix: 'GC-BEL-',
          is_active: true
        }
      });
      return response.data;
    }
  });

  // Pre-select first product when loaded
  useEffect(() => {
    if (giftCardProducts && giftCardProducts.length > 0 && !selectedProductId) {
      // Logic to find a default like $50 or $100, or just the first one
      const defaultProduct = giftCardProducts.find((p: Product) => Number(p.price) === 100) || giftCardProducts[0];
      setSelectedProductId(defaultProduct.id);
    }
  }, [giftCardProducts]);

  const selectedProduct = giftCardProducts?.find((p: Product) => p.id === selectedProductId);

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    // Basic validation
    if (!recipientEmail) {
      toast.error('Please enter a recipient email.');
      return;
    }

    addItem(selectedProduct, 1, {
      recipientEmail,
      recipientName,
      senderName,
      message,
      deliveryDate
    });

    toast.success(`$${Number(selectedProduct.price).toFixed(0)} Gift Card added to cart`);
  };

  const content = (
    <div className="container mx-auto px-4 py-12 animate-fade-in max-w-6xl">
      <div className="grid lg:grid-cols-2 gap-12 items-start">

        {/* Left: Product Image Preview */}
        <div className="sticky top-24">
          <h1 className="text-4xl font-bold mb-4 font-heading">Bellevue eGift Card</h1>
          <h2 className="text-2xl font-bold mb-8 text-muted-foreground">$25.00 – $250.00</h2>

          <div className="relative aspect-[1.6/1] w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white">
            <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-20"></div>

            <div className="relative z-10 text-center p-8">
              <Gift className="h-16 w-16 mx-auto mb-4 opacity-90" />
              <h3 className="text-3xl font-bold tracking-tight mb-2">Bellevue Gift Card</h3>
              <p className="text-white/80 uppercase tracking-widest text-sm font-semibold">
                {selectedProduct ? `$${Number(selectedProduct.price).toFixed(0)}` : 'Select Amount'}
              </p>
            </div>

            {/* Card footer details like logo */}
            <div className="absolute bottom-6 left-8 text-white/60 text-xs font-mono">
              XXXX-XXXX-XXXX-XXXX
            </div>
          </div>

          <p className="mt-8 text-muted-foreground leading-relaxed">
            Give the gift of choice with a Bellevue Gift Card. Perfect for students, teachers, and professionals.
            Delivered instantly via email or scheduled for a future date.
          </p>
        </div>

        {/* Right: Configuration Form */}
        <div className="bg-card p-0 lg:p-4 rounded-xl">
          <div className="space-y-8">

            {/* Amount Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Gift Card Amount</Label>
              {productsLoading ? (
                <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
              ) : (
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="Select amount" />
                  </SelectTrigger>
                  <SelectContent>
                    {giftCardProducts?.sort((a: Product, b: Product) => Number(a.price) - Number(b.price)).map((product: Product) => (
                      <SelectItem key={product.id} value={product.id} className="text-lg">
                        ${Number(product.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* To Email */}
            <div className="space-y-3">
              <Label htmlFor="recipientEmail" className="text-base font-semibold">To</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="Enter email address"
                className="h-12"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">We'll send the digital card to this address.</p>
            </div>

            {/* Recipient Name */}
            <div className="space-y-3">
              <Label htmlFor="recipientName" className="text-base font-semibold">Recipient Name</Label>
              <Input
                id="recipientName"
                placeholder="Enter a friendly name (optional)"
                className="h-12"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            {/* From Name */}
            <div className="space-y-3">
              <Label htmlFor="senderName" className="text-base font-semibold">From</Label>
              <Input
                id="senderName"
                placeholder="Your name"
                className="h-12"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
            </div>

            {/* Message */}
            <div className="space-y-3">
              <Label htmlFor="message" className="text-base font-semibold">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message..."
                className="min-h-[120px] resize-y"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground text-right">{500 - message.length} characters remaining</p>
            </div>

            {/* Delivery Date (Stubbed for now as plain select/text) */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Delivery Date</Label>
              <Select value={deliveryDate} onValueChange={setDeliveryDate}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Now">Now</SelectItem>
                  <SelectItem value="Future" disabled>Schedule for later (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Typically arrives within 5 minutes.</p>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all mt-4"
              onClick={handleAddToCart}
              disabled={!selectedProduct}
            >
              {productsLoading ? <Loader2 className="animate-spin mr-2" /> : 'Add to Cart'}
            </Button>

          </div>
        </div>

      </div>

      {/* Existing "Why Bellevue" Section - kept for content value but styled down */}
      <div className="mt-24 border-t pt-16">
        <h2 className="text-2xl font-bold text-center mb-12">Why Bellevue Gift Cards?</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
          <div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Perfect for Any Occasion</h3>
            <p className="text-muted-foreground text-sm">Birthdays, holidays, or just because.</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Instant Delivery</h3>
            <p className="text-muted-foreground text-sm">Sent directly to their inbox.</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Never Expires</h3>
            <p className="text-muted-foreground text-sm">Valid online and in-store forever.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StorefrontLayout>
      <PageMeta
        title="Gift Cards"
        description="Give the gift of choice with a Bellevue Gifts & Supplies gift card. Available in $25, $50, $100, and $250 denominations. Redeemable in-store and online."
        canonical="https://bellevue.gifts/gift-cards"
      />
      {content}
    </StorefrontLayout>
  );
}
