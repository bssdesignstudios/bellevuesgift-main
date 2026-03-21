import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Download, Users, Pencil, Trash2, CheckCircle, Calculator, Search, DollarSign, Clock, AlertCircle, Banknote, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SOPHelper } from '@/components/admin/SOPHelper';
import { format } from 'date-fns';

const EXPENSE_CATEGORIES = [
  { value: 'utilities', label: 'Utilities' },
  { value: 'restock', label: 'Restock' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'other', label: 'Other' },
];

const STAFF_ROLES = ['super_admin', 'admin', 'finance_controller', 'cashier', 'warehouse_manager', 'warehouse'];

const PAYROLL_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending:  { label: 'Pending Approval', color: 'text-amber-700',  bgColor: 'bg-amber-50 border-amber-200 text-amber-700' },
  draft:    { label: 'Draft',            color: 'text-gray-600',   bgColor: 'bg-gray-50 border-gray-200 text-gray-600' },
  approved: { label: 'Approved',         color: 'text-blue-700',   bgColor: 'bg-blue-50 border-blue-200 text-blue-700' },
  paid:     { label: 'Paid',             color: 'text-green-700',  bgColor: 'bg-green-50 border-green-200 text-green-700' },
};

export default function AdminFinance({ defaultTab = 'expenses' }: { defaultTab?: string }) {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Finance Management</h1>
            <p className="text-muted-foreground">Expenses, payroll, and financial tracking</p>
          </div>
        </div>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>
          <TabsContent value="expenses" className="mt-6"><ExpensesTab /></TabsContent>
          <TabsContent value="payroll" className="mt-6"><PayrollTab /></TabsContent>
        </Tabs>
      </div>
      <SOPHelper context="finance" />
    </AdminLayout>
  );
}

// ─── EXPENSES TAB ────────────────────────────────────────────────────────────

function ExpensesTab() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<any | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['admin-expenses'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/expenses');
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axios.delete(`/api/admin/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] });
      toast.success('Expense deleted');
    },
    onError: () => toast.error('Failed to delete expense'),
  });

  const filtered = useMemo(() => {
    return expenses.filter((e: any) => {
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
      const matchSearch = !search ||
        (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.notes || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.vendor_payee || '').toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [expenses, categoryFilter, search]);

  const totalAmount = filtered.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  const exportCSV = () => {
    const rows = filtered.map((e: any) => ({
      date: e.date,
      title: e.title || '',
      category: e.category,
      vendor: e.vendor_payee || '',
      staff: e.staff?.name || '',
      amount: Number(e.amount).toFixed(2),
      notes: e.notes || '',
    }));
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).join(',');
    const csv = [headers, ...rows.map((r: Record<string, string>) => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total (filtered)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Entries</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{filtered.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg per Entry</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${filtered.length ? (totalAmount / filtered.length).toFixed(2) : '0.00'}</div></CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-56" placeholder="Search title, vendor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export</Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record New Expense</DialogTitle></DialogHeader>
              <ExpenseForm onSuccess={() => { setIsAddOpen(false); queryClient.invalidateQueries({ queryKey: ['admin-expenses'] }); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit dialog */}
      {editExpense && (
        <Dialog open={!!editExpense} onOpenChange={open => !open && setEditExpense(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
            <ExpenseForm
              existing={editExpense}
              onSuccess={() => { setEditExpense(null); queryClient.invalidateQueries({ queryKey: ['admin-expenses'] }); }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No expenses found.</TableCell></TableRow>
            ) : filtered.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm">{new Date(e.date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{e.title || '—'}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{e.category}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{e.vendor_payee || '—'}</TableCell>
                <TableCell className="text-sm">{e.staff?.name || 'System'}</TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">{e.notes || '—'}</TableCell>
                <TableCell className="text-right font-bold">${Number(e.amount).toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditExpense(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(e.id); }}
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
  );
}

function ExpenseForm({ existing, onSuccess }: { existing?: any; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: existing?.title || '',
    date: existing?.date || new Date().toISOString().split('T')[0],
    category: existing?.category || '',
    vendor_payee: existing?.vendor_payee || '',
    amount: existing?.amount ? String(existing.amount) : '',
    notes: existing?.notes || '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (existing) {
        await axios.put(`/api/admin/expenses/${existing.id}`, form);
      } else {
        await axios.post('/api/admin/expenses', form);
      }
    },
    onSuccess: () => {
      toast.success(existing ? 'Expense updated' : 'Expense recorded');
      onSuccess();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save expense'),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Title <span className="text-destructive">*</span></Label>
        <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Office Supplies Purchase" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date <span className="text-destructive">*</span></Label>
          <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Amount <span className="text-destructive">*</span></Label>
          <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Category <span className="text-destructive">*</span></Label>
        <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Vendor / Payee</Label>
        <Input value={form.vendor_payee} onChange={e => setForm({ ...form, vendor_payee: e.target.value })} placeholder="e.g. Office Depot" />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional details..." />
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending || !form.category}>
        {mutation.isPending ? 'Saving...' : (existing ? 'Update Expense' : 'Save Expense')}
      </Button>
    </form>
  );
}

// ─── PAYROLL TAB ────────────────────────────────────────────────────────────

function PayrollTab() {
  const queryClient = useQueryClient();
  const [isGenOpen, setIsGenOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [approveConfirm, setApproveConfirm] = useState<any | null>(null);
  const [markPaidConfirm, setMarkPaidConfirm] = useState<any | null>(null);

  const { data: payroll = [], isLoading } = useQuery({
    queryKey: ['admin-payroll'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/payroll');
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => axios.post(`/api/admin/payroll/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payroll'] });
      toast.success('Payroll approved');
      setApproveConfirm(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to approve');
      setApproveConfirm(null);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => axios.post(`/api/admin/payroll/${id}/mark-paid`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payroll'] });
      toast.success('Payroll marked as paid');
      setMarkPaidConfirm(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to mark as paid');
      setMarkPaidConfirm(null);
    },
  });

  const pendingEntries = payroll.filter((p: any) => p.status === 'pending' || p.status === 'draft');
  const approvedEntries = payroll.filter((p: any) => p.status === 'approved');
  const paidEntries = payroll.filter((p: any) => p.status === 'paid');

  const totalApproved = approvedEntries.reduce((sum: number, p: any) => sum + Number(p.gross_pay || p.amount), 0);
  const totalPaid = paidEntries.reduce((sum: number, p: any) => sum + Number(p.gross_pay || p.amount), 0);
  const totalPending = pendingEntries.reduce((sum: number, p: any) => sum + Number(p.gross_pay || p.amount), 0);

  const filteredPayroll = useMemo(() => {
    if (statusFilter === 'all') return payroll;
    return payroll.filter((p: any) => p.status === statusFilter);
  }, [payroll, statusFilter]);

  const exportCSV = () => {
    const rows = filteredPayroll.map((p: any) => ({
      employee: p.user?.name || '',
      period_start: p.pay_period_start,
      period_end: p.pay_period_end,
      total_hours: p.total_hours,
      pay_rate: p.pay_rate || '',
      gross_pay: Number(p.gross_pay || p.amount).toFixed(2),
      status: p.status,
      approved_by: p.approver?.name || '',
    }));
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).join(',');
    const csv = [headers, ...rows.map((r: Record<string, string>) => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `payroll_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
  };

  const formatPeriod = (start: string, end: string) => {
    try {
      return `${format(new Date(start), 'MMM d')} – ${format(new Date(end), 'MMM d, yyyy')}`;
    } catch {
      return `${start} – ${end}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Needs Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingEntries.length}</div>
            {totalPending > 0 && <p className="text-xs text-muted-foreground">${totalPending.toFixed(2)} total</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-500" />
              Approved (Unpaid)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{approvedEntries.length}</div>
            {totalApproved > 0 && <p className="text-xs text-muted-foreground">${totalApproved.toFixed(2)} to pay</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Banknote className="h-4 w-4 text-green-500" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{paidEntries.length} entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              All Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payroll.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Section */}
      {pendingEntries.length > 0 && (
        <div className="border-2 border-amber-200 rounded-lg bg-amber-50/50 p-4 space-y-3">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Pending Approvals ({pendingEntries.length})
          </h3>
          <div className="space-y-2">
            {pendingEntries.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-200 px-4 py-3">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium">{p.user?.name || '—'}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatPeriod(p.pay_period_start, p.pay_period_end)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Number(p.total_hours || 0).toFixed(1)}h
                    {p.pay_rate ? ` @ $${Number(p.pay_rate).toFixed(2)}/h` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">${Number(p.gross_pay || p.amount).toFixed(2)}</span>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setApproveConfirm(p)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved (Ready to Pay) Section */}
      {approvedEntries.length > 0 && (
        <div className="border-2 border-blue-200 rounded-lg bg-blue-50/50 p-4 space-y-3">
          <h3 className="font-semibold text-blue-800 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Ready to Pay ({approvedEntries.length})
          </h3>
          <div className="space-y-2">
            {approvedEntries.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-blue-200 px-4 py-3">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium">{p.user?.name || '—'}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatPeriod(p.pay_period_start, p.pay_period_end)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Approved by {p.approver?.name || 'Admin'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">${Number(p.gross_pay || p.amount).toFixed(2)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => setMarkPaidConfirm(p)}
                  >
                    <Banknote className="h-4 w-4 mr-1" />
                    Mark Paid
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Payroll Records
          </h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          <Dialog open={isGenOpen} onOpenChange={setIsGenOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Generate Payroll</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Generate Payroll Entry</DialogTitle></DialogHeader>
              <PayrollForm onSuccess={() => { setIsGenOpen(false); queryClient.invalidateQueries({ queryKey: ['admin-payroll'] }); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Full Payroll Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Pay Period</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Gross Pay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredPayroll.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {payroll.length === 0 ? 'No payroll records yet. Generate one to get started.' : 'No records match this filter.'}
                </TableCell>
              </TableRow>
            ) : filteredPayroll.map((p: any) => {
              const statusCfg = PAYROLL_STATUS_CONFIG[p.status] || PAYROLL_STATUS_CONFIG.draft;
              return (
                <TableRow key={p.id} className={p.status === 'pending' ? 'bg-amber-50/30' : ''}>
                  <TableCell className="font-medium">{p.user?.name || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {formatPeriod(p.pay_period_start, p.pay_period_end)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{Number(p.total_hours || 0).toFixed(1)}h</TableCell>
                  <TableCell className="text-right tabular-nums">{p.pay_rate ? `$${Number(p.pay_rate).toFixed(2)}/h` : '—'}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">${Number(p.gross_pay || p.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusCfg.bgColor} border font-medium`}>
                      {statusCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.approver?.name || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {(p.status === 'pending' || p.status === 'draft') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setApproveConfirm(p)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />Approve
                        </Button>
                      )}
                      {p.status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMarkPaidConfirm(p)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Banknote className="h-4 w-4 mr-1" />Pay
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog open={!!approveConfirm} onOpenChange={(open) => !open && setApproveConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-muted-foreground">
              Confirm approval for the following payroll entry:
            </p>
            {approveConfirm && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Employee</span>
                  <span className="font-medium">{approveConfirm.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Period</span>
                  <span className="text-sm">{formatPeriod(approveConfirm.pay_period_start, approveConfirm.pay_period_end)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Hours</span>
                  <span className="text-sm">{Number(approveConfirm.total_hours || 0).toFixed(1)}h</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Gross Pay</span>
                  <span className="text-lg font-bold">${Number(approveConfirm.gross_pay || approveConfirm.amount).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApproveConfirm(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={approveMutation.isPending}
              onClick={() => approveConfirm && approveMutation.mutate(approveConfirm.id)}
            >
              {approveMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Approving...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-1" />Confirm Approval</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Confirmation Dialog */}
      <Dialog open={!!markPaidConfirm} onOpenChange={(open) => !open && setMarkPaidConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-muted-foreground">
              Confirm that payment has been made for:
            </p>
            {markPaidConfirm && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Employee</span>
                  <span className="font-medium">{markPaidConfirm.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Period</span>
                  <span className="text-sm">{formatPeriod(markPaidConfirm.pay_period_start, markPaidConfirm.pay_period_end)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Amount Paid</span>
                  <span className="text-lg font-bold text-green-600">${Number(markPaidConfirm.gross_pay || markPaidConfirm.amount).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMarkPaidConfirm(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={markPaidMutation.isPending}
              onClick={() => markPaidConfirm && markPaidMutation.mutate(markPaidConfirm.id)}
            >
              {markPaidMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processing...</>
              ) : (
                <><Banknote className="h-4 w-4 mr-1" />Confirm Paid</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayrollForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    user_id: '',
    staff_name: '',
    pay_period_start: '',
    pay_period_end: '',
    total_hours: '',
    pay_rate: '',
    gross_pay: '',
    notes: '',
  });
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDropdown, setStaffDropdown] = useState(false);
  const [isFetchingHours, setIsFetchingHours] = useState(false);

  const { data: allStaff = [] } = useQuery({
    queryKey: ['admin-staff-for-payroll'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/staff');
      return (data as any[]).filter(s => STAFF_ROLES.includes(s.role));
    },
  });

  const filteredStaff = (allStaff as any[]).filter((s: any) =>
    s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(staffSearch.toLowerCase())
  );

  const selectStaff = (s: any) => {
    setForm({ ...form, user_id: String(s.id), staff_name: s.name, pay_rate: s.pay_rate ? String(s.pay_rate) : form.pay_rate });
    setStaffSearch(s.name);
    setStaffDropdown(false);
  };

  const recalcGross = (hours: string, rate: string) => {
    const h = parseFloat(hours);
    const r = parseFloat(rate);
    if (!isNaN(h) && !isNaN(r)) {
      setForm(f => ({ ...f, gross_pay: (h * r).toFixed(2) }));
    }
  };

  const fetchHoursFromTimesheets = async () => {
    if (!form.user_id || !form.pay_period_start || !form.pay_period_end) {
      toast.error('Select staff and pay period dates first');
      return;
    }
    setIsFetchingHours(true);
    try {
      const res = await axios.get('/api/admin/timesheets', {
        params: { staff_id: form.user_id, date_from: form.pay_period_start, date_to: form.pay_period_end },
      });
      const logs = res.data?.logs || [];
      const totalHours = logs.reduce((sum: number, l: any) => sum + Number(l.hours || 0), 0);
      const hours = totalHours.toFixed(2);
      setForm(f => {
        const gross = form.pay_rate ? (parseFloat(hours) * parseFloat(form.pay_rate)).toFixed(2) : f.gross_pay;
        return { ...f, total_hours: hours, gross_pay: gross };
      });
      toast.success(`Loaded ${logs.length} timesheet entries — ${totalHours.toFixed(1)} hours`);
    } catch {
      toast.error('Failed to fetch timesheet data');
    }
    setIsFetchingHours(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      await axios.post('/api/admin/payroll', {
        user_id: parseInt(form.user_id),
        pay_period_start: form.pay_period_start,
        pay_period_end: form.pay_period_end,
        total_hours: parseFloat(form.total_hours) || 0,
        pay_rate: parseFloat(form.pay_rate) || null,
        gross_pay: parseFloat(form.gross_pay) || 0,
        amount: parseFloat(form.gross_pay) || 0,
        notes: form.notes || null,
      });
    },
    onSuccess: () => {
      toast.success('Payroll entry created');
      onSuccess();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create payroll'),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4 pt-2">
      <div className="relative">
        <Label>Staff Member <span className="text-destructive">*</span></Label>
        <Input
          value={staffSearch}
          onChange={e => { setStaffSearch(e.target.value); setStaffDropdown(true); setForm({ ...form, user_id: '', staff_name: e.target.value }); }}
          onFocus={() => setStaffDropdown(true)}
          placeholder="Search staff..."
          required={!form.user_id}
        />
        {staffDropdown && filteredStaff.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredStaff.map((s: any) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                onClick={() => selectStaff(s)}
              >
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{s.role?.replace(/_/g, ' ')}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Period Start <span className="text-destructive">*</span></Label>
          <Input type="date" value={form.pay_period_start} onChange={e => setForm({ ...form, pay_period_start: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Period End <span className="text-destructive">*</span></Label>
          <Input type="date" value={form.pay_period_end} onChange={e => setForm({ ...form, pay_period_end: e.target.value })} required />
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={fetchHoursFromTimesheets} disabled={isFetchingHours}>
        <Calculator className="h-4 w-4 mr-2" />{isFetchingHours ? 'Fetching...' : 'Calculate from Timesheets'}
      </Button>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Total Hours</Label>
          <Input
            type="number"
            step="0.01"
            value={form.total_hours}
            onChange={e => { setForm({ ...form, total_hours: e.target.value }); recalcGross(e.target.value, form.pay_rate); }}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Hourly Rate ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.pay_rate}
            onChange={e => { setForm({ ...form, pay_rate: e.target.value }); recalcGross(form.total_hours, e.target.value); }}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Gross Pay ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.gross_pay}
            onChange={e => setForm({ ...form, gross_pay: e.target.value })}
            placeholder="Auto-calculated"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending || !form.user_id}>
        {mutation.isPending ? 'Creating...' : 'Create Payroll Entry'}
      </Button>
    </form>
  );
}
