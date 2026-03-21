import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Download, TrendingUp, TrendingDown, Minus, DollarSign, Package, Users,
  Wrench, BarChart3, ShoppingBag, CreditCard, Store, Globe, Crown,
  Loader2, ArrowUpRight, ArrowDownRight, Layers, Printer
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SOPHelper } from '@/components/admin/SOPHelper';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';

// ── Types ──

interface DailySale {
  date: string;
  sales: number;
  orders: number;
  vat: number;
  pos_total: number;
  web_total: number;
  pos_count: number;
  web_count: number;
}

interface CashierSale {
  name: string;
  total: number;
  count: number;
  avg_value: number;
}

interface TopProduct {
  name: string;
  sku: string;
  category: string;
  total_qty: number;
  total_revenue: number;
}

interface CategoryPerf {
  category: string;
  order_count: number;
  units_sold: number;
  revenue: number;
}

interface RegisterSale {
  register: string;
  total: number;
  count: number;
  avg_value: number;
}

interface PaymentMethod {
  method: string;
  count: number;
  total: number;
}

interface TopCustomer {
  name: string;
  email: string;
  phone: string;
  tier: string;
  order_count: number;
  total_spent: number;
  avg_order: number;
}

interface ChannelSummary {
  channel: string;
  orders: number;
  revenue: number;
}

interface ReportStats {
  total_sales: number;
  order_count: number;
  avg_order_value: number;
  prev_total_sales: number;
  prev_order_count: number;
  prev_avg_order_value: number;
  daily_sales: DailySale[];
  cashier_sales: CashierSale[];
  top_products: TopProduct[];
  category_performance: CategoryPerf[];
  register_sales: RegisterSale[];
  payment_methods: PaymentMethod[];
  channel_summary: ChannelSummary[];
  top_customers: TopCustomer[];
  inventory_summary: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalValue: number;
  };
  repair_analytics: {
    openTickets: number;
    avgTurnaround: number;
    statusCounts: Record<string, number>;
  };
  gift_card_stats: {
    sold: number;
    total_issued: number;
    total_redeemed: number;
    active_count: number;
  };
  discount_stats: {
    orders_with_discount: number;
    total_discount_value: number;
    active_coupons: number;
    total_coupons: number;
  };
}

// ── Helpers ──

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function trendPercent(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) return { value: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' };
  const pct = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(Math.round(pct)),
    direction: pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat',
  };
}

function TrendBadge({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  const t = trendPercent(current, previous);
  if (t.direction === 'flat') return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" />No change</span>;
  const isPositive = invert ? t.direction === 'down' : t.direction === 'up';
  return (
    <span className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {t.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {t.value}% vs prev {'\u00B7'} period
    </span>
  );
}

function exportCSV(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const escape = (val: any) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = data.map(row => headers.map(h => escape(row[h])).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bellevue_${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Custom Tooltip ──
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">
            {typeof p.value === 'number' && p.name !== 'Orders' ? `$${fmt(p.value)}` : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── Main Component ──

export default function AdminReports() {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('7');
  const days = parseInt(dateRange);

  const { data: stats, isLoading } = useQuery<ReportStats>({
    queryKey: ['admin-reports-dashboard', days],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/reports/dashboard', { params: { days } });
      return data;
    }
  });

  const totalVat = useMemo(() =>
    stats?.daily_sales?.reduce((sum, d) => sum + d.vat, 0) ?? 0,
    [stats?.daily_sales]
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px] gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading reports...
        </div>
      </AdminLayout>
    );
  }

  if (!stats) return null;

  const posRevenue = stats.channel_summary?.find(c => c.channel === 'pos')?.revenue ?? 0;
  const webRevenue = stats.channel_summary?.find(c => c.channel === 'web')?.revenue ?? 0;
  const posOrders = stats.channel_summary?.find(c => c.channel === 'pos')?.orders ?? 0;
  const webOrders = stats.channel_summary?.find(c => c.channel === 'web')?.orders ?? 0;

  return (
    <AdminLayout>
      <style>{`
        @media print {
          nav, aside, [data-print-hide], button { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
      <div className="p-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground text-sm">
              Business intelligence for the last {days} days
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(['7', '30', '90'] as const).map(range => (
              <Button
                key={range}
                variant="outline"
                size="sm"
                onClick={() => setDateRange(range)}
                className={dateRange === range ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
              >
                {range}d
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => window.print()} data-print-hide>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* ── SUMMARY CARDS WITH TRENDS ── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${fmt(stats.total_sales)}</div>
              <TrendBadge current={stats.total_sales} previous={stats.prev_total_sales} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.order_count}</div>
              <TrendBadge current={stats.order_count} previous={stats.prev_order_count} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${fmt(stats.avg_order_value)}</div>
              <TrendBadge current={stats.avg_order_value} previous={stats.prev_avg_order_value} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">VAT Collected</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${fmt(totalVat)}</div>
              <p className="text-xs text-muted-foreground">10% VAT rate</p>
            </CardContent>
          </Card>
        </div>

        {/* ── CHANNEL SPLIT ── */}
        <div className="grid gap-4 grid-cols-2">
          <Card className="border-l-4 border-l-purple-400">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Store className="h-4 w-4" /> POS Sales
              </div>
              <div className="text-xl font-bold">${fmt(posRevenue)}</div>
              <p className="text-xs text-muted-foreground">{posOrders} orders</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Globe className="h-4 w-4" /> Web Sales
              </div>
              <div className="text-xl font-bold">${fmt(webRevenue)}</div>
              <p className="text-xs text-muted-foreground">{webOrders} orders</p>
            </CardContent>
          </Card>
        </div>

        {/* ── TABBED SECTIONS ── */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="sales">Sales Trends</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="cashiers">Cashiers</TabsTrigger>
            <TabsTrigger value="registers">Registers</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
          </TabsList>

          {/* ═══ SALES TRENDS TAB ═══ */}
          <TabsContent value="sales" className="space-y-4">
            {/* Sales Over Time Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Revenue Over Time</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(
                  stats.daily_sales.map(d => ({
                    Date: d.date,
                    'Total Sales': d.sales,
                    'POS Revenue': d.pos_total,
                    'Web Revenue': d.web_total,
                    Orders: d.orders,
                    'POS Orders': d.pos_count,
                    'Web Orders': d.web_count,
                    VAT: d.vat,
                  })),
                  'daily_sales'
                )}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                {stats.daily_sales.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.daily_sales} barGap={0}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Bar dataKey="pos_total" name="POS" fill="#8b5cf6" radius={[2, 2, 0, 0]} stackId="stack" />
                      <Bar dataKey="web_total" name="Web" fill="#3b82f6" radius={[2, 2, 0, 0]} stackId="stack" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-12">No sales data for this period</div>
                )}
              </CardContent>
            </Card>

            {/* Orders Over Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Orders Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.daily_sales.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={stats.daily_sales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="orders" name="Orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="pos_count" name="POS Orders" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="web_count" name="Web Orders" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-12">No data</div>
                )}
              </CardContent>
            </Card>

            {/* Daily Sales Table */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">POS</TableHead>
                      <TableHead className="text-right">Web</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.daily_sales.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">{day.date}</TableCell>
                        <TableCell className="text-right">{day.orders}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${fmt(day.pos_total)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${fmt(day.web_total)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${fmt(day.vat)}</TableCell>
                        <TableCell className="text-right font-bold">${fmt(day.sales)}</TableCell>
                      </TableRow>
                    ))}
                    {stats.daily_sales.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{stats.daily_sales.reduce((s, d) => s + d.orders, 0)}</TableCell>
                        <TableCell className="text-right">${fmt(stats.daily_sales.reduce((s, d) => s + d.pos_total, 0))}</TableCell>
                        <TableCell className="text-right">${fmt(stats.daily_sales.reduce((s, d) => s + d.web_total, 0))}</TableCell>
                        <TableCell className="text-right">${fmt(totalVat)}</TableCell>
                        <TableCell className="text-right">${fmt(stats.total_sales)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ PRODUCTS TAB ═══ */}
          <TabsContent value="products" className="space-y-4">
            {/* Top Products Bar Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Products by Quantity Sold</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(
                  stats.top_products.map(p => ({
                    Product: p.name,
                    SKU: p.sku,
                    Category: p.category,
                    'Qty Sold': p.total_qty,
                    Revenue: p.total_revenue,
                  })),
                  'top_products'
                )}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                {stats.top_products.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(250, stats.top_products.length * 35)}>
                    <BarChart data={stats.top_products.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 18) + '...' : v} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="total_qty" name="Qty Sold" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-12">No product data</div>
                )}
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
              <CardHeader>
                <CardTitle>Product Performance Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.top_products.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{p.sku || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{p.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{p.total_qty}</TableCell>
                        <TableCell className="text-right font-bold">${fmt(p.total_revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${p.total_qty > 0 ? fmt(p.total_revenue / p.total_qty) : '0.00'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {stats.top_products.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No product sales in this period</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ CATEGORIES TAB ═══ */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Category Performance</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(
                  stats.category_performance.map(c => ({
                    Category: c.category,
                    'Units Sold': c.units_sold,
                    'Orders Containing': c.order_count,
                    Revenue: c.revenue,
                  })),
                  'category_performance'
                )}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                {stats.category_performance.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.category_performance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }}
                          tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 10) + '..' : v} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <Table className="mt-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Units Sold</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const totalRev = stats.category_performance.reduce((s, c) => s + c.revenue, 0);
                          return stats.category_performance.map((c, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{c.category}</TableCell>
                              <TableCell className="text-right">{c.units_sold}</TableCell>
                              <TableCell className="text-right">{c.order_count}</TableCell>
                              <TableCell className="text-right font-bold">${fmt(c.revenue)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full"
                                      style={{ width: `${totalRev > 0 ? (c.revenue / totalRev * 100) : 0}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-10 text-right">
                                    {totalRev > 0 ? Math.round(c.revenue / totalRev * 100) : 0}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-12">No category data</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ CASHIERS TAB ═══ */}
          <TabsContent value="cashiers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cashier Performance</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(
                  stats.cashier_sales.map(s => ({
                    'Staff Name': s.name,
                    Transactions: s.count,
                    'Total Revenue': s.total,
                    'Avg Order Value': s.avg_value,
                  })),
                  'cashier_performance'
                )}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                {stats.cashier_sales.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.cashier_sales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend />
                        <Bar dataKey="total" name="Revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <Table className="mt-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Staff Name</TableHead>
                          <TableHead className="text-right">Transactions</TableHead>
                          <TableHead className="text-right">Total Revenue</TableHead>
                          <TableHead className="text-right">Avg Order</TableHead>
                          <TableHead className="text-right">% of POS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const totalPOS = stats.cashier_sales.reduce((s, c) => s + c.total, 0);
                          return stats.cashier_sales.map((s, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell className="text-right">{s.count}</TableCell>
                              <TableCell className="text-right font-bold">${fmt(s.total)}</TableCell>
                              <TableCell className="text-right">${fmt(s.avg_value)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" className="tabular-nums">
                                  {totalPOS > 0 ? Math.round(s.total / totalPOS * 100) : 0}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-12">No POS cashier data for this period</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ REGISTERS TAB ═══ */}
          <TabsContent value="registers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Register Performance</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(
                  stats.register_sales.map(r => ({
                    Register: r.register,
                    Transactions: r.count,
                    'Total Sales': r.total,
                    'Avg Order': r.avg_value,
                  })),
                  'register_performance'
                )}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                {stats.register_sales.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.register_sales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="register" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend />
                        <Bar dataKey="total" name="Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="count" name="Transactions" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <Table className="mt-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Register</TableHead>
                          <TableHead className="text-right">Transactions</TableHead>
                          <TableHead className="text-right">Total Sales</TableHead>
                          <TableHead className="text-right">Avg Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.register_sales.map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{r.register}</TableCell>
                            <TableCell className="text-right">{r.count}</TableCell>
                            <TableCell className="text-right font-bold">${fmt(r.total)}</TableCell>
                            <TableCell className="text-right">${fmt(r.avg_value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-12">No register data for this period</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ CUSTOMERS TAB ═══ */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Customers</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(
                  stats.top_customers.map(c => ({
                    Name: c.name,
                    Email: c.email,
                    Phone: c.phone,
                    Tier: c.tier,
                    Orders: c.order_count,
                    'Total Spent': c.total_spent,
                    'Avg Order': c.avg_order,
                  })),
                  'top_customers'
                )}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead className="text-right">Avg Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.top_customers.map((c, idx) => {
                      const tierColors: Record<string, string> = {
                        vip: 'bg-amber-100 text-amber-700',
                        corporate: 'bg-indigo-100 text-indigo-700',
                        school: 'bg-blue-100 text-blue-700',
                        retail: 'bg-gray-100 text-gray-600',
                      };
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{c.name}</span>
                              {c.phone && <span className="block text-xs text-muted-foreground">{c.phone}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs capitalize ${tierColors[c.tier] || ''}`}>
                              {c.tier}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{c.order_count}</TableCell>
                          <TableCell className="text-right font-bold">${fmt(c.total_spent)}</TableCell>
                          <TableCell className="text-right">${fmt(c.avg_order)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {stats.top_customers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No customer data</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ FINANCE TAB ═══ */}
          <TabsContent value="finance" className="space-y-4">
            {/* Revenue Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Gross Sales</span>
                    <span className="font-bold">${fmt(stats.total_sales)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">VAT Collected</span>
                    <span className="text-muted-foreground">${fmt(totalVat)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-red-600">Discounts Given</span>
                    <span className="text-red-600">-${fmt(stats.discount_stats.total_discount_value)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 text-lg font-bold">
                    <span>Net Revenue (excl. VAT)</span>
                    <span>${fmt(stats.total_sales - totalVat)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.payment_methods.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={stats.payment_methods}
                            dataKey="total"
                            nameKey="method"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ method, percent }: any) =>
                              `${method} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {stats.payment_methods.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => `$${fmt(v)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.payment_methods.map((pm, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium capitalize">{pm.method.replace(/_/g, ' ')}</TableCell>
                            <TableCell className="text-right">{pm.count}</TableCell>
                            <TableCell className="text-right font-bold">${fmt(pm.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">No payment data</div>
                )}
              </CardContent>
            </Card>

            {/* Discounts & Coupons */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Discounts & Coupons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Orders with discounts</span>
                    <span className="font-medium">{stats.discount_stats.orders_with_discount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total discount value</span>
                    <span className="font-medium text-red-600">${fmt(stats.discount_stats.total_discount_value)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active coupons</span>
                    <span className="font-medium">{stats.discount_stats.active_coupons} / {stats.discount_stats.total_coupons}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gift Cards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cards sold (period)</span>
                    <span className="font-medium">{stats.gift_card_stats.sold}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance issued (period)</span>
                    <span className="font-medium">${fmt(stats.gift_card_stats.total_issued)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total redeemed (all time)</span>
                    <span className="font-medium">${fmt(stats.gift_card_stats.total_redeemed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active cards</span>
                    <span className="font-medium">{stats.gift_card_stats.active_count}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Inventory & Repairs Summary */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inventory Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total SKUs tracked</span>
                    <span className="font-medium">{stats.inventory_summary.totalItems}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Low stock items</span>
                    <span className="font-medium text-amber-600">{stats.inventory_summary.lowStockItems}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Out of stock</span>
                    <span className="font-medium text-red-600">{stats.inventory_summary.outOfStockItems}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Total inventory value</span>
                    <span className="font-bold">${fmt(stats.inventory_summary.totalValue)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Repairs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Open tickets</span>
                    <span className="font-medium text-amber-600">{stats.repair_analytics.openTickets}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg turnaround</span>
                    <span className="font-medium">{stats.repair_analytics.avgTurnaround} days</span>
                  </div>
                  {Object.entries(stats.repair_analytics.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{status.replace(/_/g, ' ')}</span>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <SOPHelper context="reports" />
    </AdminLayout>
  );
}
