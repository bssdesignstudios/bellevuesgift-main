import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ChevronRight, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  picking: 'bg-purple-500',
  ready: 'bg-indigo-500',
  picked_up: 'bg-green-500',
  shipped: 'bg-cyan-500',
  delivered: 'bg-green-600',
  cancelled: 'bg-red-500',
  refunded: 'bg-gray-500'
};

const fulfillmentLabels: Record<string, string> = {
  pickup: 'In-Store Pickup',
  island_delivery: 'Island Delivery',
  mailboat: 'Mailboat'
};

export default function AccountOrdersPage() {
  const { customer } = useCustomerAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['customer-orders', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">My Orders</h1>
        
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">
              When you place your first order, it will appear here.
            </p>
            <Button asChild>
              <Link to="/shop">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <Link to={`/account/orders/${order.order_number}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-medium">{order.order_number}</span>
                        <Badge 
                          variant="secondary" 
                          className={`${statusColors[order.status] || 'bg-gray-500'} text-white text-xs`}
                        >
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                        <span>{fulfillmentLabels[order.fulfillment_method] || order.fulfillment_method}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-semibold">${Number(order.total).toFixed(2)}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
