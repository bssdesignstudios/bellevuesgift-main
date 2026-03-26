import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, User, Users, Phone, Mail, MapPin, Home, Star, ShoppingBag, Loader2, Crown, Award, KeyRound, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  island: string | null;
  address: string | null;
  customer_tier: string | null;
  loyalty_points: number;
  tier_discount: string | null;
  is_favorite: boolean;
  orders_count: number;
  created_at: string;
  orders?: Array<{
    id: string;
    order_number: string;
    channel: string;
    status: string;
    payment_status: string;
    total: string | number;
    created_at: string;
  }>;
}

interface QuoteRecord {
  id: string;
  quote_number: string;
  customer_id: string | null;
  status: string;
  total: number;
  issued_at: string | null;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  status: string;
  total: number;
  balance_due: number;
  issued_at: string | null;
}

interface LedgerEntry {
  id: string;
  entry_type: string;
  amount: number;
  balance_after: number | null;
  running_balance: number | null;
  invoice_number: string | null;
  entry_date: string;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: typeof Star }> = {
  retail: { label: 'Retail', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: User },
  school: { label: 'School', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Award },
  corporate: { label: 'Corporate', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: ShoppingBag },
  vip: { label: 'VIP', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Crown },
};

function getTierBadge(tier: string | null) {
  const config = TIER_CONFIG[tier || 'retail'] || TIER_CONFIG.retail;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`text-xs ${config.color}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function getStatusBadge(status: string) {
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
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize ${colors[status] || 'bg-secondary text-secondary-foreground'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailData, setDetailData] = useState<Customer | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [resetError, setResetError] = useState<string>('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers', search, tierFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (tierFilter !== 'all') params.tier = tierFilter;
      const { data } = await axios.get('/api/admin/customers', { params });
      return data as Customer[];
    }
  });

  const openDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoadingDetail(true);
    setResetStatus('idle');
    setResetError('');
    try {
      const { data } = await axios.get(`/api/admin/customers/${customer.id}`);
      setDetailData(data);
    } catch {
      setDetailData(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSendPasswordReset = async (customerId: string) => {
    setResetStatus('loading');
    setResetError('');
    try {
      await axios.post(`/api/admin/customers/${customerId}/send-password-reset`);
      setResetStatus('sent');
    } catch (err: any) {
      setResetStatus('error');
      setResetError(err.response?.data?.message || 'Failed to send reset email.');
    }
  };

  const detail = detailData || selectedCustomer;

  const customerId = detail?.id || '';

  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['admin-quotes', customerId],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/quotes', { params: { customer_id: customerId } });
      return data as QuoteRecord[];
    },
    enabled: !!customerId,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['admin-invoices', customerId],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/invoices', { params: { customer_id: customerId } });
      return data as InvoiceRecord[];
    },
    enabled: !!customerId,
  });

  const { data: ledgerResponse, isLoading: ledgerLoading } = useQuery({
    queryKey: ['admin-ledger', customerId],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/ledger-entries', { params: { customer_id: customerId } });
      return data as { entries: LedgerEntry[] };
    },
    enabled: !!customerId,
  });

  const recentQuotes = useMemo(() => {
    return (quotes || []).filter((quote) => quote.customer_id === customerId).slice(0, 5);
  }, [quotes, customerId]);

  const recentInvoices = useMemo(() => {
    return (invoices || []).filter((invoice) => invoice.customer_id === customerId).slice(0, 5);
  }, [invoices, customerId]);

  const ledgerEntries = ledgerResponse?.entries || [];
  const recentLedger = ledgerEntries.slice(-5).reverse();
  const currentBalance = ledgerEntries.length
    ? (ledgerEntries[ledgerEntries.length - 1].balance_after ?? ledgerEntries[ledgerEntries.length - 1].running_balance)
    : null;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Customers</h1>
          <span className="text-sm text-muted-foreground">
            {customers?.length ?? 0} customer{customers?.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="school">School</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Island</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading customers...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && customers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && customers?.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetail(customer)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {customer.is_favorite && (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                      <span className="font-medium">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {customer.phone && (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </span>
                      )}
                      {!customer.phone && !customer.email && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{customer.island || '—'}</TableCell>
                  <TableCell>{getTierBadge(customer.customer_tier)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="tabular-nums">
                      {customer.orders_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(customer.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* CUSTOMER DETAIL MODAL */}
        <Dialog open={!!selectedCustomer} onOpenChange={() => { setSelectedCustomer(null); setDetailData(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-50">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <span>{selectedCustomer?.name}</span>
                {selectedCustomer?.is_favorite && (
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                )}
              </DialogTitle>
            </DialogHeader>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading details...
              </div>
            ) : detail && (
              <div className="space-y-6">
                {/* CUSTOMER INFO CARD */}
                <Card className="border-l-4 border-l-blue-400">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTierBadge(detail.customer_tier)}
                      {detail.loyalty_points > 0 && (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Award className="h-3 w-3 mr-1" />
                          {detail.loyalty_points} pts
                        </Badge>
                      )}
                      {detail.tier_discount && Number(detail.tier_discount) > 0 && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          {Number(detail.tier_discount)}% discount
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {detail.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{detail.email}</span>
                        </div>
                      )}
                      {detail.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{detail.phone}</span>
                        </div>
                      )}
                      {detail.island && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{detail.island}</span>
                        </div>
                      )}
                      {detail.address && (
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{detail.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <span>Customer since {format(new Date(detail.created_at), 'MMMM d, yyyy')}</span>
                      <span className="font-medium">{detail.orders_count} order{detail.orders_count !== 1 ? 's' : ''}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* RECENT ORDERS */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Recent Orders
                  </h3>
                  {detail.orders && detail.orders.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono font-medium text-sm">{order.order_number}</TableCell>
                              <TableCell className="text-sm">{format(new Date(order.created_at), 'MMM d, HH:mm')}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs capitalize">{order.channel}</Badge>
                              </TableCell>
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${order.payment_status === 'paid' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}`}>
                                  {order.payment_status}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-bold">${Number(order.total).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic py-4 text-center border rounded-lg">
                      No orders yet
                    </div>
                  )}
                </div>

                {/* CUSTOMER FINANCIAL HUB */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Customer Financial Hub
                  </h3>
                  {(quotesLoading || invoicesLoading || ledgerLoading) && (
                    <div className="text-sm text-muted-foreground mb-3">
                      Loading financial activity...
                    </div>
                  )}
                  <div className="grid gap-4">
                    <Card>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground">Current Balance</div>
                          <div className="text-2xl font-bold">
                            {currentBalance !== null ? `$${Number(currentBalance).toFixed(2)}` : '—'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { window.location.href = `/admin/quotes?customer_id=${encodeURIComponent(detail.id)}`; }}>
                            Create Quote
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { window.location.href = `/admin/invoices?customer_id=${encodeURIComponent(detail.id)}`; }}>
                            Create Invoice
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { window.location.href = `/admin/statements/share?customer_id=${encodeURIComponent(detail.id)}`; }}>
                            View Statement
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground mb-2">Recent Quotes</div>
                          {recentQuotes.length ? (
                            <div className="space-y-2">
                              {recentQuotes.map((quote) => (
                                <div key={quote.id} className="flex items-center justify-between text-sm">
                                  <span className="font-mono">{quote.quote_number}</span>
                                  <span>${Number(quote.total).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No quotes yet</div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground mb-2">Recent Invoices</div>
                          {recentInvoices.length ? (
                            <div className="space-y-2">
                              {recentInvoices.map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between text-sm">
                                  <span className="font-mono">{invoice.invoice_number}</span>
                                  <span>${Number(invoice.balance_due).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No invoices yet</div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground mb-2">Recent Ledger</div>
                          {recentLedger.length ? (
                            <div className="space-y-2">
                              {recentLedger.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between text-sm">
                                  <span className="capitalize">{entry.entry_type}</span>
                                  <span>${Number(entry.amount).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No ledger entries</div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="flex gap-2 flex-wrap border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/admin/orders?search=${encodeURIComponent(detail.name)}`;
                    }}
                  >
                    <ShoppingBag className="h-4 w-4 mr-1" />
                    View All Orders
                  </Button>

                  {detail.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resetStatus === 'loading' || resetStatus === 'sent'}
                      onClick={() => {
                        if (resetStatus === 'sent') return;
                        if (confirm(`Send a password reset email to ${detail.email}?`)) {
                          handleSendPasswordReset(detail.id);
                        }
                      }}
                    >
                      {resetStatus === 'loading' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Sending…
                        </>
                      ) : resetStatus === 'sent' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-600" />
                          Reset Email Sent
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4 mr-1" />
                          Send Password Reset
                        </>
                      )}
                    </Button>
                  )}
                  {resetStatus === 'error' && (
                    <p className="text-xs text-destructive w-full mt-1">{resetError}</p>
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
