import { usePage, router, Link } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  XCircle,
  Users,
  Package,
  Wrench,
  RefreshCw,
  Clock,
  Wallet,
  CheckCircle2,
  TrendingUp,
  Award,
  ArrowRight,
  Warehouse,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { format } from 'date-fns';

interface DashboardData {
  sales_today: number;
  orders_today: number;
  low_stock_count: number;
  out_of_stock_count: number;
  staff_on_shift: number;
  pending_orders: number;
  open_repairs: number;
  top_product: { name: string; qty_sold: number } | null;
  top_cashier: { name: string; revenue: number } | null;
}

export default function AdminOverview() {
  const { dashboard } = usePage<{ dashboard: DashboardData }>().props;
  const d = dashboard;
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  // Determine primary action based on urgency
  const primaryAction = d.out_of_stock_count > 0
    ? { label: 'Fix Inventory', href: '/admin/inventory?stockFilter=out', icon: XCircle }
    : d.pending_orders > 0
    ? { label: 'Review Orders', href: '/admin/orders', icon: ShoppingCart }
    : { label: 'Open Inventory', href: '/admin/inventory', icon: Warehouse };

  // Alert bar items — only show items with counts > 0
  const alerts: Array<{ label: string; count: number; href: string; color: string }> = [];
  if (d.out_of_stock_count > 0) {
    alerts.push({ label: 'out of stock', count: d.out_of_stock_count, href: '/admin/inventory?stockFilter=out', color: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100' });
  }
  if (d.low_stock_count > 0) {
    alerts.push({ label: 'low stock', count: d.low_stock_count, href: '/admin/inventory?stockFilter=low', color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' });
  }
  if (d.pending_orders > 0) {
    alerts.push({ label: 'pending order', count: d.pending_orders, href: '/admin/orders', color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' });
  }
  if (d.open_repairs > 0) {
    alerts.push({ label: 'repair', count: d.open_repairs, href: '/admin/repairs', color: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100' });
  }

  const statCards = [
    {
      label: 'Sales Today',
      value: `$${d.sales_today.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: 'today',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      href: null as string | null,
    },
    {
      label: 'Orders',
      value: d.orders_today,
      sub: 'today',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      href: '/admin/orders?filter=today',
    },
    {
      label: 'Low Stock',
      value: d.low_stock_count,
      sub: d.low_stock_count > 0 ? 'requires review' : 'all clear',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: d.low_stock_count > 0 ? 'border-amber-400 shadow-amber-100 shadow-sm' : 'border-amber-200',
      href: '/admin/inventory?stockFilter=low',
    },
    {
      label: 'Out of Stock',
      value: d.out_of_stock_count,
      sub: d.out_of_stock_count > 0 ? 'requires attention' : 'all clear',
      icon: XCircle,
      color: d.out_of_stock_count > 0 ? 'text-red-700' : 'text-red-600',
      bg: d.out_of_stock_count > 0 ? 'bg-red-100' : 'bg-red-50',
      border: d.out_of_stock_count > 0 ? 'border-red-400 shadow-red-100 shadow-sm ring-1 ring-red-200' : 'border-red-200',
      href: '/admin/inventory?stockFilter=out',
    },
    {
      label: 'Staff on Shift',
      value: d.staff_on_shift,
      sub: 'open now',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      href: '/admin/timesheets?filter=active',
    },
  ];

  const actionCards = [
    {
      label: 'Fix Low Stock',
      count: d.low_stock_count,
      href: '/admin/inventory?stockFilter=low',
      borderColor: 'border-l-amber-400',
      badgeColor: 'bg-amber-100 text-amber-700',
      urgentBorder: d.low_stock_count > 0 ? 'border-amber-200' : '',
      icon: AlertTriangle,
      clearedLabel: 'All clear — view inventory',
    },
    {
      label: 'Review Orders',
      count: d.pending_orders,
      href: '/admin/orders',
      borderColor: 'border-l-blue-400',
      badgeColor: 'bg-blue-100 text-blue-700',
      urgentBorder: d.pending_orders > 0 ? 'border-blue-200' : '',
      icon: ShoppingCart,
      clearedLabel: 'No pending — view orders',
    },
    {
      label: 'Complete Repairs',
      count: d.open_repairs,
      href: '/admin/repairs',
      borderColor: 'border-l-purple-400',
      badgeColor: 'bg-purple-100 text-purple-700',
      urgentBorder: d.open_repairs > 0 ? 'border-purple-200' : '',
      icon: Wrench,
      clearedLabel: 'No open repairs — view all',
    },
  ];

  // Reordered for real usage: Adjust Inventory, New Order, Timesheets, Add Expense
  const quickActions = [
    { label: 'Adjust Inventory', href: '/admin/inventory', icon: Package },
    { label: 'New Order', href: '/pos', icon: ShoppingCart },
    { label: 'Timesheets', href: '/admin/timesheets', icon: Clock },
    { label: 'Add Expense', href: '/admin/expenses', icon: Wallet },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* ALERT BAR */}
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 rounded-lg bg-muted/50 border border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Attention
            </span>
            {alerts.map((alert) => (
              <Link key={alert.label} href={alert.href}>
                <Badge
                  className={`${alert.color} border cursor-pointer transition-colors font-medium`}
                >
                  {alert.count} {alert.count === 1 ? alert.label : `${alert.label}${alert.label.endsWith('k') ? '' : 's'}`}
                  {alert.label === 'repair' && alert.count > 1 ? '' : ''}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Operations Dashboard</h1>
            <p className="text-muted-foreground">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href={primaryAction.href}>
              <Button size="sm">
                <primaryAction.icon className="h-4 w-4 mr-2" />
                {primaryAction.label}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* TODAY'S BUSINESS */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Today's Business
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              const inner = (
                <Card
                  key={card.label}
                  className={`${card.border} border ${card.href ? 'cursor-pointer hover:shadow-md transition-all' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {card.label}
                      </span>
                      <div className={`p-1.5 rounded-md ${card.bg}`}>
                        <Icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${card.color}`}>
                      {card.value}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {card.sub}
                    </div>
                  </CardContent>
                </Card>
              );
              return card.href ? (
                <Link key={card.label} href={card.href}>
                  {inner}
                </Link>
              ) : (
                <div key={card.label}>{inner}</div>
              );
            })}
          </div>
        </section>

        {/* ACTIONS NEEDED */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Actions Needed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {actionCards.map((action) => {
              const Icon = action.icon;
              const isCleared = action.count === 0;
              return (
                <Link key={action.label} href={action.href}>
                  <Card
                    className={`border-l-4 ${action.borderColor} ${action.urgentBorder} hover:shadow-md transition-all cursor-pointer`}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${isCleared ? 'text-muted-foreground' : action.badgeColor.split(' ')[1]}`} />
                        <span className="font-medium">
                          {isCleared ? action.clearedLabel : action.label}
                        </span>
                      </div>
                      {isCleared ? (
                        <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      ) : (
                        <Badge className={`${action.badgeColor} ${action.count > 0 ? 'text-base px-3 py-0.5 font-bold' : ''}`}>
                          {action.count}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* QUICK INSIGHTS */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Product */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Top Product Today
                  </span>
                </div>
                {d.top_product ? (
                  <div>
                    <div className="font-semibold text-lg truncate">
                      {d.top_product.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {d.top_product.qty_sold} units sold
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    No data yet today
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Cashier */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Top Cashier Today
                  </span>
                </div>
                {d.top_cashier ? (
                  <div>
                    <div className="font-semibold text-lg">
                      {d.top_cashier.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${d.top_cashier.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    No data yet today
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <Button variant="outline" size="sm">
                    <Icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
