import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Package, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { VAT_RATE } from '@/lib/constants';

export default function AdminOverview() {
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();

  const { data: todayStats } = useQuery({
    queryKey: ['admin-today-stats'],
    queryFn: async () => {
      // Today's orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total, vat_amount, channel')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .eq('payment_status', 'paid');

      const totalSales = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const vatCollected = orders?.reduce((sum, o) => sum + Number(o.vat_amount), 0) || 0;
      const orderCount = orders?.length || 0;
      const webOrders = orders?.filter(o => o.channel === 'web').length || 0;
      const posOrders = orders?.filter(o => o.channel === 'pos').length || 0;

      return { totalSales, vatCollected, orderCount, webOrders, posOrders };
    }
  });

  const { data: lowStockCount } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: async () => {
      const { count } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .lt('qty_on_hand', 10);
      return count || 0;
    }
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['admin-pending-orders'],
    queryFn: async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'picking', 'ready']);
      return count || 0;
    }
  });

  const { data: customerCount } = useQuery({
    queryKey: ['admin-customer-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, customer:customers(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {format(today, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todayStats?.totalSales.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              VAT: ${todayStats?.vatCollected.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats?.orderCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Web: {todayStats?.webOrders || 0} | POS: {todayStats?.posOrders || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting fulfillment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Below reorder level
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders?.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{order.order_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.customer?.name || 'Walk-in'} • {order.channel.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${Number(order.total).toFixed(2)}</div>
                    <div className={`text-xs capitalize ${
                      order.status === 'delivered' || order.status === 'picked_up' ? 'text-success' :
                      order.status === 'cancelled' ? 'text-destructive' : 'text-muted-foreground'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))}
              {!recentOrders?.length && (
                <p className="text-muted-foreground text-center py-4">No recent orders</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span>Total Customers</span>
              </div>
              <span className="font-bold">{customerCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span>VAT Rate</span>
              </div>
              <span className="font-bold">{VAT_RATE * 100}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
