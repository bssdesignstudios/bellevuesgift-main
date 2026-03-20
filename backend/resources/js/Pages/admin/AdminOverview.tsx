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
  Plus,
  Clock,
  Wallet,
  CheckCircle2,
  TrendingUp,
  Award,
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

  const statCards = [
    {
      label: 'Sales Today',
      value: `$${d.sales_today.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      label: 'Orders',
      value: d.orders_today,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      label: 'Low Stock',
      value: d.low_stock_count,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      href: '/admin/inventory?stockFilter=low',
    },
    {
      label: 'Out of Stock',
      value: d.out_of_stock_count,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      href: '/admin/inventory?stockFilter=out',
    },
    {
      label: 'Staff on Shift',
      value: d.staff_on_shift,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    },
  ];

  const actionCards = [
    {
      label: 'Fix Low Stock',
      count: d.low_stock_count,
      href: '/admin/inventory?stockFilter=low',
      borderColor: 'border-l-amber-400',
      badgeColor: 'bg-amber-100 text-amber-700',
      icon: AlertTriangle,
    },
    {
      label: 'Review Orders',
      count: d.pending_orders,
      href: '/admin/orders',
      borderColor: 'border-l-blue-400',
      badgeColor: 'bg-blue-100 text-blue-700',
      icon: ShoppingCart,
    },
    {
      label: 'Complete Repairs',
      count: d.open_repairs,
      href: '/admin/repairs',
      borderColor: 'border-l-purple-400',
      badgeColor: 'bg-purple-100 text-purple-700',
      icon: Wrench,
    },
  ];

  const quickActions = [
    { label: 'New Order', href: '/pos', icon: Plus },
    { label: 'Adjust Inventory', href: '/admin/inventory', icon: Package },
    { label: 'Add Expense', href: '/admin/expenses', icon: Wallet },
    { label: 'Timesheets', href: '/admin/timesheets', icon: Clock },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Operations Dashboard</h1>
            <p className="text-muted-foreground">{today}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
                  className={`${card.border} border ${card.href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
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
                    className={`border-l-4 ${action.borderColor} ${
                      isCleared ? 'opacity-60' : 'hover:shadow-md'
                    } transition-shadow cursor-pointer`}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">
                          {action.label}
                        </span>
                      </div>
                      {isCleared ? (
                        <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          All clear
                        </div>
                      ) : (
                        <Badge className={action.badgeColor}>
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
