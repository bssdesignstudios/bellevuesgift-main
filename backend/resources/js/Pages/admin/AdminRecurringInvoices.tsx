import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { RefreshCw, Plus, Calendar, DollarSign, AlertTriangle, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { format } from 'date-fns';

const BILLING_CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const BILL_CATEGORIES = [
  'utilities', 'rent', 'insurance', 'software', 'services', 'maintenance', 'subscriptions', 'other'
];

interface RecurringBill {
  id: string;
  name: string;
  vendor_payee: string | null;
  amount: number;
  billing_cycle: string;
  next_due_date: string;
  category: string | null;
  notes: string | null;
  is_active: boolean;
  is_overdue: boolean;
}

export default function AdminRecurringInvoices() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editBill, setEditBill] = useState<RecurringBill | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-recurring-bills'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/recurring-bills');
      return data as { bills: RecurringBill[]; stats: { total_monthly: number; active_count: number; overdue_count: number } };
    },
  });

  const bills = data?.bills || [];
  const stats = data?.stats || { total_monthly: 0, active_count: 0, overdue_count: 0 };

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) =>
      axios.put(`/api/admin/recurring-bills/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-recurring-bills'] }),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => axios.post(`/api/admin/recurring-bills/${id}/mark-paid`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recurring-bills'] });
      toast.success('Marked paid — next due date advanced');
    },
    onError: () => toast.error('Failed to mark paid'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axios.delete(`/api/admin/recurring-bills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-recurring-bills'] });
      toast.success('Bill deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <RefreshCw className="h-8 w-8 text-brand-blue" />
              Recurring Bills
            </h1>
            <p className="text-muted-foreground">Manage fixed recurring business obligations</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Recurring Bill</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Recurring Bill</DialogTitle></DialogHeader>
              <RecurringBillForm onSuccess={() => { setIsAddOpen(false); queryClient.invalidateQueries({ queryKey: ['admin-recurring-bills'] }); }} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Monthly Equivalent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Number(stats.total_monthly).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All active bills normalized</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Bills</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.overdue_count > 0 ? 'text-destructive' : ''}`}>
                {stats.overdue_count}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit dialog */}
        {editBill && (
          <Dialog open={!!editBill} onOpenChange={open => !open && setEditBill(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Recurring Bill</DialogTitle></DialogHeader>
              <RecurringBillForm
                existing={editBill}
                onSuccess={() => { setEditBill(null); queryClient.invalidateQueries({ queryKey: ['admin-recurring-bills'] }); }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill Name</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : bills.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No recurring bills yet. Add one to track your fixed obligations.</TableCell></TableRow>
              ) : bills.map((bill) => (
                <TableRow key={bill.id} className={bill.is_overdue ? 'bg-red-50/40' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {bill.is_overdue && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                      {bill.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{bill.vendor_payee || '—'}</TableCell>
                  <TableCell>
                    {bill.category && <Badge variant="secondary" className="capitalize">{bill.category}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{bill.billing_cycle}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">${Number(bill.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className={bill.is_overdue ? 'text-destructive font-medium' : ''}>
                        {new Date(bill.next_due_date).toLocaleDateString()}
                      </span>
                      {bill.is_overdue && <span className="text-destructive text-xs font-medium">OVERDUE</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={bill.is_active}
                      onCheckedChange={checked => toggleActive.mutate({ id: bill.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => markPaid.mutate(bill.id)} title="Mark Paid">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditBill(bill)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="text-destructive"
                        onClick={() => { if (confirm('Delete this bill?')) deleteMutation.mutate(bill.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}

function RecurringBillForm({ existing, onSuccess }: { existing?: RecurringBill; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: existing?.name || '',
    vendor_payee: existing?.vendor_payee || '',
    amount: existing?.amount ? String(existing.amount) : '',
    billing_cycle: existing?.billing_cycle || 'monthly',
    next_due_date: existing?.next_due_date
      ? format(new Date(existing.next_due_date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    category: existing?.category || '',
    notes: existing?.notes || '',
    is_active: existing?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (existing) {
        await axios.put(`/api/admin/recurring-bills/${existing.id}`, form);
      } else {
        await axios.post('/api/admin/recurring-bills', form);
      }
    },
    onSuccess: () => {
      toast.success(existing ? 'Bill updated' : 'Bill created');
      onSuccess();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save'),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Bill Name <span className="text-destructive">*</span></Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electricity Bill" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount ($) <span className="text-destructive">*</span></Label>
          <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
        </div>
        <div className="space-y-2">
          <Label>Billing Cycle <span className="text-destructive">*</span></Label>
          <Select value={form.billing_cycle} onValueChange={v => setForm({ ...form, billing_cycle: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BILLING_CYCLES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Vendor / Payee</Label>
          <Input value={form.vendor_payee} onChange={e => setForm({ ...form, vendor_payee: e.target.value })} placeholder="e.g. BPL Power" />
        </div>
        <div className="space-y-2">
          <Label>Next Due Date <span className="text-destructive">*</span></Label>
          <Input type="date" value={form.next_due_date} onChange={e => setForm({ ...form, next_due_date: e.target.value })} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
          <SelectContent>
            {BILL_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
        <Label>Active</Label>
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : (existing ? 'Update Bill' : 'Create Bill')}
      </Button>
    </form>
  );
}
