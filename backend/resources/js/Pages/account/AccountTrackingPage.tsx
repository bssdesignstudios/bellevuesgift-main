import { useState } from 'react';
import { AccountLayout } from '@/components/layout/AccountLayout';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Truck, Package, CheckCircle, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

const statusSteps = [
  { key: 'pending', label: 'Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'picking', label: 'Processing', icon: Package },
  { key: 'ready', label: 'Ready', icon: MapPin },
  { key: 'picked_up', label: 'Complete', icon: CheckCircle }
];

const shippingSteps = [
  { key: 'pending', label: 'Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'picking', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle }
];

export default function AccountTrackingPage() {
  const { customer } = useCustomerAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<string | null>(null);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['track-order', searchedOrder],
    queryFn: async () => {
      if (!searchedOrder) return null;

      // Search by order number or pickup code
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`order_number.eq.${searchedOrder},pickup_code.eq.${searchedOrder.toUpperCase()}`)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!searchedOrder
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchedOrder(searchTerm.trim());
    }
  };

  const isPickup = order?.fulfillment_method === 'pickup';
  const steps = isPickup ? statusSteps : shippingSteps;
  const currentStepIndex = order ? steps.findIndex(s => s.key === order.status) : -1;

  return (
    <AccountLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Track Your Order</h1>
          <p className="text-muted-foreground">Enter your order number or pickup code</p>
        </div>

        {/* Search Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Order number (BLV-2026-...) or pickup code"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                Track
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Search Result */}
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {searchedOrder && !isLoading && !order && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Order not found</h2>
              <p className="text-muted-foreground">
                Please check your order number or pickup code and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {order && (
          <div className="space-y-6">
            {/* Order Info */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="font-mono">{order.order_number}</CardTitle>
                  <Badge variant="secondary" className="w-fit capitalize">
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-medium">${Number(order.total).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fulfillment</p>
                    <p className="font-medium capitalize">{order.fulfillment_method.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment</p>
                    <p className="font-medium capitalize">{order.payment_status.replace('_', ' ')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Order Progress</CardTitle>
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

                    <div className="bg-muted/50 rounded-lg p-4 text-center max-w-md">
                      <p className="text-sm font-medium mb-1">Pickup Location</p>
                      <p className="text-sm text-muted-foreground">
                        Bellevue Gifts & Supplies Ltd.<br />
                        Freeport, Grand Bahama<br />
                        Open: 08:00 - 17:00
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
