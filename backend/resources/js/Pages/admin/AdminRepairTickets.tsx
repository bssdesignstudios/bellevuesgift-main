import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from '@inertiajs/react';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Wrench, Search, Plus, Clock, User, Calendar, ChevronRight,
  Loader2, ClipboardPlus, DollarSign, AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { isDemoModeEnabled } from '@/lib/demoSession';

const STATUS_OPTIONS = [
  { value: 'submitted',        label: 'Submitted',        color: 'bg-blue-500' },
  { value: 'received',         label: 'Received',         color: 'bg-indigo-500' },
  { value: 'diagnosing',       label: 'Diagnosing',       color: 'bg-yellow-500' },
  { value: 'awaiting_parts',   label: 'Awaiting Parts',   color: 'bg-orange-500' },
  { value: 'in_progress',      label: 'In Progress',      color: 'bg-purple-500' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup', color: 'bg-green-500' },
  { value: 'completed',        label: 'Completed',        color: 'bg-emerald-600' },
  { value: 'cancelled',        label: 'Cancelled',        color: 'bg-red-500' },
];

const TASK_STATUS_OPTIONS = [
  { value: 'todo',  label: 'To Do' },
  { value: 'doing', label: 'In Progress' },
  { value: 'done',  label: 'Done' },
];

const PAYMENT_METHODS = [
  { value: 'cash',      label: 'Cash' },
  { value: 'card',      label: 'Card' },
  { value: 'gift_card', label: 'Gift Card' },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  normal: 'bg-gray-100 text-gray-600 border-gray-200',
  low:    'bg-blue-50 text-blue-600 border-blue-200',
};

interface RepairTicket {
  id: string;
  ticket_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  service_type: string;
  device_type: string | null;
  item_make: string | null;
  model_number: string | null;
  problem_description: string;
  status: string;
  priority: string | null;
  eta_date: string | null;
  notes: string | null;
  internal_notes: string | null;
  deposit_amount: number;
  deposit_paid: boolean;
  estimated_cost: number | null;
  labor_hours: number | null;
  labor_rate: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  assigned_staff_id: string | null;
  assigned_at: string | null;
  amount_paid: number;
  payment_status: string;
  created_at: string;
  assigned_technician?: { id: string; name: string } | null;
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

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

interface RepairLog {
  id: string;
  action: string;
  details: Record<string, any> | null;
  created_at: string;
  user_name: string | null;
}

function fmt(val: number | null | undefined) {
  if (val == null) return '—';
  return '$' + Number(val).toFixed(2);
}

function safeDate(val: string | null | undefined) {
  if (!val) return null;
  try { return parseISO(val); } catch { return null; }
}

export default function AdminRepairTickets() {
  const queryClient = useQueryClient();

  // List filters
  const [searchQuery, setSearchQuery]         = useState('');
  const [statusFilter, setStatusFilter]       = useState<string>('all');
  const [techFilter, setTechFilter]           = useState<string>('all');

  // Detail state
  const [selectedTicket, setSelectedTicket]   = useState<RepairTicket | null>(null);
  const [detailTab, setDetailTab]             = useState('details');

  // Task dialog
  const [showTaskDialog, setShowTaskDialog]   = useState(false);
  const [newTask, setNewTask]                 = useState({ title: '', description: '', due_date: '' });

  // Payment form state
  const [payAmount, setPayAmount]             = useState('');
  const [payMethod, setPayMethod]             = useState('cash');

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-repair-tickets', statusFilter, techFilter, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (techFilter !== 'all') params.technician = techFilter;
      if (searchQuery) params.search = searchQuery;
      const { data } = await axios.get('/api/admin/repair-tickets', { params });
      return data as RepairTicket[];
    },
  });

  // Full details for selected ticket (includes assigned_technician)
  const { data: ticketDetail } = useQuery({
    queryKey: ['repair-ticket-detail', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return null;
      const { data } = await axios.get(`/api/admin/repair-tickets/${selectedTicket.id}`);
      return data as RepairTicket;
    },
    enabled: !!selectedTicket,
    staleTime: 10_000,
  });

  // Merged: ticketDetail supplements selectedTicket
  const activeTicket: RepairTicket | null = ticketDetail
    ? { ...selectedTicket!, ...ticketDetail }
    : selectedTicket;

  const { data: tasks } = useQuery({
    queryKey: ['repair-tasks', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data } = await axios.get(`/api/admin/repair-tickets/${selectedTicket.id}/tasks`);
      return data as RepairTask[];
    },
    enabled: !!selectedTicket,
  });

  const { data: logs } = useQuery({
    queryKey: ['repair-ticket-logs', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data } = await axios.get(`/api/admin/repair-tickets/${selectedTicket.id}/logs`);
      return data as RepairLog[];
    },
    enabled: !!selectedTicket && detailTab === 'timeline',
  });

  const { data: staff } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/repair-tickets/staff');
      return data as StaffMember[];
    },
  });

  const staffMap = (staff || []).reduce<Record<string, string>>((acc, s) => {
    acc[s.id] = s.name;
    return acc;
  }, {});

  // ─── Mutations ───────────────────────────────────────────────────────────────

  // General update (status, technician, cost, notes, eta, etc.) — uses PUT
  const updateTicketMutation = useMutation({
    mutationFn: async (updates: Partial<RepairTicket> & { id: string }) => {
      if (isDemoModeEnabled()) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }
      const { id, ...data } = updates;
      const { data: result } = await axios.put(`/api/admin/repair-tickets/${id}`, data);
      return result as RepairTicket;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-repair-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['repair-ticket-detail', selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ['repair-ticket-logs', selectedTicket?.id] });
      if (result && selectedTicket) setSelectedTicket(prev => prev ? { ...prev, ...result } : prev);
      toast.success('Ticket updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update ticket: ' + (error.response?.data?.message || error.message));
    },
  });

  // Payment
  const recordPaymentMutation = useMutation({
    mutationFn: async ({ id, amount, method }: { id: string; amount: number; method: string }) => {
      if (isDemoModeEnabled()) {
        await new Promise(resolve => setTimeout(resolve, 600));
        return;
      }
      const { data } = await axios.post(`/api/admin/repair-tickets/${id}/payment`, { amount, method });
      return data as RepairTicket;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-repair-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['repair-ticket-detail', selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ['repair-ticket-logs', selectedTicket?.id] });
      if (result && selectedTicket) setSelectedTicket(prev => prev ? { ...prev, ...result } : prev);
      setPayAmount('');
      toast.success('Payment recorded');
    },
    onError: (error: any) => {
      toast.error('Payment failed: ' + (error.response?.data?.message || error.message));
    },
  });

  // Add task
  const addTaskMutation = useMutation({
    mutationFn: async (task: { ticket_id: string; title: string; description: string; due_date: string | null }) => {
      if (isDemoModeEnabled()) {
        await new Promise(resolve => setTimeout(resolve, 600));
        return;
      }
      await axios.post(`/api/admin/repair-tickets/${task.ticket_id}/tasks`, {
        description: task.title + (task.description ? ': ' + task.description : ''),
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
      if (isDemoModeEnabled()) {
        await new Promise(resolve => setTimeout(resolve, 400));
        return;
      }
      await axios.patch(`/api/admin/repair-tickets/${selectedTicket?.id}/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-tasks'] });
    },
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    const s = STATUS_OPTIONS.find(o => o.value === status);
    return (
      <Badge className={`${s?.color || 'bg-gray-500'} text-white text-xs`}>
        {s?.label || status}
      </Badge>
    );
  };

  const handleSelectTicket = (ticket: RepairTicket) => {
    setSelectedTicket(ticket);
    setDetailTab('details');
    setPayAmount('');
  };

  const statusCounts = tickets?.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const balanceDue = activeTicket
    ? Math.max(0, (Number(activeTicket.total_cost ?? activeTicket.estimated_cost ?? 0)) - Number(activeTicket.amount_paid ?? 0))
    : 0;

  // ─── Render ──────────────────────────────────────────────────────────────────

  const content = (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Repair Tickets
          </h1>
          <p className="text-muted-foreground">Manage repair and installation requests</p>
        </div>
        <Button onClick={() => router.visit('/admin/repairs/intake')} className="gap-2">
          <ClipboardPlus className="h-4 w-4" />
          New Intake
        </Button>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket #, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={techFilter} onValueChange={setTechFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All technicians" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All technicians</SelectItem>
            {staff?.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => { setStatusFilter('all'); setTechFilter('all'); setSearchQuery(''); }}
        >
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
                      <TableHead>Device</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Est. Cost</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets?.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className={`cursor-pointer hover:bg-muted/50 ${selectedTicket?.id === ticket.id ? 'bg-muted' : ''}`}
                        onClick={() => handleSelectTicket(ticket)}
                      >
                        <TableCell className="font-mono font-medium text-sm">{ticket.ticket_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{ticket.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{ticket.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ticket.device_type || <span className="text-muted-foreground/50">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ticket.assigned_staff_id
                            ? (staffMap[ticket.assigned_staff_id] || <span className="text-muted-foreground/50">—</span>)
                            : <span className="text-muted-foreground/50">Unassigned</span>
                          }
                        </TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell className="text-sm">
                          {ticket.estimated_cost != null ? `$${Number(ticket.estimated_cost).toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(() => { const d = safeDate(ticket.created_at); return d ? format(d, 'MMM d, yyyy') : '—'; })()}
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
          {activeTicket ? (
            <Card className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="font-mono text-sm">{activeTicket.ticket_number}</span>
                  {getStatusBadge(activeTicket.status)}
                </CardTitle>
                {activeTicket.priority && activeTicket.priority !== 'normal' && (
                  <span className={`self-start text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${PRIORITY_COLORS[activeTicket.priority] || ''}`}>
                    {activeTicket.priority}
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={detailTab} onValueChange={setDetailTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks ({tasks?.length || 0})</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>

                  {/* ── Details Tab ─────────────────────────────────────── */}
                  <TabsContent value="details" className="space-y-4 mt-4">

                    {/* Customer Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{activeTicket.customer_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">{activeTicket.phone}</p>
                      {activeTicket.email && (
                        <p className="text-sm text-muted-foreground pl-6">{activeTicket.email}</p>
                      )}
                    </div>

                    {/* Device Info */}
                    <div className="space-y-0.5 text-sm">
                      {activeTicket.device_type && (
                        <p><span className="text-muted-foreground">Device:</span> {activeTicket.device_type}</p>
                      )}
                      {activeTicket.item_make && (
                        <p><span className="text-muted-foreground">Make:</span> {activeTicket.item_make}</p>
                      )}
                      {activeTicket.model_number && (
                        <p><span className="text-muted-foreground">Model:</span> {activeTicket.model_number}</p>
                      )}
                      <p>
                        <span className="text-muted-foreground">Service:</span>{' '}
                        {activeTicket.service_type === 'repair' ? 'Repair' : 'Installation'}
                      </p>
                    </div>

                    {/* Problem */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Issue Description</Label>
                      <p className="text-sm mt-1">{activeTicket.problem_description}</p>
                    </div>

                    <Separator />

                    {/* Status */}
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select
                        value={activeTicket.status}
                        onValueChange={(value) => {
                          updateTicketMutation.mutate({ id: activeTicket.id, status: value });
                          setSelectedTicket(prev => prev ? { ...prev, status: value } : prev);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Technician Assignment */}
                    <div>
                      <Label className="text-xs">Assigned Technician</Label>
                      <Select
                        value={activeTicket.assigned_staff_id || 'none'}
                        onValueChange={(value) => {
                          const staffId = value === 'none' ? null : value;
                          updateTicketMutation.mutate({ id: activeTicket.id, assigned_staff_id: staffId } as any);
                          setSelectedTicket(prev => prev ? { ...prev, assigned_staff_id: staffId } : prev);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {staff?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {activeTicket.assigned_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned{' '}
                          {(() => { const d = safeDate(activeTicket.assigned_at); return d ? format(d, 'MMM d, yyyy h:mm a') : ''; })()}
                        </p>
                      )}
                    </div>

                    {/* ETA */}
                    <div>
                      <Label className="text-xs">Estimated Completion</Label>
                      <Input
                        type="date"
                        value={activeTicket.eta_date || ''}
                        onChange={(e) => {
                          updateTicketMutation.mutate({ id: activeTicket.id, eta_date: e.target.value || null } as any);
                          setSelectedTicket(prev => prev ? { ...prev, eta_date: e.target.value } : prev);
                        }}
                      />
                    </div>

                    <Separator />

                    {/* Costs */}
                    <div className="space-y-3">
                      <Label className="text-xs font-medium">Costs</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Estimated ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={activeTicket.estimated_cost ?? ''}
                            onChange={(e) =>
                              setSelectedTicket(prev => prev ? { ...prev, estimated_cost: e.target.value ? Number(e.target.value) : null } : prev)
                            }
                            onBlur={() => {
                              updateTicketMutation.mutate({ id: activeTicket.id, estimated_cost: activeTicket.estimated_cost } as any);
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Final / Total ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={activeTicket.total_cost ?? ''}
                            onChange={(e) =>
                              setSelectedTicket(prev => prev ? { ...prev, total_cost: e.target.value ? Number(e.target.value) : null } : prev)
                            }
                            onBlur={() => {
                              updateTicketMutation.mutate({ id: activeTicket.id, total_cost: activeTicket.total_cost } as any);
                            }}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Customer Notes */}
                    <div>
                      <Label className="text-xs">Customer Notes</Label>
                      <Textarea
                        value={activeTicket.notes || ''}
                        onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                        onBlur={() => {
                          updateTicketMutation.mutate({ id: activeTicket.id, notes: activeTicket.notes } as any);
                        }}
                        rows={2}
                        placeholder="Notes visible to customer..."
                      />
                    </div>

                    {/* Internal Notes */}
                    <div>
                      <Label className="text-xs">
                        Internal Notes{' '}
                        <span className="text-muted-foreground font-normal">(staff only)</span>
                      </Label>
                      <Textarea
                        value={activeTicket.internal_notes || ''}
                        onChange={(e) => setSelectedTicket(prev => prev ? { ...prev, internal_notes: e.target.value } : prev)}
                        onBlur={() => {
                          updateTicketMutation.mutate({ id: activeTicket.id, internal_notes: activeTicket.internal_notes } as any);
                        }}
                        rows={2}
                        placeholder="Internal notes, sourcing, handling..."
                      />
                    </div>

                    <Separator />

                    {/* Payment Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-xs font-medium">Payment</Label>
                        {activeTicket.payment_status && (
                          <Badge
                            className={
                              activeTicket.payment_status === 'paid'
                                ? 'bg-emerald-600 text-white text-xs ml-auto'
                                : activeTicket.payment_status === 'partial'
                                ? 'bg-yellow-500 text-white text-xs ml-auto'
                                : 'bg-gray-200 text-gray-700 text-xs ml-auto'
                            }
                          >
                            {activeTicket.payment_status === 'paid'
                              ? 'Paid'
                              : activeTicket.payment_status === 'partial'
                              ? 'Partial'
                              : 'Unpaid'}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm space-y-1 bg-muted/50 rounded-md p-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total</span>
                          <span>{fmt(activeTicket.total_cost ?? activeTicket.estimated_cost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Paid</span>
                          <span className="text-emerald-600">{fmt(activeTicket.amount_paid)}</span>
                        </div>
                        {balanceDue > 0 && (
                          <div className="flex justify-between font-medium border-t pt-1 mt-1">
                            <span>Balance Due</span>
                            <span className="text-destructive">${balanceDue.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {activeTicket.payment_status !== 'paid' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Amount ($)</Label>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={payAmount}
                                onChange={e => setPayAmount(e.target.value)}
                                placeholder={balanceDue > 0 ? balanceDue.toFixed(2) : '0.00'}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Method</Label>
                              <Select value={payMethod} onValueChange={setPayMethod}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PAYMENT_METHODS.map(m => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={!payAmount || Number(payAmount) <= 0 || recordPaymentMutation.isPending}
                            onClick={() => {
                              if (!payAmount || Number(payAmount) <= 0) return;
                              recordPaymentMutation.mutate({
                                id: activeTicket.id,
                                amount: Number(payAmount),
                                method: payMethod,
                              });
                            }}
                          >
                            {recordPaymentMutation.isPending ? 'Recording...' : 'Pay Now'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Tasks Tab ────────────────────────────────────────── */}
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
                              placeholder="e.g. Diagnose issue"
                              autoFocus
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

                  {/* ── Timeline Tab ─────────────────────────────────────── */}
                  <TabsContent value="timeline" className="space-y-3 mt-4">
                    {!logs ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : logs.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-6">
                        No events recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {logs.map((log) => {
                          const d = safeDate(log.created_at);
                          return (
                            <div key={log.id} className="flex gap-3 text-sm">
                              <div className="mt-1 shrink-0">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium capitalize">
                                  {log.action.replace(/_/g, ' ')}
                                </p>
                                {log.action === 'status_changed' && log.details && (
                                  <p className="text-xs text-muted-foreground">
                                    {log.details.from} → {log.details.to}
                                  </p>
                                )}
                                {log.action === 'payment_recorded' && log.details && (
                                  <p className="text-xs text-muted-foreground">
                                    ${Number(log.details.amount).toFixed(2)} via {log.details.method}
                                    {log.details.payment_status === 'paid' ? ' — Fully paid' : ''}
                                  </p>
                                )}
                                {log.action === 'technician_assigned' && log.details && (
                                  <p className="text-xs text-muted-foreground">
                                    {staffMap[log.details.assigned_staff_id] || log.details.assigned_staff_id}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {log.user_name && <>{log.user_name} · </>}
                                  {d ? format(d, 'MMM d, yyyy h:mm a') : '—'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a ticket to view details</p>
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => router.visit('/admin/repairs/intake')}
                >
                  <ClipboardPlus className="h-4 w-4" />
                  New Walk-in Intake
                </Button>
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
