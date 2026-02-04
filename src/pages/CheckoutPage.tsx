import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { FULFILLMENT_METHODS, BAHAMIAN_ISLANDS } from '@/lib/constants';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, discount, vatAmount, total, clearCart, appliedCoupon } = useCart();
  const [loading, setLoading] = useState(false);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'island_delivery' | 'mailboat'>('pickup');
  const [paymentOption, setPaymentOption] = useState<'now' | 'later'>('now');
  
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    island: 'Grand Bahama',
    address: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!customer.name || !customer.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);

    try {
      // Create or find customer
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customer.phone)
        .single();

      let customerId = existingCustomer?.id;

      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customer.name,
            email: customer.email || null,
            phone: customer.phone,
            island: customer.island,
            address: customer.address || null
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Generate order number
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_order_number');
      
      if (orderNumberError) throw orderNumberError;
      const orderNumber = orderNumberData;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          channel: 'web',
          status: 'pending',
          fulfillment_method: fulfillment,
          payment_status: paymentOption === 'now' ? 'paid' : 'pay_later',
          payment_method: paymentOption === 'now' ? 'card' : 'pay_later',
          subtotal,
          discount_amount: discount,
          vat_amount: vatAmount,
          total
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        qty: item.qty,
        unit_price: item.product.sale_price ?? item.product.price,
        line_total: (item.product.sale_price ?? item.product.price) * item.qty
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart and redirect to success page
      clearCart();
      navigate(`/checkout/success/${order.id}`);
      toast.success('Order placed successfully!');

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
        {/* Customer Details */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Fulfillment Method</h2>
            <RadioGroup
              value={fulfillment}
              onValueChange={(v) => setFulfillment(v as any)}
              className="space-y-3"
            >
              {FULFILLMENT_METHODS.map((method) => (
                <div key={method.value} className="flex items-start space-x-3 border rounded-lg p-4">
                  <RadioGroupItem value={method.value} id={method.value} className="mt-1" />
                  <div>
                    <Label htmlFor={method.value} className="font-medium cursor-pointer">
                      {method.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {fulfillment !== 'pickup' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="island">Delivery Island</Label>
                <Select
                  value={customer.island}
                  onValueChange={(v) => setCustomer({ ...customer, island: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select island" />
                  </SelectTrigger>
                  <SelectContent>
                    {BAHAMIAN_ISLANDS.map((island) => (
                      <SelectItem key={island} value={island}>{island}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="address">Delivery Address</Label>
                <Textarea
                  id="address"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-4">Payment</h2>
            <RadioGroup
              value={paymentOption}
              onValueChange={(v) => setPaymentOption(v as 'now' | 'later')}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 border rounded-lg p-4">
                <RadioGroupItem value="now" id="pay-now" className="mt-1" />
                <div>
                  <Label htmlFor="pay-now" className="font-medium cursor-pointer">
                    Pay Now
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Simulated payment - order marked as paid
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 border rounded-lg p-4">
                <RadioGroupItem value="later" id="pay-later" className="mt-1" />
                <div>
                  <Label htmlFor="pay-later" className="font-medium cursor-pointer">
                    Pay on Pickup
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Pay when you collect your order
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-card border rounded-lg p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span>
                    {item.product.name} × {item.qty}
                  </span>
                  <span>
                    ${((item.product.sale_price ?? item.product.price) * item.qty).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (10%)</span>
                <span>${vatAmount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <Button type="submit" className="w-full mt-6" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Place Order - $${total.toFixed(2)}`
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
