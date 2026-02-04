import { Link, usePage } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { CheckCircle, Printer, Home } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { STORE_INFO } from '@/lib/constants';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';

export default function OrderPage() {
  const { id } = usePage().props as unknown as { id: string };

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          items:order_items(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Order;
    },
    enabled: !!id
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <StorefrontLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-muted" />
            <div className="h-8 w-64 mx-auto bg-muted rounded" />
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  if (!order) {
    return (
      <StorefrontLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </StorefrontLayout>
    );
  }

  const content = (
    <div className="container mx-auto px-4 py-8 max-w-2xl animate-fade-in">
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 mx-auto text-success mb-4" />
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground">
          Thank you for your order. We'll notify you when it's ready.
        </p>
      </div>

      <div className="bg-card border rounded-lg p-6 print:shadow-none">
        {/* Order Number & QR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6 pb-6 border-b">
          <div>
            <p className="text-sm text-muted-foreground">Order Number</p>
            <p className="text-2xl font-bold font-mono">{order.order_number}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <QRCodeSVG value={order.order_number} size={100} />
          </div>
        </div>

        {/* Customer Info */}
        {order.customer && (
          <div className="mb-6 pb-6 border-b">
            <h3 className="font-semibold mb-2">Customer Details</h3>
            <p>{order.customer.name}</p>
            <p className="text-muted-foreground">{order.customer.phone}</p>
            {order.customer.email && (
              <p className="text-muted-foreground">{order.customer.email}</p>
            )}
          </div>
        )}

        {/* Fulfillment */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="font-semibold mb-2">Fulfillment</h3>
          <p className="capitalize">{order.fulfillment_method.replace('_', ' ')}</p>
          {order.fulfillment_method === 'pickup' && (
            <p className="text-sm text-muted-foreground">
              Pickup at: {STORE_INFO.address}
            </p>
          )}
        </div>

        {/* Items */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="font-semibold mb-3">Order Items</h3>
          <div className="space-y-2">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name} × {item.qty}
                </span>
                <span>${item.line_total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-2 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>-${order.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">VAT (10%)</span>
            <span>${order.vat_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Status */}
        <div className="p-4 rounded-lg bg-muted">
          <div className="flex justify-between items-center">
            <span>Payment Status</span>
            <span className={`font-semibold ${order.payment_status === 'paid' ? 'text-success' : 'text-warning'
              }`}>
              {order.payment_status === 'paid' ? 'Paid' : 'Pay on Pickup'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6 print:hidden">
        <Button variant="outline" onClick={handlePrint} className="flex-1">
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
        <Button asChild className="flex-1">
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  );

  return (
    <StorefrontLayout>
      {content}
    </StorefrontLayout>
  );
}
