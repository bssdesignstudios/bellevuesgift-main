import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Heart, MapPin, Truck, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function AccountDashboardPage() {
  const { customer } = useCustomerAuth();

  const { data: stats } = useQuery({
    queryKey: ['customer-stats', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;

      const [ordersResult, wishlistResult, addressesResult] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact' }).eq('customer_id', customer.id),
        supabase.from('wishlists').select('id', { count: 'exact' }).eq('customer_id', customer.id),
        supabase.from('customer_addresses').select('id', { count: 'exact' }).eq('customer_id', customer.id)
      ]);

      return {
        orders: ordersResult.count || 0,
        wishlist: wishlistResult.count || 0,
        addresses: addressesResult.count || 0
      };
    },
    enabled: !!customer?.id
  });

  const { data: latestOrder } = useQuery({
    queryKey: ['latest-order', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;

      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data;
    },
    enabled: !!customer?.id
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'picking': case 'ready': return 'bg-purple-500';
      case 'picked_up': case 'shipped': case 'delivered': return 'bg-green-500';
      case 'cancelled': case 'refunded': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {customer?.name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Manage your orders, wishlist, and account settings</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.orders || 0}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <Heart className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.wishlist || 0}</p>
                <p className="text-sm text-muted-foreground">Wishlist Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <MapPin className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.addresses || 0}</p>
                <p className="text-sm text-muted-foreground">Saved Addresses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Order */}
      {latestOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Latest Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{latestOrder.order_number}</span>
                  <Badge variant="secondary" className={`${getStatusColor(latestOrder.status)} text-white`}>
                    {latestOrder.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Placed on {format(new Date(latestOrder.created_at), 'MMM d, yyyy')}
                </p>
                <p className="font-medium">${Number(latestOrder.total).toFixed(2)}</p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/account/orders/${latestOrder.order_number}`}>
                    View Details
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/account/tracking">
                    Track Order
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/account/orders">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">View All Orders</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/account/wishlist">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">View Wishlist</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
