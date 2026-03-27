import { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Printer, Link2, Mail, TrendingDown, TrendingUp, Search,
  CalendarIcon, X, Filter, DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LedgerEntry {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  entry_type: string;
  reference_type: string | null;
  reference_id: string | null;
  invoice_number: string | null;
  amount: number;
  balance_after: number | null;
  running_balance: number | null;
  notes: string | null;
  entry_date: string;
}

interface LedgerSummary {
  count: number;
  total_charged: number;
  total_paid: number;
  balance: number | null;
}

interface CustomerOption {
  id: string;
  name: string | null;
  email: string | null;
}

// ── Quick date presets ──────────────────────────────────────────────────────
const DATE_PRESETS = [
  { label: 'This month',   from: startOfMonth(new Date()),        to: endOfMonth(new Date()) },
  { label: 'Last month',   from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
  { label: 'Last 3 months',from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) },
  { label: 'This year',    from: startOfYear(new Date()),          to: new Date() },
];

const ENTRY_TYPES = [
  { value: 'all',        label: 'All Types' },
  { value: 'charge',     label: 'Charge' },
  { value: 'payment',    label: 'Payment' },
  { value: 'credit',     label: 'Credit' },
  { value: 'adjustment', label: 'Adjustment' },
];

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    charge:     'bg-orange-100 text-orange-700 border-orange-200',
    payment:    'bg-emerald-100 text-emerald-700 border-emerald-200',
    credit:     'bg-blue-100 text-blue-700 border-blue-200',
    adjustment: 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize', map[type] ?? 'bg-muted text-muted-foreground border-border')}>
      {type}
    </span>
  );
}

function DatePicker({ label, value, onChange }: { label: string; value: Date | undefined; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('w-36 justify-start text-left font-normal', !value && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {value ? format(value, 'MMM d, yyyy') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

export default function AdminStatements() {
  // Initialise filters from URL
  const initParams = () => new URLSearchParams(window.location.search);

  const [customerId,  setCustomerId]  = useState(() => initParams().get('customer_id') || '');
  const [search,      setSearch]      = useState(() => initParams().get('search') || '');
  const [entryType,   setEntryType]   = useState(() => initParams().get('entry_type') || 'all');
  const [dateFrom,    setDateFrom]    = useState<Date | undefined>(() => {
    const v = initParams().get('date_from'); return v ? new Date(v) : undefined;
  });
  const [dateTo,      setDateTo]      = useState<Date | undefined>(() => {
    const v = initParams().get('date_to'); return v ? new Date(v) : undefined;
  });
  const [emailOpen,   setEmailOpen]   = useState(false);
  const [emailForm,   setEmailForm]   = useState({ email: '', message: '' });

  // Sync URL without reload
  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (k: string, v: string | undefined) => v ? url.searchParams.set(k, v) : url.searchParams.delete(k);
    set('customer_id', customerId || undefined);
    set('search',      search     || undefined);
    set('entry_type',  entryType !== 'all' ? entryType : undefined);
    set('date_from',   dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined);
    set('date_to',     dateTo   ? format(dateTo,   'yyyy-MM-dd') : undefined);
    window.history.replaceState({}, '', url.toString());
  }, [customerId, search, entryType, dateFrom, dateTo]);

  const activeFilterCount = [
    customerId, search, entryType !== 'all' ? entryType : '',
    dateFrom, dateTo,
  ].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setCustomerId(''); setSearch(''); setEntryType('all');
    setDateFrom(undefined); setDateTo(undefined);
  }, []);

  // Customers list
  const { data: customers = [] } = useQuery({
    queryKey: ['admin-customers-list'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/customers');
      return data as CustomerOption[];
    },
  });

  // Ledger data
  const { data: ledgerResponse, isLoading, isFetching } = useQuery({
    queryKey: ['admin-ledger', customerId, search, entryType, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/ledger-entries', {
        params: {
          ...(customerId  ? { customer_id: customerId } : {}),
          ...(search      ? { search }                  : {}),
          ...(entryType !== 'all' ? { entry_type: entryType } : {}),
          ...(dateFrom    ? { date_from: format(dateFrom, 'yyyy-MM-dd') } : {}),
          ...(dateTo      ? { date_to:   format(dateTo,   'yyyy-MM-dd') } : {}),
        },
      });
      return data as { entries: LedgerEntry[]; summary: LedgerSummary };
    },
  });

  const entries = ledgerResponse?.entries || [];
  const summary = ledgerResponse?.summary;

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) || null,
    [customers, customerId],
  );

  const shareUrl = (() => {
    const url = new URL(window.location.href);
    return url.toString();
  })();

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); toast.success('Link copied'); }
    catch { toast.error('Copy failed'); }
  };

  const openPrint = () => {
    const url = new URL('/admin/statements/print', window.location.origin);
    if (customerId) url.searchParams.set('customer_id', customerId);
    if (dateFrom)   url.searchParams.set('date_from', format(dateFrom, 'yyyy-MM-dd'));
    if (dateTo)     url.searchParams.set('date_to',   format(dateTo,   'yyyy-MM-dd'));
    window.open(url.toString(), '_blank');
  };

  const sendEmail = async () => {
    await axios.post('/api/admin/statements/email', {
      email: emailForm.email,
      message: emailForm.message || null,
      customer_id: customerId || null,
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Statements & Ledger</h1>
            <p className="text-muted-foreground mt-1">
              {selectedCustomer
                ? `Statement for ${selectedCustomer.name}`
                : 'Customer ledger activity and balances'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={openPrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Link2 className="h-4 w-4 mr-1.5" /> Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
              <Mail className="h-4 w-4 mr-1.5" /> Email
            </Button>
          </div>
        </div>

        {/* ── Filters ── */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs h-5">{activeFilterCount}</Badge>
              )}
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs ml-auto text-muted-foreground" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" /> Clear all
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

              {/* Customer dropdown */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Customer</Label>
                <Select value={customerId || 'all'} onValueChange={(v) => setCustomerId(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name || 'Unnamed'}{c.email ? ` — ${c.email}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer name search */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Search customer</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="h-9 pl-8 text-sm"
                    placeholder="Name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Entry type */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={entryType} onValueChange={setEntryType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date range</Label>
                <div className="flex items-center gap-1.5">
                  <DatePicker label="From" value={dateFrom} onChange={setDateFrom} />
                  <span className="text-muted-foreground text-xs">→</span>
                  <DatePicker label="To"   value={dateTo}   onChange={setDateTo} />
                  {(dateFrom || dateTo) && (
                    <button onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Date presets */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-muted-foreground">Quick:</span>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full border transition-colors',
                    dateFrom?.toDateString() === p.from.toDateString() && dateTo?.toDateString() === p.to.toDateString()
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground hover:text-foreground border-border hover:bg-muted',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Summary cards ── */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Entries</div>
                <div className="text-2xl font-bold">{summary.count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-orange-500" /> Total Charged
                </div>
                <div className="text-2xl font-bold">${summary.total_charged.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-emerald-600" /> Total Paid
                </div>
                <div className="text-2xl font-bold text-emerald-600">${summary.total_paid.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Balance
                </div>
                <div className={cn('text-2xl font-bold', summary.balance !== null && summary.balance < 0 ? 'text-emerald-600' : '')}>
                  {summary.balance !== null ? `$${summary.balance.toFixed(2)}` : '—'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Ledger table ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>
                {selectedCustomer ? `${selectedCustomer.name}'s Ledger` : 'All Ledger Entries'}
              </span>
              {isFetching && <span className="text-xs font-normal text-muted-foreground animate-pulse">Updating…</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-32">Date</TableHead>
                    {!customerId && <TableHead>Customer</TableHead>}
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right w-28">Amount</TableHead>
                    <TableHead className="text-right w-28">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={customerId ? 6 : 7} className="text-center text-muted-foreground py-16">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={customerId ? 6 : 7} className="text-center text-muted-foreground py-16">
                        No entries match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm whitespace-nowrap">
                          {entry.entry_date
                            ? format(new Date(entry.entry_date), 'MMM d, yyyy')
                            : '—'}
                        </TableCell>
                        {!customerId && (
                          <TableCell>
                            <div className="text-sm font-medium leading-tight">{entry.customer_name || '—'}</div>
                            {entry.customer_email && (
                              <div className="text-xs text-muted-foreground">{entry.customer_email}</div>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <TypeBadge type={entry.entry_type} />
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {entry.invoice_number
                            ? `INV-${entry.invoice_number}`
                            : entry.reference_type || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                          {entry.notes || '—'}
                        </TableCell>
                        <TableCell className={cn('text-right font-medium tabular-nums', entry.amount < 0 ? 'text-emerald-600' : 'text-foreground')}>
                          {entry.amount < 0 ? '−' : '+'}${Math.abs(Number(entry.amount)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {entry.balance_after !== null
                            ? `$${Number(entry.balance_after).toFixed(2)}`
                            : entry.running_balance !== null
                              ? `$${Number(entry.running_balance).toFixed(2)}`
                              : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Email dialog ── */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Statement</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!emailForm.email.trim()) { toast.error('Recipient email required'); return; }
              try {
                await sendEmail();
                toast.success('Statement sent');
                setEmailOpen(false);
                setEmailForm({ email: '', message: '' });
              } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to send');
              }
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              {selectedCustomer ? `Send ${selectedCustomer.name}'s statement to:` : 'Send full ledger statement to:'}
            </p>
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                placeholder={selectedCustomer?.email || 'customer@example.com'}
                value={emailForm.email}
                onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                value={emailForm.message}
                onChange={(e) => setEmailForm((p) => ({ ...p, message: e.target.value }))}
                rows={3}
                placeholder="Add a personal note…"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Send Statement</Button>
              <Button type="button" variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
