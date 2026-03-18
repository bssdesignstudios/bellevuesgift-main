import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Wrench, Search, Plus, Clock, User, Calendar, ChevronRight, Loader2, CreditCard, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-500' },
  { value: 'received', label: 'Received', color: 'bg-indigo-500' },
  { value: 'diagnosing', label: 'Diagnosing', color: 'bg-yellow-500' },
  { value: 'awaiting_parts', label: 'Awaiting Parts', color: 'bg-orange-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-purple-500' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup', color: 'bg-green-500' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-600' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

const TASK_STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'doing', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

interface RepairTicket {
  id: string;
  ticket_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  service_type: string;
  item_make: string | null;
  model_number: string | null;
  problem_description: string;
  status: string;
  eta_date: string | null;
  notes: string | null;
  deposit_amount: number;
  deposit_paid: boolean;
  labor_hours: number;
  labor_rate: number;
  parts_cost: number;
  total_cost: number;
  created_at: string;
}

interface RepairTask {
  id: string;
  ticket_id: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  notes: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  note: string | null;
  created_at: string;
}

export default function AdminRepairTickets() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<RepairTicket | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'cash', note: '' });
  const [billingForm, setBillingForm] = useState({
    labor_hours: '', labor_rate: '', parts_cost: '', deposit_amount: '', deposit_paid: false,
  });

  // Fetch repair tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-repair-tickets', statusFilter, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const { data } = await axios.get('/api/admin/repair-tickets', { params });
      return data as RepairTicket[];
    },
  });

  // Fetch tasks for selected ticket
  const { data: tasks } = useQuery({
    queryKey: ['repair-tasks', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data } = await axios.get(`/api/admin/repair-tickets/${selectedTicket.id}/tasks`);
      return data as RepairTask[];
    },
    enabled: !!selectedTicket,
  });

  // Fetch payments for selected ticket
  const { data: payments } = useQuery({
    queryKey: ['repair-payments', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data } = await axios.get(`/api/admin/repair-tickets/${selectedTicket.id}/payments`);
      return data as Payment[];
    },
    enabled: !!selectedTicket,
  });

  // Update ticket status / eta / notes
  const updateTicketMutation = useMutation({
    mutationFn: async (updates: Partial<RepairTicket> & { id: string }) => {
      const { id, ...data } = updates;
      await axios.patch(`/api/admin/repair-tickets/${id}/status`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-repair-tickets'] });
      toast.success('Ticket updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update ticket: ' + (error.response?.data?.message || error.message));
    },
  });

  // Update billing
  const updateBillingMutation = useMutation({
    mutationFn: async (billing: typeof billingForm & { id: string }) => {
      const { id, ...data } = billing;
      const { data: updated } = await axios.patch(`/api/admin/repair-tickets/${id}/billing`, {
        labor_hours: parseFloat(data.labor_hours) || 0,
        labor_rate: parseFloat(data.labor_rate) || 0,
        parts_cost: parseFloat(data.parts_cost) || 0,
        deposit_amount: parseFloat(data.deposit_amount) || 0,
        deposit_paid: data.deposit_paid,
      });
      return updated as RepairTicket;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-repair-tickets'] });
      setSelectedTicket(updated);
      toast.success('Billing updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update billing: ' + (error.response?.data?.message || error.message));
    },
  });

  // Record payment
  const recordPaymentMutation = useMutation({
    mutationFn: async (payload: { ticketId: string; amount: string; payment_method: string; note: string }) => {
      const { data: result } = await axios.post(`/api/admin/repair-tickets/${payload.ticketId}/payments`, {
        amount: parseFloat(payload.amount),
        payment_method: payload.payment_method,
        note: payload.note || null,
      });
      return result as { ticket: RepairTicket };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['repair-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-repair-tickets'] });
      setSelectedTicket(result.ticket);
      setPaymentForm({ amount: '', payment_method: 'cash', note: '' });
      setShowPaymentDialog(false);
      toast.success('Payment recorded');
    },
    onError: (error: any) => {
      toast.error('Failed to record payment: ' + (error.response?.data?.message || error.message));
    },
  });

  // Add task
  const addTaskMutation = useMutation({
    mutationFn: async (task: { ticket_id: string; title: string; description: string; due_date: string | null }) => {
      await axios.post(`/api/admin/repair-tickets/${task.ticket_id}/tasks`, {
        title: task.title,
        description: task.description || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-tasks'] });
      setShowTaskDialog(false);
      setNewTask({ title: '', description: '', due_date: '' });
      toast.success('Task added');
    },
    onError: (error: any) => {
      toast.error('Failed to add task: ' + (error.response?.data?.message || error.message));
    },
  });

  // Update task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RepairTask> & { id: string }) => {
      await axios.patch(`/api/admin/repair-tickets/${selectedTicket?.id}/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-tasks'] });
      toast.success('Task updated');
    },
  });

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={`${statusInfo?.color || 'bg-gray-500'} text-white`}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const statusCounts = tickets?.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  const content = (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Repair Tickets
          </h1>
          <p className="text-muted-foreground">Manage repair and installation requests</p>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {STATUS_OPTIONS.map((status) => (
          <Card
            key={status.value}
            className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === status.value ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(status.value === statusFilter ? 'all' : status.value)}
          >
            <CardContent className="p-3 text-center">
              <div className={`w-3 h-3 rounded-full ${status.color} mx-auto mb-1`} />
              <p className="text-xs text-muted-foreground truncate">{status.label}</p>
              <p className="text-lg font-bold">{statusCounts[status.value] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket #, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}>
          Clear Filters
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tickets?.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No repair tickets found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets?.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className={`cursor-pointer hover:bg-muted/50 ${selectedTicket?.id === ticket.id ? 'bg-muted' : ''}`}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setBillingForm({
                            labor_hours: String(ticket.labor_hours || ''),
                            labor_rate: String(ticket.labor_rate || ''),
                            parts_cost: String(ticket.parts_cost || ''),
                            deposit_amount: String(ticket.deposit_amount || ''),
                            deposit_paid: ticket.deposit_paid,
                          });
                        }}
                      >
                        <TableCell className="font-mono font-medium">{ticket.ticket_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ticket.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{ticket.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{ticket.service_type}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ticket Detail Panel */}
        <div className="lg:col-span-1">
          {selectedTicket ? (
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="font-mono">{selectedTicket.ticket_number}</span>
                  {getStatusBadge(selectedTicket.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="details">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks ({tasks?.length || 0})</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                  </TabsList>

                  {/* Details Tab */}
                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedTicket.customer_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">{selectedTicket.phone}</p>
                      {selectedTicket.email && (
                        <p className="text-sm text-muted-foreground pl-6">{selectedTicket.email}</p>
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      <p><strong>Service:</strong> {selectedTicket.service_type === 'repair' ? 'Repair' : 'Installation'}</p>
                      {selectedTicket.item_make && <p><strong>Make:</strong> {selectedTicket.item_make}</p>}
                      {selectedTicket.model_number && <p><strong>Model:</strong> {selectedTicket.model_number}</p>}
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Problem Description</Label>
                      <p className="text-sm mt-1">{selectedTicket.problem_description}</p>
                    </div>

                    <div>
                      <Label>Update Status</Label>
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(value) => {
                          updateTicketMutation.mutate({ id: selectedTicket.id, status: value });
                          setSelectedTicket({ ...selectedTicket, status: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Estimated Completion</Label>
                      <Input
                        type="date"
                        value={selectedTicket.eta_date || ''}
                        onChange={(e) => {
                          updateTicketMutation.mutate({ id: selectedTicket.id, eta_date: e.target.value || null });
                          setSelectedTicket({ ...selectedTicket, eta_date: e.target.value });
                        }}
                      />
                    </div>

                    <div>
                      <Label>Staff Notes</Label>
                      <Textarea
                        value={selectedTicket.notes || ''}
                        onChange={(e) => setSelectedTicket({ ...selectedTicket, notes: e.target.value })}
                        onBlur={() => {
                          if (selectedTicket.notes !== undefined) {
                            updateTicketMutation.mutate({ id: selectedTicket.id, notes: selectedTicket.notes });
                          }
                        }}
                        rows={3}
                        placeholder="Add notes for customer or internal use..."
                      />
                    </div>
                  </TabsContent>

                  {/* Tasks Tab */}
                  <TabsContent value="tasks" className="space-y-4 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowTaskDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>

                    {tasks?.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        No tasks yet. Add tasks to track repair progress.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {tasks?.map((task) => (
                          <div key={task.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <p className="font-medium text-sm">{task.title || task.description}</p>
                              <Select
                                value={task.status}
                                onValueChange={(value) => updateTaskMutation.mutate({ id: task.id, status: value })}
                              >
                                <SelectTrigger className="h-7 text-xs w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TASK_STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {task.description && task.title && (
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                            )}
                            {task.due_date && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {format(new Date(task.due_date), 'MMM d')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Task Dialog */}
                    <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Task Title *</Label>
                            <Input
                              value={newTask.title}
                              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                              placeholder="e.g., Diagnose issue"
                            />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea
                              value={newTask.description}
                              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label>Due Date</Label>
                            <Input
                              type="date"
                              value={newTask.due_date}
                              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                            />
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => {
                              if (!newTask.title || !selectedTicket) return;
                              addTaskMutation.mutate({
                                ticket_id: selectedTicket.id,
                                title: newTask.title,
                                description: newTask.description,
                                due_date: newTask.due_date || null,
                              });
                            }}
                            disabled={!newTask.title || addTaskMutation.isPending}
                          >
                            {addTaskMutation.isPending ? 'Adding...' : 'Add Task'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TabsContent>

                  {/* Billing Tab */}
                  <TabsContent value="billing" className="space-y-4 mt-4">
                    {/* Cost Breakdown Editor */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Receipt className="h-4 w-4" /> Cost Breakdown
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Labor Hours</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.25"
                            value={billingForm.labor_hours}
                            placeholder={String(selectedTicket.labor_hours || '0')}
                            onChange={(e) => setBillingForm(prev => ({ ...prev, labor_hours: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Rate / hr ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={billingForm.labor_rate}
                            placeholder={String(selectedTicket.labor_rate || '0')}
                            onChange={(e) => setBillingForm(prev => ({ ...prev, labor_rate: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Parts Cost ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={billingForm.parts_cost}
                          placeholder={String(selectedTicket.parts_cost || '0')}
                          onChange={(e) => setBillingForm(prev => ({ ...prev, parts_cost: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Deposit ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={billingForm.deposit_amount}
                            placeholder={String(selectedTicket.deposit_amount || '0')}
                            onChange={(e) => setBillingForm(prev => ({ ...prev, deposit_amount: e.target.value }))}
                          />
                        </div>
                        <div className="flex flex-col justify-end pb-1">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={billingForm.deposit_paid}
                              onChange={(e) => setBillingForm(prev => ({ ...prev, deposit_paid: e.target.checked }))}
                              className="w-4 h-4"
                            />
                            Deposit Paid
                          </label>
                        </div>
                      </div>

                      {/* Live total preview */}
                      <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Labor</span>
                          <span>${((parseFloat(billingForm.labor_hours) || selectedTicket.labor_hours || 0) * (parseFloat(billingForm.labor_rate) || selectedTicket.labor_rate || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Parts</span>
                          <span>${(parseFloat(billingForm.parts_cost) || selectedTicket.parts_cost || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                          <span>Est. Total</span>
                          <span>${selectedTicket.total_cost?.toFixed(2) || '0.00'}</span>
                        </div>
                        {(parseFloat(billingForm.deposit_amount) || selectedTicket.deposit_amount) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Deposit</span>
                            <span className={(billingForm.deposit_paid || selectedTicket.deposit_paid) ? 'text-emerald-600 font-medium' : 'text-orange-500'}>
                              ${(parseFloat(billingForm.deposit_amount) || selectedTicket.deposit_amount || 0).toFixed(2)}{' '}
                              {(billingForm.deposit_paid || selectedTicket.deposit_paid) ? '✓ Paid' : '(unpaid)'}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full"
                        disabled={updateBillingMutation.isPending}
                        onClick={() => updateBillingMutation.mutate({ ...billingForm, id: selectedTicket.id })}
                      >
                        {updateBillingMutation.isPending ? 'Saving...' : 'Save Billing'}
                      </Button>
                    </div>

                    {/* Payment History */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <CreditCard className="h-4 w-4" /> Payments
                        </h4>
                        <Button size="sm" variant="outline" onClick={() => setShowPaymentDialog(true)}>
                          <Plus className="h-3 w-3 mr-1" /> Record
                        </Button>
                      </div>

                      {!payments?.length ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No payments recorded yet</p>
                      ) : (
                        <div className="space-y-1">
                          {payments.map((p) => (
                            <div key={p.id} className="flex justify-between items-center text-sm border rounded p-2">
                              <div>
                                <span className="font-medium capitalize">{p.payment_method.replace('_', ' ')}</span>
                                {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                                <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM d, h:mm a')}</p>
                              </div>
                              <span className="font-semibold text-emerald-600">${Number(p.amount).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                            <span>Total Paid</span>
                            <span className="text-emerald-600">${totalPaid.toFixed(2)}</span>
                          </div>
                          {selectedTicket.total_cost > 0 && (
                            <div className="flex justify-between text-sm pt-1">
                              <span className="text-muted-foreground">Balance Due</span>
                              <span className={selectedTicket.total_cost - totalPaid <= 0 ? 'text-emerald-600 font-semibold' : 'text-orange-500 font-semibold'}>
                                ${Math.max(0, selectedTicket.total_cost - totalPaid).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Record Payment Dialog */}
                    <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Payment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Amount ($) *</Label>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={paymentForm.amount}
                              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Payment Method *</Label>
                            <Select
                              value={paymentForm.payment_method}
                              onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="gift_card">Gift Card</SelectItem>
                                <SelectItem value="check">Check</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Note (optional)</Label>
                            <Input
                              value={paymentForm.note}
                              onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                              placeholder="e.g., Deposit payment"
                            />
                          </div>
                          <Button
                            className="w-full"
                            disabled={!paymentForm.amount || recordPaymentMutation.isPending}
                            onClick={() => recordPaymentMutation.mutate({
                              ticketId: selectedTicket.id,
                              ...paymentForm,
                            })}
                          >
                            {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a ticket to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      {content}
    </AdminLayout>
  );
}
