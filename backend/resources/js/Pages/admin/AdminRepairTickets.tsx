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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Wrench, Search, Plus, Clock, User, Calendar, ChevronRight, Loader2 } from 'lucide-react';
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

export default function AdminRepairTickets() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<RepairTicket | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' });

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

  // Fetch staff for assignment
  const { data: staff } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/repair-tickets/staff');
      return data;
    },
  });

  // Update ticket mutation
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

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (task: { ticket_id: string; title: string; description: string; due_date: string | null }) => {
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

  // Update task mutation
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
                        onClick={() => setSelectedTicket(ticket)}
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
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks ({tasks?.length || 0})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4 mt-4">
                    {/* Customer Info */}
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

                    {/* Item Info */}
                    <div className="space-y-1 text-sm">
                      <p><strong>Service:</strong> {selectedTicket.service_type === 'repair' ? 'Repair' : 'Installation'}</p>
                      {selectedTicket.item_make && <p><strong>Make:</strong> {selectedTicket.item_make}</p>}
                      {selectedTicket.model_number && <p><strong>Model:</strong> {selectedTicket.model_number}</p>}
                    </div>

                    {/* Problem */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Problem Description</Label>
                      <p className="text-sm mt-1">{selectedTicket.problem_description}</p>
                    </div>

                    {/* Status Update */}
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

                    {/* ETA */}
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

                    {/* Notes */}
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
