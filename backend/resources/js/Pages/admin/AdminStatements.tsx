import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Printer, Link2, Mail, User, TrendingDown, TrendingUp } from 'lucide-react';

interface LedgerEntry {
  id: string;
  customer_id: string;
  customer_name: string | null;
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

interface CustomerOption {
  id: string;
  name: string | null;
  email: string | null;
}

export default function AdminStatements() {
  // Pre-select customer from URL query param (?customer_id=...)
  const [customerId, setCustomerId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('customer_id') || '';
  });
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: '', message: '' });

  // Update URL when customer changes (no page reload)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (customerId) {
      url.searchParams.set('customer_id', customerId);
    } else {
      url.searchParams.delete('customer_id');
    }
    window.history.replaceState({}, '', url.toString());
  }, [customerId]);

  const { data: customers = [] } = useQuery({
    queryKey: ['admin-customers-list'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/customers');
      return data as CustomerOption[];
    },
  });

  const { data: ledgerResponse, isLoading } = useQuery({
    queryKey: ['admin-ledger', customerId],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/ledger-entries', {
        params: customerId ? { customer_id: customerId } : {},
      });
      return data as { entries: LedgerEntry[] };
    },
  });

  const entries = ledgerResponse?.entries || [];

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) || null,
    [customers, customerId],
  );

  const currentBalance = useMemo(() => {
    if (!entries.length || !customerId) return null;
    const last = entries[entries.length - 1];
    return last.balance_after ?? last.running_balance ?? null;
  }, [entries, customerId]);

  const totalDebits = useMemo(
    () => entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0),
    [entries],
  );
  const totalCredits = useMemo(
    () => entries.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0),
    [entries],
  );

  const shareUrl = customerId
    ? `${window.location.origin}/admin/statements?customer_id=${encodeURIComponent(customerId)}`
    : `${window.location.origin}/admin/statements`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const openPrint = () => {
    const url = customerId
      ? `/admin/statements/print?customer_id=${encodeURIComponent(customerId)}`
      : '/admin/statements/print';
    window.open(url, '_blank');
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Statements & Ledger</h1>
            <p className="text-muted-foreground mt-1">
              {selectedCustomer
                ? `Viewing statement for ${selectedCustomer.name || 'customer'}`
                : 'Select a customer to view their statement, or browse all ledger entries.'}
            </p>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={openPrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={copyShareLink}>
              <Link2 className="h-4 w-4 mr-1.5" /> Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
              <Mail className="h-4 w-4 mr-1.5" /> Email
            </Button>
          </div>
        </div>

        {/* Customer filter */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground w-28 shrink-0">
                <User className="h-4 w-4" /> Customer
              </div>
              <div className="flex-1 min-w-[220px] max-w-md">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name || 'Unnamed'}
                        {c.email ? ` — ${c.email}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {customerId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setCustomerId('')}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary cards — shown when a customer is selected */}
        {customerId && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Current Balance</div>
                <div className={`text-2xl font-bold ${currentBalance !== null && currentBalance < 0 ? 'text-emerald-600' : ''}`}>
                  {currentBalance !== null ? `$${Number(currentBalance).toFixed(2)}` : '—'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Total Charges
                </div>
                <div className="text-2xl font-bold">${totalDebits.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-emerald-600" /> Total Payments
                </div>
                <div className="text-2xl font-bold text-emerald-600">${totalCredits.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ledger table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>
                {selectedCustomer
                  ? `${selectedCustomer.name}'s Ledger`
                  : 'All Ledger Entries'}
              </span>
              {entries.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Date</TableHead>
                    {!customerId && <TableHead>Customer</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={customerId ? 6 : 7} className="text-center text-muted-foreground py-12">
                        Loading ledger entries…
                      </TableCell>
                    </TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={customerId ? 6 : 7} className="text-center text-muted-foreground py-12">
                        {customerId
                          ? 'No ledger entries for this customer yet.'
                          : 'No ledger entries found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {entry.entry_date
                            ? new Date(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </TableCell>
                        {!customerId && (
                          <TableCell className="text-sm">{entry.customer_name || '—'}</TableCell>
                        )}
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {entry.entry_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {entry.invoice_number
                            ? `INV-${entry.invoice_number}`
                            : entry.reference_type || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {entry.notes || '—'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${entry.amount < 0 ? 'text-emerald-600' : ''}`}>
                          {entry.amount < 0 ? '-' : '+'}${Math.abs(Number(entry.amount)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
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

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Statement</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!emailForm.email.trim()) {
                toast.error('Recipient email required');
                return;
              }
              try {
                await sendEmail();
                toast.success('Statement sent successfully');
                setEmailOpen(false);
                setEmailForm({ email: '', message: '' });
              } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to send statement');
              }
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              {selectedCustomer
                ? `Send ${selectedCustomer.name}'s statement to:`
                : 'Send full ledger statement to:'}
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
            <div className="flex gap-2 pt-1">
              <Button type="submit">Send Statement</Button>
              <Button type="button" variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
