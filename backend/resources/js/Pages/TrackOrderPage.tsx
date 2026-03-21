import { useState } from 'react';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';
import { PageMeta } from '@/components/PageMeta';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Truck, Package, CheckCircle, Clock, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

const statusSteps = [
  { key: 'pending', label: 'Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'picking', label: 'Processing', icon: Package },
  { key: 'ready', label: 'Ready for Pickup', icon: MapPin },
  { key: 'picked_up', label: 'Complete', icon: CheckCircle }
];

const shippingSteps = [
  { key: 'pending', label: 'Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'picking', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle }
];

export default function TrackOrderPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setSearched(true);
    try {
      const { data } = await axios.get('/api/orders/track', {
        params: { q: searchTerm.trim() }
      });
      setOrder(data.order);
    } catch {
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isPickup = order?.fulfillment_method === 'pickup';
  const steps = isPickup ? statusSteps : shippingSteps;
  const currentStepIndex = order ? steps.findIndex(s => s.key === order.status) : -1;

  return (
    <StorefrontLayout>
      <PageMeta
        title="Track Your Order"
        description="Track the status and delivery of your Bellevue Gifts & Supplies order. Enter your order number or email to get real-time updates."
        canonical="https://bellevue.gifts/track-order"
      />
      <div className="container mx-auto px-4 py-12 max-w-4xl animate-fade-in">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="h-8 w-8 text-brand-blue" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
          <p className="text-muted-foreground">Stay updated on your Bellevue order's progress</p>
        </div>

        {/* Search Form */}
        <Card className="shadow-lg border-2 border-slate-100 mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Order number (e.g., BLV-2026-...) or pickup code"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-8" disabled={isLoading}>
                {isLoading ? 'Searching...' : 'Track Status'}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3 text-center sm:text-left">
              Found on your order confirmation email or receipt.
            </p>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-blue border-t-transparent"></div>
            <p className="text-brand-blue font-medium">Retrieving order details...</p>
          </div>
        )}

        {/* Not Found */}
        {searched && !isLoading && !order && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We couldn't find an order matching "<strong>{searchTerm}</strong>".
                Please double-check the order number and try again.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => { setSearchTerm(''); setOrder(null); setSearched(false); }}
              >
                Try Another Search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Order Result */}
        {order && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Summary */}
              <Card className="md:col-span-2">
                <CardHeader className="border-b bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Order Number</p>
                      <CardTitle className="font-mono text-xl">{order.order_number}</CardTitle>
                    </div>
                    <Badge className="bg-brand-blue text-white px-3 py-1 text-sm capitalize">
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-y-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Order Date</p>
                      <p className="font-semibold">{format(new Date(order.created_at), 'MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                      <p className="font-semibold">${Number(order.total).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Fulfillment</p>
                      <p className="font-semibold capitalize">{order.fulfillment_method.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Payment</p>
                      <p className="font-semibold capitalize">{order.payment_status.replace('_', ' ')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions / Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    If you have questions about your order, please contact our support team.
                  </p>
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <a href="tel:+12423527064">
                      <Clock className="h-4 w-4" /> (242) 352-7064
                    </a>
                  </Button>
                  <Button variant="secondary" className="w-full" asChild>
                    <a href="/contact">Contact Support</a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Progress</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-10">
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-0 w-full h-1 bg-slate-100 -z-10 rounded-full" />
                  <div
                    className="absolute top-5 left-0 h-1 bg-brand-blue -z-10 rounded-full transition-all duration-1000"
                    style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                  />

                  <div className="flex justify-between items-start">
                    {steps.map((step, index) => {
                      const isCompleted = index <= currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.key} className="flex flex-col items-center relative gap-3 text-center max-w-[80px]">
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                            ${isCompleted ? 'bg-brand-blue text-white shadow-lg' : 'bg-white border-2 border-slate-200 text-slate-300'}
                            ${isCurrent ? 'ring-4 ring-brand-blue/20 scale-110' : ''}
                          `}>
                            <StepIcon className="h-5 w-5" />
                          </div>
                          <div className="space-y-1">
                            <p className={`text-xs font-bold leading-tight ${isCompleted ? 'text-brand-blue' : 'text-slate-400'}`}>
                              {step.label}
                            </p>
                            {isCurrent && (
                              <p className="text-[10px] text-brand-blue font-medium animate-pulse">
                                Current
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code for Pickup */}
            {isPickup && order.pickup_code && order.status !== 'picked_up' && (
              <Card className="bg-brand-blue/5 border-brand-blue/20 overflow-hidden">
                <div className="bg-brand-blue text-white py-3 px-6 text-center">
                  <p className="text-sm font-bold tracking-widest uppercase">Show this to the Cashier</p>
                </div>
                <CardContent className="py-10">
                  <div className="flex flex-col items-center gap-8">
                    <div className="bg-white p-6 rounded-2xl shadow-xl border-4 border-brand-blue/10">
                      <QRCodeSVG
                        value={`${order.order_number}|${order.pickup_code}`}
                        size={200}
                        includeMargin={true}
                        level="H"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1 uppercase font-bold tracking-tighter">Your Pickup Code</p>
                      <h2 className="text-5xl font-mono font-black text-brand-blue tracking-[0.2em]">
                        {order.pickup_code}
                      </h2>
                      <p className="text-sm text-balance text-muted-foreground mt-6 max-w-sm mx-auto">
                        Your order is ready! Visit our Freeport store and present this code or QR code to collect your items.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 max-w-sm">
                      <div className="bg-brand-blue/10 p-3 rounded-lg">
                        <MapPin className="h-6 w-6 text-brand-blue" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">Bellevue Freeport Store</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Queen's Highway, Freeport, Grand Bahama<br />
                          Open today until 5:00 PM
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}
