import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Star, Phone, Mail, MapPin, ShoppingBag, DollarSign, Calendar, Gift, User } from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface CustomerWithFavorite {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  island: string | null;
  is_favorite: boolean;
  loyalty_points: number;
  customer_tier: string | null;
  tier_discount: number | null;
  created_at: string;
}

interface CustomerOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: string;
  channel: string;
  created_at: string;
}

interface CustomerDetail extends CustomerWithFavorite {
  orders: CustomerOrder[];
  order_stats: {
    total_orders: number;
    total_spent: number;
    last_order_at: string | null;
  };
}

// ─── Customer Detail Modal ────────────────────────────────────────────────────

function CustomerDetailModal({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { data: customer, isLoading } = useQuery({
    queryKey: ['admin-customer-detail', customerId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/admin/customers/${customerId}`);
      return data as CustomerDetail;
    },
    enabled: !!customerId,
  });

  return (
    <Dialog open={!!customerId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Profile
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : !customer ? (
          <div className="py-12 text-center text-muted-foreground">Customer not found.</div>
        ) : (
          <div className="space-y-5">
            {/* Identity */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-navy/10 flex items-center justify-center text-xl font-bold text-brand-navy shrink-0">
                {customer.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{customer.name}</h2>
                  {customer.is_favorite && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      <Star className="h-3 w-3 mr-1 fill-current" />VIP
                    </Badge>
                  )}
                  {customer.customer_tier && (
                    <Badge variant="outline" className="capitalize">{customer.customer_tier}</Badge>
                  )}
                </div>
                <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                  {customer.phone && (
                    <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{customer.phone}</div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{customer.email}</div>
                  )}
                  {customer.island && (
                    <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{customer.island}</div>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                Member since {format(new Date(customer.created_at), 'MMM d, yyyy')}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <ShoppingBag className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xl font-bold">{customer.order_stats.total_orders}</div>
                  <div className="text-xs text-muted-foreground">Orders</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xl font-bold">${Number(customer.order_stats.total_spent).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Lifetime Spent</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Gift className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xl font-bold">{customer.loyalty_points ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Loyalty Pts</div>
                </CardContent>
              </Card>
            </div>

            {customer.order_stats.last_order_at && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Last order: {format(new Date(customer.order_stats.last_order_at), 'MMM d, yyyy')}
              </p>
            )}

            {customer.tier_discount && customer.tier_discount > 0 && (
              <p className="text-xs text-blue-600 font-medium">
                Tier discount: {customer.tier_discount}% off
              </p>
            )}

            {/* Order History */}
            <div>
              <h3 className="font-semibold mb-2 text-sm">Order History ({customer.orders.length})</h3>
              {customer.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">No orders yet.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                          <TableCell className="text-sm">{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{order.channel.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              order.status === 'delivered' || order.status === 'picked_up'
                                ? 'bg-green-100 text-green-700'
                                : order.status === 'cancelled' || order.status === 'refunded'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            ${Number(order.total).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const { data: customers } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;

      const { data } = await axios.get('/api/admin/customers', { params });
      return data as CustomerWithFavorite[];
    }
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Customers</h1>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Island</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Loyalty Pts</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
              {customers?.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {customer.is_favorite && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          VIP
                        </Badge>
                      )}
                      {customer.name}
                    </div>
                  </TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{customer.email || '-'}</TableCell>
                  <TableCell>{customer.island || '-'}</TableCell>
                  <TableCell>
                    {customer.customer_tier ? (
                      <Badge variant="outline" className="capitalize text-xs">{customer.customer_tier}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>{customer.loyalty_points ?? 0}</TableCell>
                  <TableCell className="text-sm">{format(new Date(customer.created_at), 'MMM d, yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </AdminLayout>
  );
}
