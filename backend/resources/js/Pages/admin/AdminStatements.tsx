import { useMemo, useState } from 'react';
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
import { toast } from 'sonner';

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
  const [customerId, setCustomerId] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: '', message: '' });

  const { data: customers = [] } = useQuery({
    queryKey: ['admin-customers'],
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

  const currentBalance = useMemo(() => {
    if (!entries.length) return null;
    const last = entries[entries.length - 1];
    return last.balance_after ?? last.running_balance ?? null;
  }, [entries]);

  const copyShareLink = async () => {
    const url = customerId
      ? `${window.location.origin}/admin/statements/share?customer_id=${encodeURIComponent(customerId)}`
      : `${window.location.origin}/admin/statements/share`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied');
    } catch {
      toast.error('Failed to copy share link');
    }
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
        <div>
          <h1 className="text-3xl font-bold">Statements & Ledger</h1>
          <p className="text-muted-foreground">Review customer ledger activity and balances.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name || 'Unnamed'}{customer.email ? ` (${customer.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ledger Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                {customerId ? 'Customer statement' : 'All customers'}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => {
                    const url = customerId
                      ? `/admin/statements/print?customer_id=${encodeURIComponent(customerId)}`
                      : '/admin/statements/print';
                    window.open(url, '_blank');
                  }}
                >
                  Print
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => {
                    const url = customerId
                      ? `/admin/statements/download?customer_id=${encodeURIComponent(customerId)}`
                      : '/admin/statements/download';
                    window.open(url, '_blank');
                  }}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => {
                    const url = customerId
                      ? `/admin/statements/share?customer_id=${encodeURIComponent(customerId)}`
                      : '/admin/statements/share';
                    window.open(url, '_blank');
                  }}
                >
                  Share
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={copyShareLink}
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setEmailOpen(true)}
                >
                  Email
                </button>
              </div>
            </div>
            {customerId && currentBalance !== null && (
              <div className="text-sm text-muted-foreground mb-4">
                Current Balance: ${Number(currentBalance).toFixed(2)}
              </div>
            )}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Loading ledger entries...
                      </TableCell>
                    </TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No ledger entries found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.entry_date ? new Date(entry.entry_date).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>{entry.customer_name || '—'}</TableCell>
                        <TableCell className="capitalize">{entry.entry_type}</TableCell>
                        <TableCell>
                          {entry.invoice_number ? `Invoice ${entry.invoice_number}` : entry.reference_type || '—'}
                        </TableCell>
                        <TableCell className={entry.amount < 0 ? 'text-destructive' : ''}>
                          {entry.amount < 0 ? '-' : ''}${Math.abs(Number(entry.amount)).toFixed(2)}
                        </TableCell>
                        <TableCell>
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
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Statement</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!emailForm.email.trim()) {
                toast.error('Recipient email required');
                return;
              }
              try {
                await sendEmail();
                toast.success('Statement email sent');
                setEmailOpen(false);
                setEmailForm({ email: '', message: '' });
              } catch (error: any) {
                toast.error(error?.response?.data?.message || 'Failed to send statement email');
              }
            }}
            className="space-y-4"
          >
            <div className="text-sm text-muted-foreground">
              {customerId ? 'Customer statement' : 'All customers'}
            </div>
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={emailForm.email}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                value={emailForm.message}
                onChange={(event) => setEmailForm((prev) => ({ ...prev, message: event.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Send</Button>
              <Button type="button" variant="outline" onClick={() => setEmailOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
