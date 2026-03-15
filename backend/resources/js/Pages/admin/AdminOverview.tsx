import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Download, DollarSign, Package, Users, Wrench, BarChart3, Monitor } from 'lucide-react';
import { isDemoModeEnabled } from '@/lib/demoSession';
import {
  generateDemoDailySales,
  DEMO_CASHIER_SALES,
  DEMO_TOP_PRODUCTS,
  DEMO_INVENTORY_ANALYTICS,
  DEMO_REPAIR_ANALYTICS,
  DEMO_CUSTOMER_ANALYTICS
} from '@/lib/demoData';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminOverview() {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('7');
  const days = parseInt(dateRange);
  const isDemoMode = isDemoModeEnabled();

  // Fetch dashboard data from Laravel API
  const { data: dashboardData } = useQuery({
    queryKey: ['admin-dashboard', days, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return null;
      }
      const { data } = await axios.get(`/api/admin/reports/dashboard?days=${days}`);
      return data;
    }
  });

  // Sales by day — from API or demo
  const dailySales = isDemoMode
    ? generateDemoDailySales(days)
    : dashboardData?.daily_sales?.map((d: any) => ({
        date: d.date,
        sales: Number(d.sales) || 0,
        vat: Number(d.vat) || 0,
        orders: Number(d.orders) || 0,
        posTotal: 0,
        webTotal: 0,
        posCount: 0,
        webCount: 0,
      })) || [];

  // Sales by cashier
  const cashierSales = isDemoMode
    ? DEMO_CASHIER_SALES
    : dashboardData?.cashier_sales || [];

  // Top selling products
  const topProducts = isDemoMode
    ? DEMO_TOP_PRODUCTS
    : dashboardData?.top_products?.map((p: any) => ({
        name: p.product?.name || 'Unknown',
        sku: p.product?.sku || '',
        qty: Number(p.total_qty) || 0,
        revenue: Number(p.total_revenue) || 0,
      })) || [];

  // Derive inventory summary from the array for demo mode
  const inventorySummary = isDemoMode ? {
    totalItems: DEMO_INVENTORY_ANALYTICS.reduce((sum, i) => sum + i.qty_on_hand, 0),
    lowStockItems: DEMO_INVENTORY_ANALYTICS.filter(i => i.qty_on_hand <= i.reorder_level).length,
    outOfStockItems: DEMO_INVENTORY_ANALYTICS.filter(i => i.qty_on_hand === 0).length,
    totalValue: DEMO_INVENTORY_ANALYTICS.reduce((sum, i) => sum + i.qty_on_hand * 499.99, 0),
  } : { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalValue: 0 };

  // Register sales
  const registerSales = isDemoMode
    ? []
    : dashboardData?.register_sales || [];

  // Summary stats
  const totalSales = dailySales?.reduce((sum, d) => sum + d.sales, 0) || 0;
  const totalOrders = dailySales?.reduce((sum, d) => sum + d.orders, 0) || 0;
  const totalVat = dailySales?.reduce((sum, d) => sum + d.vat, 0) || 0;
  const posTotal = dailySales?.reduce((sum, d) => sum + d.posTotal, 0) || 0;
  const webTotal = dailySales?.reduce((sum, d) => sum + d.webTotal, 0) || 0;

  return (
    <AdminLayout>
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <TabsList>
              <TabsTrigger value="7">7 Days</TabsTrigger>
              <TabsTrigger value="30">30 Days</TabsTrigger>
              <TabsTrigger value="90">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
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
            <div className="text-2xl font-bold">{DEMO_REPAIR_ANALYTICS.openTickets}</div>
            <p className="text-xs text-muted-foreground">
              Avg turnaround: {DEMO_REPAIR_ANALYTICS.avgTurnaround} days
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="registers">Registers</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="repairs">Repairs</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sales by Day</CardTitle>
                <Button variant="ghost" size="sm">
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
                    {dailySales?.map((day) => (
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
                <Button variant="ghost" size="sm">
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
                        <TableCell className="text-right font-bold">${staff.total.toFixed(2)}</TableCell>
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
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <span className="font-medium">Gross Sales (incl. VAT)</span>
                  <span className="text-2xl font-bold">${totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg text-primary">
                  <span className="font-medium">VAT Collected (10%)</span>
                  <span className="text-2xl font-bold">${totalVat.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Products</CardTitle>
                <Button variant="ghost" size="sm">
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
                        <TableCell className="text-right font-bold">${prod.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="registers" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sales by Register</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {registerSales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No register sales data for this period</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Register</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Avg/Transaction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registerSales.map((reg: any) => (
                        <TableRow key={reg.register}>
                          <TableCell className="font-medium">{reg.register}</TableCell>
                          <TableCell className="text-right">{reg.count}</TableCell>
                          <TableCell className="text-right font-bold">${Number(reg.total).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ${reg.count > 0 ? (Number(reg.total) / Number(reg.count)).toFixed(2) : '0.00'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Register Summary</CardTitle>
                <CardDescription>Performance overview ({days} days)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Active Registers</span>
                    <span className="font-bold">{registerSales.length}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span>Total POS Revenue</span>
                    <span className="font-bold">
                      ${registerSales.reduce((sum: number, r: any) => sum + Number(r.total), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span>Total Transactions</span>
                    <span className="font-bold">
                      {registerSales.reduce((sum: number, r: any) => sum + Number(r.count), 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stock Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Items</span>
                    <span className="font-bold">{inventorySummary.totalItems}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span>Low Stock Alert</span>
                    <Badge variant="destructive">{inventorySummary.lowStockItems} items</Badge>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2 text-muted-foreground">
                    <span>Out of Stock</span>
                    <span>{inventorySummary.outOfStockItems}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span>Total Value</span>
                    <span className="font-bold">${inventorySummary.totalValue.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Valuation</CardTitle>
                <CardDescription>By Category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Valuation Chart Placeholder</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="repairs" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Repair Backlog</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>In Progress</span>
                    <span className="font-bold">{DEMO_REPAIR_ANALYTICS.openTickets}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span>Ready for Pickup</span>
                    <span className="font-bold text-success">{DEMO_REPAIR_ANALYTICS.statusCounts.ready_for_pickup}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span>Pending Parts</span>
                    <span className="font-bold text-amber-500">{DEMO_REPAIR_ANALYTICS.statusCounts.awaiting_parts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-center py-4">
                  <div className="text-4xl font-bold">{DEMO_REPAIR_ANALYTICS.avgTurnaround} Days</div>
                  <p className="text-sm text-muted-foreground">Average turnaround time</p>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-primary" style={{ width: '85%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Retention</CardTitle>
                <CardDescription>New vs Returning customers</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg m-4">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Retention Chart Placeholder</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>By lifetime value</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEMO_CUSTOMER_ANALYTICS.topCustomers.map((customer) => (
                      <TableRow key={customer.name}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell className="text-right">{customer.orderCount}</TableCell>
                        <TableCell className="text-right font-medium">${customer.totalSpent.toFixed(2)}</TableCell>
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
    </AdminLayout>
  );
}
