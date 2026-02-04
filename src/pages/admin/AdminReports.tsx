import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format, subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { Download, TrendingUp, TrendingDown, DollarSign, Package, Users, Wrench, BarChart3, Clock, Star } from 'lucide-react';
import { isDemoModeEnabled } from '@/lib/demoSession';
import { 
  generateDemoDailySales, 
  DEMO_CASHIER_SALES, 
  DEMO_CATEGORY_SALES, 
  DEMO_TOP_PRODUCTS,
  DEMO_INVENTORY_ANALYTICS,
  DEMO_REPAIR_ANALYTICS,
  DEMO_CUSTOMER_ANALYTICS 
} from '@/lib/demoData';
export default function AdminReports() {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('7');
  const days = parseInt(dateRange);
  const isDemoMode = isDemoModeEnabled();

  // Sales by day
  const { data: dailySales } = useQuery({
    queryKey: ['report-daily-sales', days, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return generateDemoDailySales(days);
      }
      
      const results = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        
        const { data } = await supabase
          .from('orders')
          .select('total, vat_amount, channel')
          .gte('created_at', start)
          .lte('created_at', end)
          .eq('payment_status', 'paid');
        
        const posOrders = data?.filter(o => o.channel === 'pos') || [];
        const webOrders = data?.filter(o => o.channel === 'web') || [];
        
        results.push({
          date: format(date, 'MMM d'),
          sales: data?.reduce((sum, o) => sum + Number(o.total), 0) || 0,
          vat: data?.reduce((sum, o) => sum + Number(o.vat_amount), 0) || 0,
          orders: data?.length || 0,
          posTotal: posOrders.reduce((sum, o) => sum + Number(o.total), 0),
          webTotal: webOrders.reduce((sum, o) => sum + Number(o.total), 0),
          posCount: posOrders.length,
          webCount: webOrders.length,
        });
      }
      return results;
    }
  });

  // Sales by cashier
  const { data: cashierSales } = useQuery({
    queryKey: ['report-cashier-sales', days, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_CASHIER_SALES;
      }
      
      const start = startOfDay(subDays(new Date(), days)).toISOString();
      const { data } = await supabase
        .from('orders')
        .select('total, staff:staff(name)')
        .gte('created_at', start)
        .eq('channel', 'pos')
        .eq('payment_status', 'paid');
      
      const staffMap = new Map<string, { name: string; total: number; count: number }>();
      data?.forEach(order => {
        const staffName = order.staff?.name || 'Unknown';
        const existing = staffMap.get(staffName) || { name: staffName, total: 0, count: 0 };
        existing.total += Number(order.total);
        existing.count += 1;
        staffMap.set(staffName, existing);
      });
      
      return Array.from(staffMap.values()).sort((a, b) => b.total - a.total);
    }
  });

  // Sales by category
  const { data: categorySales } = useQuery({
    queryKey: ['report-category-sales', isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_CATEGORY_SALES;
      }
      
      const { data: items } = await supabase
        .from('order_items')
        .select('line_total, qty, product:products(category:categories(name))');
      
      const categoryMap = new Map<string, { total: number; qty: number }>();
      items?.forEach(item => {
        const catName = item.product?.category?.name || 'Uncategorized';
        const existing = categoryMap.get(catName) || { total: 0, qty: 0 };
        existing.total += Number(item.line_total);
        existing.qty += item.qty;
        categoryMap.set(catName, existing);
      });
      
      return Array.from(categoryMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    }
  });

  // Top selling products
  const { data: topProducts } = useQuery({
    queryKey: ['report-top-products', isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_TOP_PRODUCTS;
      }
      
      const { data: items } = await supabase
        .from('order_items')
        .select('name, sku, qty, line_total');
      
      const productMap = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
      items?.forEach(item => {
        const existing = productMap.get(item.sku);
        if (existing) {
          existing.qty += item.qty;
          existing.revenue += Number(item.line_total);
        } else {
          productMap.set(item.sku, {
            name: item.name,
            sku: item.sku,
            qty: item.qty,
            revenue: Number(item.line_total),
          });
        }
      });
      
      return Array.from(productMap.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);
    }
  });

  // Low stock items with velocity
  const { data: inventoryAnalytics } = useQuery({
    queryKey: ['report-inventory-analytics', isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_INVENTORY_ANALYTICS;
      }
      
      const { data: inventory } = await supabase
        .from('inventory')
        .select('qty_on_hand, reorder_level, product:products(id, name, sku)')
        .order('qty_on_hand', { ascending: true })
        .limit(20);

      // Get sales velocity (last 30 days)
      const start = startOfDay(subDays(new Date(), 30)).toISOString();
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, qty, created_at')
        .gte('created_at', start);

      const velocityMap = new Map<string, number>();
      orderItems?.forEach(item => {
        if (item.product_id) {
          velocityMap.set(item.product_id, (velocityMap.get(item.product_id) || 0) + item.qty);
        }
      });

      return inventory?.map((item: any) => {
        const velocity = velocityMap.get(item.product?.id) || 0;
        const dailyVelocity = velocity / 30;
        const daysUntilStockout = dailyVelocity > 0 ? Math.floor(item.qty_on_hand / dailyVelocity) : Infinity;
        
        return {
          ...item,
          velocity,
          dailyVelocity,
          daysUntilStockout,
          needsReorder: item.qty_on_hand <= item.reorder_level || daysUntilStockout <= 7,
        };
      }).filter((item: any) => item.qty_on_hand < 20) || [];
    }
  });

  // Repair analytics
  const { data: repairAnalytics } = useQuery({
    queryKey: ['report-repair-analytics', isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_REPAIR_ANALYTICS;
      }
      
      const { data: tickets } = await supabase
        .from('repair_tickets')
        .select('status, created_at, updated_at, total_cost');

      const statusCounts: Record<string, number> = {};
      let completedCount = 0;
      let totalTurnaround = 0;
      let totalRevenue = 0;

      tickets?.forEach(ticket => {
        statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
        
        if (ticket.status === 'completed') {
          completedCount++;
          totalRevenue += Number(ticket.total_cost) || 0;
          const daysVal = differenceInDays(new Date(ticket.updated_at), new Date(ticket.created_at));
          totalTurnaround += daysVal;
        }
      });

      return {
        statusCounts,
        totalTickets: tickets?.length || 0,
        openTickets: (tickets?.length || 0) - (statusCounts.completed || 0) - (statusCounts.cancelled || 0),
        avgTurnaround: completedCount > 0 ? Math.round(totalTurnaround / completedCount) : 0,
        totalRevenue,
      };
    }
  });

  // Customer analytics
  const { data: customerAnalytics } = useQuery({
    queryKey: ['report-customer-analytics', isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_CUSTOMER_ANALYTICS;
      }
      
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, is_favorite, loyalty_points, customer_tier, created_at');

      const { data: orders } = await supabase
        .from('orders')
        .select('customer_id, total')
        .eq('payment_status', 'paid');

      const customerOrders = new Map<string, { count: number; total: number }>();
      orders?.forEach(order => {
        if (order.customer_id) {
          const existing = customerOrders.get(order.customer_id) || { count: 0, total: 0 };
          existing.count++;
          existing.total += Number(order.total);
          customerOrders.set(order.customer_id, existing);
        }
      });

      const topCustomers = customers?.map(c => ({
        ...c,
        orderCount: customerOrders.get(c.id)?.count || 0,
        totalSpent: customerOrders.get(c.id)?.total || 0,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10) || [];

      const tierCounts: Record<string, number> = { retail: 0, school: 0, corporate: 0, vip: 0 };
      customers?.forEach(c => {
        const tier = c.customer_tier || 'retail';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      return {
        totalCustomers: customers?.length || 0,
        favoriteCount: customers?.filter(c => c.is_favorite).length || 0,
        topCustomers,
        tierCounts,
        repeatBuyers: Array.from(customerOrders.values()).filter(c => c.count > 1).length,
      };
    }
  });

  // Calculate summary stats
  const totalVat = dailySales?.reduce((sum, d) => sum + d.vat, 0) || 0;
  const totalSales = dailySales?.reduce((sum, d) => sum + d.sales, 0) || 0;
  const totalOrders = dailySales?.reduce((sum, d) => sum + d.orders, 0) || 0;
  const posTotal = dailySales?.reduce((sum, d) => sum + d.posTotal, 0) || 0;
  const webTotal = dailySales?.reduce((sum, d) => sum + d.webTotal, 0) || 0;

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDateRange('7')} className={dateRange === '7' ? 'bg-primary text-primary-foreground' : ''}>7 Days</Button>
          <Button variant="outline" size="sm" onClick={() => setDateRange('30')} className={dateRange === '30' ? 'bg-primary text-primary-foreground' : ''}>30 Days</Button>
          <Button variant="outline" size="sm" onClick={() => setDateRange('90')} className={dateRange === '90' ? 'bg-primary text-primary-foreground' : ''}>90 Days</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>POS: ${posTotal.toFixed(2)}</span>
              <span>•</span>
              <span>Web: ${webTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : '0.00'}/order
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">VAT Collected</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalVat.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">10% VAT Rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Repair Tickets</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repairAnalytics?.openTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg turnaround: {repairAnalytics?.avgTurnaround || 0} days
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="repairs">Repairs</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sales by Day</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportToCSV(dailySales || [], 'daily_sales')}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">POS</TableHead>
                      <TableHead className="text-right">Web</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySales?.slice(-7).map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{day.date}</TableCell>
                        <TableCell className="text-right">{day.orders}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${day.posTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${day.webTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${day.sales.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sales by Cashier</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportToCSV(cashierSales || [], 'cashier_sales')}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashierSales?.map((staff) => (
                      <TableRow key={staff.name}>
                        <TableCell className="font-medium">{staff.name}</TableCell>
                        <TableCell className="text-right">{staff.count}</TableCell>
                        <TableCell className="text-right font-medium">${staff.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>VAT Summary ({days} Days)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span>Gross Sales (incl. VAT)</span>
                  <span className="text-2xl font-bold">${totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span>VAT Collected (10%)</span>
                  <span className="text-2xl font-bold text-primary">${totalVat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span>Net Sales (excl. VAT)</span>
                  <span className="text-2xl font-bold">${(totalSales - totalVat).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Products</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportToCSV(topProducts || [], 'top_products')}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts?.map((prod) => (
                      <TableRow key={prod.sku}>
                        <TableCell>
                          <div className="font-medium truncate max-w-[200px]">{prod.name}</div>
                          <div className="text-xs text-muted-foreground">{prod.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">{prod.qty}</TableCell>
                        <TableCell className="text-right font-medium">${prod.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Forecasting</CardTitle>
                <CardDescription>Stock levels and reorder recommendations based on 30-day velocity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => exportToCSV(inventoryAnalytics || [], 'inventory_forecast')}>
                <Download className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">30-Day Sales</TableHead>
                    <TableHead className="text-right">Daily Velocity</TableHead>
                    <TableHead className="text-right">Days Until Stockout</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryAnalytics?.map((item: any) => (
                    <TableRow key={item.product?.sku}>
                      <TableCell>
                        <div className="font-medium">{item.product?.name}</div>
                        <div className="text-xs text-muted-foreground">{item.product?.sku}</div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{item.qty_on_hand}</TableCell>
                      <TableCell className="text-right">{item.velocity}</TableCell>
                      <TableCell className="text-right">{item.dailyVelocity.toFixed(1)}/day</TableCell>
                      <TableCell className="text-right">
                        {item.daysUntilStockout === Infinity ? '∞' : `${item.daysUntilStockout} days`}
                      </TableCell>
                      <TableCell>
                        {item.needsReorder ? (
                          <Badge variant="destructive">Reorder Now</Badge>
                        ) : item.qty_on_hand < item.reorder_level ? (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700">Low Stock</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repairs" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Repair Ticket Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(repairAnalytics?.statusCounts || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                    <Badge variant="secondary">{count as number}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Repair Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                    <span>Total Tickets</span>
                  </div>
                  <span className="text-2xl font-bold">{repairAnalytics?.totalTickets || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span>Avg Turnaround</span>
                  </div>
                  <span className="text-2xl font-bold">{repairAnalytics?.avgTurnaround || 0} days</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span>Repair Revenue</span>
                  </div>
                  <span className="text-2xl font-bold">${(repairAnalytics?.totalRevenue || 0).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>Total Customers</span>
                  </div>
                  <span className="text-2xl font-bold">{customerAnalytics?.totalCustomers || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    <span>VIP / Favorites</span>
                  </div>
                  <span className="text-2xl font-bold">{customerAnalytics?.favoriteCount || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <span>Repeat Buyers</span>
                  </div>
                  <span className="text-2xl font-bold">{customerAnalytics?.repeatBuyers || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Tiers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(customerAnalytics?.tierCounts || {}).map(([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="capitalize">{tier}</span>
                    <Badge variant="secondary">{count as number}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Customers by Lifetime Value</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportToCSV(customerAnalytics?.topCustomers || [], 'top_customers')}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Loyalty Points</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerAnalytics?.topCustomers?.map((customer: any) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {customer.is_favorite && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                            <span className="font-medium">{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{customer.customer_tier || 'retail'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{customer.orderCount}</TableCell>
                        <TableCell className="text-right">{(customer.loyalty_points || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">${customer.totalSpent.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
