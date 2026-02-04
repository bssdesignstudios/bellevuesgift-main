import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, HelpCircle, Truck, Package, CheckCircle, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'picking', label: 'Processing', icon: Package },
  { key: 'ready', label: 'Ready for Pickup', icon: MapPin },
  { key: 'picked_up', label: 'Picked Up', icon: CheckCircle }
];

const shippingSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'picking', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle }
];

export default function AccountOrderDetailPage() {
  const { orderNumber } = useParams();
  const { customer } = useCustomerAuth();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-detail', orderNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .eq('customer_id', customer?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orderNumber && !!customer?.id
  });

  const { data: orderItems } = useQuery({
    queryKey: ['order-items', order?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order?.id);

      if (error) throw error;
      return data;
    },
    enabled: !!order?.id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" asChild>
          <Link to="/account/orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Link>
        </Button>
        
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Order not found</h2>
            <p className="text-muted-foreground">
              This order may not exist or you don't have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPickup = order.fulfillment_method === 'pickup';
  const steps = isPickup ? statusSteps : shippingSteps;
  const currentStepIndex = steps.findIndex(s => s.key === order.status);

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" asChild>
        <Link to="/account/orders">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Link>
      </Button>

      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-muted-foreground">
            Placed on {format(new Date(order.created_at), 'MMMM d, yyyy')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Receipt
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Need Help?</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  For questions about your order, please contact us:
                </p>
                <div className="space-y-2">
                  <p><strong>Phone:</strong> +1 (242) 352-5555</p>
                  <p><strong>Email:</strong> orders@bellevuegifts.com</p>
                  <p><strong>Order Reference:</strong> {order.order_number}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            {steps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2
                    ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                    ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
                  `}>
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs text-center ${isCurrent ? 'font-semibold' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pickup QR Code */}
      {isPickup && order.pickup_code && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG 
                  value={`${order.order_number}|${order.pickup_code}`} 
                  size={120}
                />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-semibold mb-1">Pickup Code</h3>
                <p className="text-3xl font-mono font-bold text-primary">{order.pickup_code}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Show this code at the store to collect your order
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Order Items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orderItems?.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.sku} · Qty: {item.qty}
                    </p>
                  </div>
                  <p className="font-medium">${Number(item.line_total).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
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
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${Number(order.total).toFixed(2)}</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <Badge variant="outline">
                  {order.payment_status === 'paid' ? 'Paid' : 'Pay on Pickup'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fulfillment</span>
                <span className="capitalize">{order.fulfillment_method.replace('_', ' ')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
