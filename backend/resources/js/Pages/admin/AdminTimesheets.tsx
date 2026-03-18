import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Play, Square, Calendar, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';

interface TimeLog {
  id: string;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  hours: string | number | null;
  task: string | null;
  notes: string | null;
  status: 'in_progress' | 'completed' | 'pending_review';
  created_at: string;
}

interface TimesheetStats {
  today_hours: number;
  active_staff: number;
  pending_reviews: number;
  avg_shift: number;
}

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  pending_review: 'bg-amber-500',
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  pending_review: 'Pending Review',
};

export default function AdminTimesheets() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editLog, setEditLog] = useState<TimeLog | null>(null);
  const [activeClockId, setActiveClockId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const pageProps = (usePage().props as any);
  const staffName: string = pageProps?.auth?.staff?.name ?? 'Staff';

  const { data, isLoading } = useQuery({
    queryKey: ['timesheets', search, dateFrom, dateTo],
    queryFn: async () => {
      const res = await axios.get('/api/admin/timesheets', {
        params: { search, date_from: dateFrom || undefined, date_to: dateTo || undefined },
      });
      return res.data as { logs: TimeLog[]; stats: TimesheetStats };
    },
  });

  const logs = data?.logs ?? [];
  const stats = data?.stats ?? { today_hours: 0, active_staff: 0, pending_reviews: 0, avg_shift: 0 };

  // Find any active (clocked-in) log for this user
  const myActiveLog = logs.find(l => l.status === 'in_progress' && l.staff_name === staffName);
  const isClockedIn = !!myActiveLog;

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post('/api/admin/timesheets/clock-in', { task: 'Shift' });
      return res.data as TimeLog;
    },
    onSuccess: (log) => {
      setActiveClockId(log.id);
      toast.success('Shift started — clocked in');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: () => toast.error('Failed to clock in'),
  });

  const clockOutMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/api/admin/timesheets/${id}/clock-out`);
      return res.data;
    },
    onSuccess: () => {
      setActiveClockId(null);
      toast.success('Shift ended — clocked out');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: () => toast.error('Failed to clock out'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axios.delete(`/api/admin/timesheets/${id}`),
    onSuccess: () => {
      toast.success('Log deleted');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });

  const handleShiftToggle = () => {
    if (isClockedIn && myActiveLog) {
      clockOutMutation.mutate(myActiveLog.id);
    } else if (activeClockId) {
      clockOutMutation.mutate(activeClockId);
    } else {
      clockInMutation.mutate();
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Clock className="h-8 w-8 text-brand-blue" />
              Timesheet & Attendance
            </h1>
            <p className="text-muted-foreground">Track work hours and team productivity</p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Time Entry</DialogTitle>
                </DialogHeader>
                <TimeLogForm
                  onSuccess={() => {
                    setIsAddOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['timesheets'] });
                  }}
                />
              </DialogContent>
            </Dialog>

            <Button
              size="lg"
              variant={isClockedIn ? 'destructive' : 'default'}
              onClick={handleShiftToggle}
              disabled={clockInMutation.isPending || clockOutMutation.isPending}
              className="h-14 px-8 text-lg font-bold shadow-lg"
            >
              {isClockedIn ? (
                <><Square className="h-6 w-6 mr-3 fill-current" /> Finish Shift</>
              ) : (
                <><Play className="h-6 w-6 mr-3 fill-current" /> Start Shift</>
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground mb-1">Today's Total Hours</div>
              <div className="text-2xl font-bold">{stats.today_hours.toFixed(1)} hrs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground mb-1">Active Staff</div>
              <div className="text-2xl font-bold">{stats.active_staff}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground mb-1">Pending Reviews</div>
              <div className="text-2xl font-bold text-amber-500">{stats.pending_reviews}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground mb-1">Avg Shift</div>
              <div className="text-2xl font-bold">{stats.avg_shift} hrs</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff or tasks..."
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span className="text-muted-foreground">—</span>
            <Input type="date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Time Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No time logs found.</TableCell>
                  </TableRow>
                ) : logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center font-bold text-brand-navy text-sm">
                          {log.staff_name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium">{log.staff_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(log.clock_in).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>
                      {log.clock_out
                        ? new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-blue-500 text-sm font-medium animate-pulse">Active</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.task ?? '—'}</TableCell>
                    <TableCell className="font-bold">{log.hours ? `${Number(log.hours).toFixed(1)}h` : '—'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[log.status] ?? 'bg-gray-400'}>
                        {STATUS_LABELS[log.status] ?? log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditLog(log)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => { if (confirm('Delete this log?')) deleteMutation.mutate(log.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      {editLog && (
        <Dialog open={!!editLog} onOpenChange={open => !open && setEditLog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Time Log — {editLog.staff_name}</DialogTitle>
            </DialogHeader>
            <EditTimeLogForm
              log={editLog}
              onSuccess={() => {
                setEditLog(null);
                queryClient.invalidateQueries({ queryKey: ['timesheets'] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}

function TimeLogForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    staff_name: '',
    clock_in: '',
    clock_out: '',
    task: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await axios.post('/api/admin/timesheets', {
        ...form,
        clock_out: form.clock_out || null,
      });
    },
    onSuccess: () => {
      toast.success('Time entry added');
      onSuccess();
    },
    onError: () => toast.error('Failed to save entry'),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div>
        <Label>Staff Name</Label>
        <Input value={form.staff_name} onChange={e => setForm({ ...form, staff_name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Clock In</Label>
          <Input type="datetime-local" value={form.clock_in} onChange={e => setForm({ ...form, clock_in: e.target.value })} required />
        </div>
        <div>
          <Label>Clock Out</Label>
          <Input type="datetime-local" value={form.clock_out} onChange={e => setForm({ ...form, clock_out: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Task / Project</Label>
        <Input value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} placeholder="e.g. Inventory Audit" />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Add Entry'}
      </Button>
    </form>
  );
}

function EditTimeLogForm({ log, onSuccess }: { log: TimeLog; onSuccess: () => void }) {
  const [status, setStatus] = useState(log.status);
  const [task, setTask] = useState(log.task ?? '');
  const [notes, setNotes] = useState(log.notes ?? '');

  const mutation = useMutation({
    mutationFn: async () => {
      await axios.patch(`/api/admin/timesheets/${log.id}`, { status, task: task || null, notes: notes || null });
    },
    onSuccess: () => {
      toast.success('Log updated');
      onSuccess();
    },
    onError: () => toast.error('Failed to update'),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div>
        <Label>Status</Label>
        <Select value={status} onValueChange={v => setStatus(v as typeof status)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Task / Project</Label>
        <Input value={task} onChange={e => setTask(e.target.value)} />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
