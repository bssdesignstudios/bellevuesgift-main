import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Eye, ShoppingCart, User, Phone, Mail, MapPin, Store, Globe, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Order, OrderItem } from '@/types';
import { ORDER_STATUSES } from '@/lib/constants';
import { usePage } from '@inertiajs/react';
import { AdminLayout } from '@/components/admin/AdminLayout';

function getCustomerType(order: Order): { label: string; color: string } {
  if (!order.customer_id) {
    return { label: 'Walk-in', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  }
  if (order.channel === 'pos') {
    return { label: 'In-Store', color: 'bg-purple-100 text-purple-700 border-purple-200' };
  }
  if (order.channel === 'web') {
    return { label: 'Online', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  }
  return { label: 'Registered', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
}

export default function AdminOrders() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const queryClient = useQueryClient();
  const pageProps = usePage().props as any;
  const effectiveStaff = pageProps?.auth?.staff ?? null;

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders', search, statusFilter, channelFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (channelFilter !== 'all') params.channel = channelFilter;
      if (search) params.search = search;
      const { data } = await axios.get('/api/admin/orders', { params });
      return data as Order[];
    }
  });

  const openDetail = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingDetail(true);
    try {
      const { data } = await axios.get(`/api/admin/orders/${order.id}`);
      setDetailData(data);
    } catch {
      setDetailData(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await axios.patch(`/api/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder(null);
      setDetailData(null);
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
      completed: 'bg-success text-success-foreground',
      cancelled: 'bg-destructive text-destructive-foreground',
      refunded: 'bg-destructive text-destructive-foreground',
    };
    return <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize ${colors[status] || 'bg-secondary text-secondary-foreground'}`}>{status.replace('_', ' ')}</span>;
  };

  const isAdmin = effectiveStaff?.role === 'admin';

  // Use detail data for the modal (has full customer + staff loaded), fallback to selectedOrder
  const detail = detailData || selectedOrder;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Orders</h1>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search order #, customer name, email, phone..."
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
                <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
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
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    Loading orders...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && orders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && orders?.map((order) => {
                const ct = getCustomerType(order);
                return (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(order)}>
                    <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                    <TableCell className="text-sm">{format(new Date(order.created_at), 'MMM d, HH:mm')}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{order.customer?.name || 'Walk-in'}</span>
                        {order.customer?.phone && (
                          <span className="block text-xs text-muted-foreground">{order.customer.phone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${ct.color}`}>{ct.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {order.channel === 'pos' ? <><Store className="h-3 w-3 mr-1" />POS</> : <><Globe className="h-3 w-3 mr-1" />Web</>}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${order.payment_status === 'paid' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}`}>
                        {order.payment_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">${Number(order.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetail(order); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* ORDER DETAIL MODAL */}
        <Dialog open={!!selectedOrder} onOpenChange={() => { setSelectedOrder(null); setDetailData(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                Order {selectedOrder?.order_number}
                {selectedOrder && getStatusBadge(selectedOrder.status)}
              </DialogTitle>
            </DialogHeader>
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading details...
              </div>
            ) : detail && (
              <div className="space-y-6">
                {/* CUSTOMER INFO BLOCK */}
                <Card className="border-l-4 border-l-blue-400">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer</p>
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-full bg-blue-50">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{detail.customer?.name || 'Walk-in Customer'}</span>
                          {(() => {
                            const ct = getCustomerType(detail);
                            return <Badge variant="outline" className={`text-xs ${ct.color}`}>{ct.label}</Badge>;
                          })()}
                          {detail.customer?.customer_tier && detail.customer.customer_tier !== 'retail' && (
                            <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs capitalize">{detail.customer.customer_tier}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {detail.customer?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {detail.customer.email}
                            </span>
                          )}
                          {detail.customer?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {detail.customer.phone}
                            </span>
                          )}
                          {detail.customer?.island && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {detail.customer.island}
                            </span>
                          )}
                        </div>
                        {!detail.customer && (
                          <p className="text-sm text-muted-foreground italic">No customer record — walk-in or guest checkout</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ORDER METADATA */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground">Channel</div>
                    <div className="capitalize mt-0.5">{detail.channel === 'pos' ? 'Point of Sale' : 'Web Store'}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Fulfillment</div>
                    <div className="capitalize mt-0.5">{detail.fulfillment_method?.replace(/_/g, ' ') || '—'}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Payment</div>
                    <div className="capitalize mt-0.5">{detail.payment_method?.replace(/_/g, ' ') || '—'}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Staff</div>
                    <div className="mt-0.5">{detail.staff?.name || '—'}</div>
                  </div>
                </div>

                {detail.notes && (
                  <div className="text-sm p-3 bg-muted rounded-md">
                    <span className="font-medium text-muted-foreground">Notes: </span>
                    {detail.notes}
                  </div>
                )}

                {/* LINE ITEMS */}
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
                      {detail.items?.map((item: any) => (
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

                {/* TOTALS */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${Number(detail.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT</span>
                    <span>${Number(detail.vat_amount).toFixed(2)}</span>
                  </div>
                  {detail.discount_amount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span>-${Number(detail.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>${Number(detail.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* STATUS ACTIONS */}
                <div className="flex gap-2 flex-wrap border-t pt-4">
                  {detail.status === 'pending' && (
                    <Button onClick={() => updateStatus.mutate({ orderId: detail.id, status: 'confirmed' })} disabled={updateStatus.isPending}>
                      Confirm Order
                    </Button>
                  )}
                  {detail.status === 'confirmed' && (
                    <Button onClick={() => updateStatus.mutate({ orderId: detail.id, status: 'picking' })} disabled={updateStatus.isPending}>
                      Start Picking
                    </Button>
                  )}
                  {detail.status === 'picking' && (
                    <Button onClick={() => updateStatus.mutate({ orderId: detail.id, status: 'ready' })} disabled={updateStatus.isPending}>
                      Mark Ready
                    </Button>
                  )}
                  {detail.status === 'ready' && (
                    <>
                      <Button onClick={() => updateStatus.mutate({ orderId: detail.id, status: 'picked_up' })} disabled={updateStatus.isPending}>
                        Mark Picked Up
                      </Button>
                      <Button variant="outline" onClick={() => updateStatus.mutate({ orderId: detail.id, status: 'shipped' })} disabled={updateStatus.isPending}>
                        Mark Shipped
                      </Button>
                    </>
                  )}
                  {isAdmin && !['cancelled', 'refunded', 'completed', 'delivered'].includes(detail.status) && (
                    <Button
                      variant="destructive"
                      disabled={updateStatus.isPending}
                      onClick={() => {
                        if (confirm('Cancel this order? Inventory will be restored.')) {
                          updateStatus.mutate({ orderId: detail.id, status: 'cancelled' });
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
