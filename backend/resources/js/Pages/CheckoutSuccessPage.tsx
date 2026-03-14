import { Link, usePage } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Package, Truck, MapPin, ArrowRight, Printer, Home } from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { STORE_INFO } from '@/lib/constants';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';

export default function CheckoutSuccessPage() {
  const { order, orderItems } = usePage<{ order: any; orderItems: any[]; id: string }>().props;

  if (!order) {
    return (
      <StorefrontLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find this order.</p>
          <Button asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </StorefrontLayout>
    );
  }

  const isPickup = order.fulfillment_method === 'pickup';

  const content = (
    <div className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground">
          Thank you for your order. We've sent a confirmation to your email.
        </p>
      </div>

      {/* Order Number */}
      <Card className="mb-6">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Order Number</p>
          <p className="text-2xl font-mono font-bold">{order.order_number}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Placed on {format(new Date(order.created_at), 'MMMM d, yyyy at h:mm a')}
          </p>
        </CardContent>
      </Card>

      {/* Pickup QR Code */}
      {isPickup && order.pickup_code && (
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <QRCodeSVG
                  value={`${order.order_number}|${order.pickup_code}`}
                  size={180}
                />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Your Pickup Code</h3>
                <p className="text-4xl font-mono font-bold text-primary tracking-wider">
                  {order.pickup_code}
                </p>
                <p className="text-sm text-muted-foreground mt-4 max-w-sm">
                  Show this QR code or tell the cashier your pickup code when you arrive at the store
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fulfillment Info */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            {isPickup ? (
              <MapPin className="h-6 w-6 text-primary mt-1" />
            ) : (
              <Truck className="h-6 w-6 text-primary mt-1" />
            )}
            <div>
              <h3 className="font-semibold mb-1">
                {isPickup ? 'In-Store Pickup' : 'Delivery'}
              </h3>
              {isPickup ? (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{STORE_INFO.name}</p>
                  <p>{STORE_INFO.address}</p>
                  <p>Hours: {STORE_INFO.hours}</p>
                  <p className="mt-2">We'll notify you when your order is ready for pickup.</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your order will be delivered via {order.fulfillment_method.replace('_', ' ')}.
                  We'll send you tracking information once shipped.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Summary
          </h3>

          <div className="space-y-3 mb-4">
            {orderItems?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name} × {item.qty}
                </span>
                <span>${Number(item.line_total).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${Number(order.subtotal).toFixed(2)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-${Number(order.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT (10%)</span>
              <span>${Number(order.vat_amount).toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Status</span>
              <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                {order.payment_status === 'paid' ? 'Paid' : 'Pay on Pickup'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button variant="outline" className="flex-1" onClick={() => window.print()}>
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

      {/* Track Order Link */}
      <div className="text-center mt-6">
        <Link
          href={`/account/tracking?order=${order.order_number}`}
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          Track Your Order <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );

  return (
    <StorefrontLayout>
      {content}
    </StorefrontLayout>
  );
}
