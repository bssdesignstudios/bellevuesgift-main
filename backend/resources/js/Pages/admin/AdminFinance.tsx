import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Download, Wallet, Users } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminFinance({ defaultTab = 'expenses' }: { defaultTab?: string }) {
  const queryClient = useQueryClient();

  // Unified Finance Page with Tabs for Expenses and Payroll
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Finance Management</h1>
          <div className="flex gap-2">
             <Button variant="outline">
               <Download className="h-4 w-4 mr-2" />
               Export Report
             </Button>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>
          
          <TabsContent value="expenses" className="mt-6">
            <ExpensesTab />
          </TabsContent>
          
          <TabsContent value="payroll" className="mt-6">
            <PayrollTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function ExpensesTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['admin-expenses'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/expenses');
      return data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async (formData: any) => {
      await axios.post('/api/admin/expenses', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] });
      toast.success('Expense recorded');
      setIsDialogOpen(false);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Recent Expenses
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm onSubmit={(data) => addMutation.mutate(data)} isLoading={addMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses?.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                <TableCell className="capitalize">{e.category}</TableCell>
                <TableCell>{e.staff?.name || 'System'}</TableCell>
                <TableCell className="text-muted-foreground">{e.notes || '—'}</TableCell>
                <TableCell className="text-right font-medium">${Number(e.amount).toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {expenses?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No expenses recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PayrollTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: payroll } = useQuery({
    queryKey: ['admin-payroll'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/payroll');
      return data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async (formData: any) => {
      await axios.post('/api/admin/payroll', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payroll'] });
      toast.success('Payroll entry added');
      setIsDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add payroll entry'),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.post(`/api/admin/payroll/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payroll'] });
      toast.success('Payroll approved');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to approve'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Payroll History
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Payroll Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payroll Entry</DialogTitle>
            </DialogHeader>
            <PayrollForm onSubmit={(data) => addMutation.mutate(data)} isLoading={addMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payroll?.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.user?.name}</TableCell>
                <TableCell>
                  {new Date(p.pay_period_start).toLocaleDateString()} – {new Date(p.pay_period_end).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {p.status}
                  </span>
                </TableCell>
                <TableCell>{p.approver?.name || '—'}</TableCell>
                <TableCell className="text-right font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                <TableCell>
                  {p.status !== 'approved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => approveMutation.mutate(p.id)}
                      disabled={approveMutation.isPending}
                    >
                      Approve
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {payroll?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No payroll logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PayrollForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [form, setForm] = useState({
    user_id: '',
    pay_period_start: '',
    pay_period_end: '',
    amount: '',
  });

  // Fetch staff (non-customer users) for dropdown
  const { data: staff = [] } = useQuery({
    queryKey: ['finance-staff'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/staff');
      return data as Array<{ id: number; name: string; role: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          user_id: Number(form.user_id),
          pay_period_start: form.pay_period_start,
          pay_period_end: form.pay_period_end,
          amount: Number(form.amount),
        });
      }}
      className="space-y-4 pt-2"
    >
      <div className="space-y-2">
        <Label>Employee <span className="text-red-500">*</span></Label>
        <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select employee…" />
          </SelectTrigger>
          <SelectContent>
            {staff.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name} <span className="text-xs text-muted-foreground ml-1 capitalize">({s.role})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Period Start <span className="text-red-500">*</span></Label>
          <Input type="date" value={form.pay_period_start} onChange={(e) => setForm({ ...form, pay_period_start: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Period End <span className="text-red-500">*</span></Label>
          <Input type="date" value={form.pay_period_end} onChange={(e) => setForm({ ...form, pay_period_end: e.target.value })} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Gross Amount ($) <span className="text-red-500">*</span></Label>
        <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !form.user_id}>
        {isLoading ? 'Saving…' : 'Add Payroll Entry'}
      </Button>
    </form>
  );
}

function ExpenseForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void, isLoading: boolean }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    notes: '',
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} placeholder="0.00" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} placeholder="e.g. Utilities, Restock, Maintenance" required />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="Optional details..." />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Expense'}
      </Button>
    </form>
  )
}
