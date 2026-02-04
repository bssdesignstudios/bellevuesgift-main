import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Download, TrendingUp, DollarSign, Package, Users, Wrench, BarChart3, Clock, Star } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface ReportStats {
  total_sales: number;
  order_count: number;
  avg_order_value: number;
  daily_sales: Array<{ date: string; sales: number; orders: number; vat: number; posTotal?: number; webTotal?: number }>;
  cashier_sales: Array<{ name: string; total: number; count: number }>;
  top_products: Array<{ product?: { name: string; sku: string }; total_qty: number; total_revenue: number }>;
  repair_analytics?: {
    openTickets: number;
    avgTurnaround: number;
    totalRevenue: number;
    statusCounts: Record<string, number>;
  };
}

export default function AdminReports() {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('7');
  const days = parseInt(dateRange);

  const { data: reportData, isLoading } = useQuery<ReportStats>({
    queryKey: ['admin-reports-dashboard', days],
    queryFn: async () => {
      const response = await axios.get('/api/admin/reports/dashboard', {
        params: { days }
      });
      return response.data;
    }
  });

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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  const stats = reportData;
  const totalSales = stats?.total_sales || 0;
  const totalOrders = stats?.order_count || 0;
  const totalVat = stats?.daily_sales?.reduce((sum, d) => sum + Number(d.vat), 0) || 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Comprehensive business intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            {(['7', '30', '90'] as const).map(range => (
              <Button
                key={range}
                variant="outline"
                size="sm"
                onClick={() => setDateRange(range)}
                className={dateRange === range ? 'bg-primary text-primary-foreground' : ''}
              >
                {range} Days
              </Button>
            ))}
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
              <div className="text-2xl font-bold">${Number(totalSales).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Paid orders only</p>
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
              <div className="text-2xl font-bold">${Number(totalVat).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">10% VAT Rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Number(stats?.avg_order_value || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Across all channels</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="cashiers">Cashiers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daily Sales</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportToCSV(stats?.daily_sales || [], 'daily_sales')}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.daily_sales?.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{day.date}</TableCell>
                        <TableCell className="text-right">{day.orders}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${Number(day.vat).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${Number(day.sales).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashiers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Performance by Staff</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportToCSV(stats?.cashier_sales || [], 'cashier_sales')}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Name</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.cashier_sales?.map((s) => (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.count}</TableCell>
                        <TableCell className="text-right font-bold">${Number(s.total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Selling Products</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportToCSV(stats?.top_products || [], 'top_products')}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.top_products?.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{p.product?.name || 'Unknown Product'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.product?.sku}</TableCell>
                        <TableCell className="text-right">{p.total_qty}</TableCell>
                        <TableCell className="text-right font-bold">${Number(p.total_revenue).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
