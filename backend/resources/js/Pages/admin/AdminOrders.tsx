import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Order, OrderItem } from '@/types';
import { ORDER_STATUSES } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoModeEnabled } from '@/lib/demoSession';
import { DEMO_ORDERS } from '@/lib/demoData';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminOrders() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();
  const { effectiveStaff } = useAuth();
  const isDemoMode = isDemoModeEnabled();

  const { data: orders } = useQuery({
    queryKey: ['admin-orders', search, statusFilter, channelFilter, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        let filtered = DEMO_ORDERS as Order[];
        if (statusFilter !== 'all') {
          filtered = filtered.filter(o => o.status === statusFilter);
        }
        if (channelFilter !== 'all') {
          filtered = filtered.filter(o => o.channel === channelFilter);
        }
        if (search) {
          filtered = filtered.filter(o => o.order_number.toLowerCase().includes(search.toLowerCase()));
        }
        return filtered;
      }

      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;

      const { data } = await axios.get('/api/admin/orders', { params });
      // Client-side channel filter (server doesn't support it yet)
      let results = data as Order[];
      if (channelFilter !== 'all') {
        results = results.filter(o => o.channel === channelFilter);
      }
      return results;
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return;
      }

      await axios.patch(`/api/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order updated');
    },
    onError: (error: any) => {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
    }
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-secondary text-secondary-foreground',
      confirmed: 'bg-primary text-primary-foreground',
      picking: 'bg-warning text-warning-foreground',
      ready: 'bg-warning text-warning-foreground',
      picked_up: 'bg-success text-success-foreground',
      shipped: 'bg-success text-success-foreground',
      delivered: 'bg-success text-success-foreground',
      cancelled: 'bg-destructive text-destructive-foreground',
      refunded: 'bg-destructive text-destructive-foreground',
    };
    return <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize ${colors[status] || 'bg-secondary text-secondary-foreground'}`}>{status.replace('_', ' ')}</span>;
  };

  const isAdmin = effectiveStaff?.role === 'admin';

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Orders</h1>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search order number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ORDER_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                  <TableCell>{format(new Date(order.created_at), 'MMM d, HH:mm')}</TableCell>
                  <TableCell>{order.customer?.name || 'Walk-in'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.channel.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${order.payment_status === 'paid' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}`}>
                      {order.payment_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold">${Number(order.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground">Customer</div>
                    <div>{selectedOrder.customer?.name || 'Walk-in'}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Channel</div>
                    <div className="uppercase">{selectedOrder.channel}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Fulfillment</div>
                    <div className="capitalize">{selectedOrder.fulfillment_method?.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Payment Method</div>
                    <div className="capitalize">{selectedOrder.payment_method || 'None'}</div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">{item.qty}</TableCell>
                          <TableCell className="text-right">${Number(item.unit_price).toFixed(2)}</TableCell>
                          <TableCell className="text-right">${Number(item.line_total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (10%)</span>
                    <span>${Number(selectedOrder.vat_amount).toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span>-${Number(selectedOrder.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>${Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {selectedOrder.status === 'pending' && (
                    <Button onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status: 'confirmed' })}>
                      Confirm Order
                    </Button>
                  )}
                  {selectedOrder.status === 'confirmed' && (
                    <Button onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status: 'picking' })}>
                      Start Picking
                    </Button>
                  )}
                  {selectedOrder.status === 'picking' && (
                    <Button onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status: 'ready' })}>
                      Mark Ready
                    </Button>
                  )}
                  {selectedOrder.status === 'ready' && (
                    <>
                      <Button onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status: 'picked_up' })}>
                        Mark Picked Up
                      </Button>
                      <Button variant="outline" onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status: 'shipped' })}>
                        Mark Shipped
                      </Button>
                    </>
                  )}
                  {isAdmin && !['cancelled', 'refunded'].includes(selectedOrder.status) && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Cancel this order?')) {
                          updateStatus.mutate({ orderId: selectedOrder.id, status: 'cancelled' });
                        }
                      }}
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
