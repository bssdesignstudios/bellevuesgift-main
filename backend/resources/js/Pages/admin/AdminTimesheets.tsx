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
import {
  Clock, Play, Square, Calendar, Search, Plus, Pencil, Trash2,
  Users, Timer, ClipboardCheck, TrendingUp, Loader2, User
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

interface OnShiftEntry {
  id: string;
  staff_name: string;
  clock_in: string;
  task: string | null;
  duration_minutes: number;
  duration_display: string;
}

interface TimesheetStats {
  today_hours: number;
  today_entries: number;
  active_staff: number;
  pending_reviews: number;
  avg_shift: number;
  week_hours: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'On Shift', color: 'bg-blue-500 text-white' },
  completed: { label: 'Completed', color: 'bg-emerald-500 text-white' },
  pending_review: { label: 'Needs Review', color: 'bg-amber-500 text-white' },
};

export default function AdminTimesheets() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editLog, setEditLog] = useState<TimeLog | null>(null);
  const [activeClockId, setActiveClockId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const pageProps = (usePage().props as any);
  const staffName: string = pageProps?.auth?.staff?.name ?? 'Staff';

  const { data, isLoading } = useQuery({
    queryKey: ['timesheets', search, dateFrom, dateTo, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await axios.get('/api/admin/timesheets', { params });
      return res.data as { logs: TimeLog[]; stats: TimesheetStats; on_shift: OnShiftEntry[] };
    },
  });

  const logs = data?.logs ?? [];
  const stats = data?.stats ?? { today_hours: 0, today_entries: 0, active_staff: 0, pending_reviews: 0, avg_shift: 0, week_hours: 0 };
  const onShift = data?.on_shift ?? [];

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
        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Timesheets</h1>
            <p className="text-muted-foreground">Track shifts, hours, and team attendance</p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Add Entry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Time Entry</DialogTitle></DialogHeader>
                <TimeLogForm onSuccess={() => { setIsAddOpen(false); queryClient.invalidateQueries({ queryKey: ['timesheets'] }); }} />
              </DialogContent>
            </Dialog>
            <Button
              size="lg"
              variant={isClockedIn ? 'destructive' : 'default'}
              onClick={handleShiftToggle}
              disabled={clockInMutation.isPending || clockOutMutation.isPending}
              className="h-14 px-8 text-lg font-bold shadow-lg"
            >
              {clockInMutation.isPending || clockOutMutation.isPending ? (
                <Loader2 className="h-6 w-6 mr-3 animate-spin" />
              ) : isClockedIn ? (
                <><Square className="h-6 w-6 mr-3 fill-current" /> End Shift</>
              ) : (
                <><Play className="h-6 w-6 mr-3 fill-current" /> Start Shift</>
              )}
            </Button>
          </div>
        </div>

        {/* CURRENTLY ON SHIFT */}
        {onShift.length > 0 && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                Currently On Shift ({onShift.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {onShift.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{entry.staff_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.duration_display} · since {format(new Date(entry.clock_in), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4" /> Today
              </div>
              <div className="text-2xl font-bold">{stats.today_hours.toFixed(1)}h</div>
              <div className="text-xs text-muted-foreground">{stats.today_entries} entries</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" /> This Week
              </div>
              <div className="text-2xl font-bold">{stats.week_hours.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4 text-blue-500" /> On Shift
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.active_staff}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ClipboardCheck className="h-4 w-4 text-amber-500" /> Needs Review
              </div>
              <div className={`text-2xl font-bold ${stats.pending_reviews > 0 ? 'text-amber-600' : ''}`}>
                {stats.pending_reviews}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Timer className="h-4 w-4" /> Avg Shift
              </div>
              <div className="text-2xl font-bold">{stats.avg_shift}h</div>
            </CardContent>
          </Card>
          <Card className="hidden lg:block">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" /> Records
              </div>
              <div className="text-2xl font-bold">{logs.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* FILTERS */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff or tasks..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_progress">On Shift</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending_review">Needs Review</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span className="text-muted-foreground">—</span>
            <Input type="date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />Loading...
                </TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />No time logs found.
                </TableCell></TableRow>
              ) : logs.map((log) => {
                const hours = Number(log.hours || 0);
                const isLong = hours > 10;
                const sc = STATUS_CONFIG[log.status] || { label: log.status, color: 'bg-gray-400 text-white' };
                return (
                  <TableRow key={log.id} className={log.status === 'in_progress' ? 'bg-blue-50/50' : log.status === 'pending_review' ? 'bg-amber-50/30' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                          {log.staff_name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium">{log.staff_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(log.clock_in), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-sm font-mono">{format(new Date(log.clock_in), 'h:mm a')}</TableCell>
                    <TableCell className="text-sm font-mono">
                      {log.clock_out
                        ? format(new Date(log.clock_out), 'h:mm a')
                        : <span className="text-blue-500 font-medium animate-pulse">Active</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.task ?? '—'}</TableCell>
                    <TableCell className={`text-right font-bold ${isLong ? 'text-amber-600' : ''}`}>
                      {log.hours ? `${hours.toFixed(1)}h` : '—'}
                      {isLong && <span className="text-xs ml-1" title="Long shift">!</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={sc.color}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditLog(log)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" title="Delete"
                          onClick={() => { if (confirm('Delete this time log?')) deleteMutation.mutate(log.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* EDIT DIALOG */}
      {editLog && (
        <Dialog open={!!editLog} onOpenChange={open => !open && setEditLog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit — {editLog.staff_name}</DialogTitle></DialogHeader>
            <EditTimeLogForm log={editLog} onSuccess={() => { setEditLog(null); queryClient.invalidateQueries({ queryKey: ['timesheets'] }); }} />
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}

function TimeLogForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ staff_id: '', staff_name: '', clock_in: '', clock_out: '', task: '', notes: '' });
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);

  const { data: allStaff } = useQuery({
    queryKey: ['admin-staff-for-timesheet'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/staff');
      return (data as any[]).filter(s => s.is_active !== false);
    },
  });

  const filteredStaff = (allStaff || []).filter((s: any) =>
    s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const selectStaff = (s: any) => {
    setForm({ ...form, staff_id: String(s.id), staff_name: s.name });
    setStaffSearch(s.name);
    setStaffDropdownOpen(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      await axios.post('/api/admin/timesheets', {
        staff_id: form.staff_id || null,
        staff_name: form.staff_name,
        clock_in: form.clock_in,
        clock_out: form.clock_out || null,
        task: form.task || null,
        notes: form.notes || null,
      });
    },
    onSuccess: () => { toast.success('Time entry added'); onSuccess(); },
    onError: () => toast.error('Failed to save entry'),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="relative">
        <Label>Staff Member <span className="text-destructive">*</span></Label>
        <Input value={staffSearch}
          onChange={e => { setStaffSearch(e.target.value); setForm({ ...form, staff_id: '', staff_name: e.target.value }); setStaffDropdownOpen(true); }}
          onFocus={() => setStaffDropdownOpen(true)}
          placeholder="Search staff..." required={!form.staff_id} />
        {staffDropdownOpen && filteredStaff.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredStaff.map((s: any) => (
              <button key={s.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between"
                onClick={() => selectStaff(s)}>
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{s.role?.replace(/_/g, ' ')}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Clock In <span className="text-destructive">*</span></Label>
          <Input type="datetime-local" value={form.clock_in} onChange={e => setForm({ ...form, clock_in: e.target.value })} required /></div>
        <div><Label>Clock Out</Label>
          <Input type="datetime-local" value={form.clock_out} onChange={e => setForm({ ...form, clock_out: e.target.value })} /></div>
      </div>
      <div><Label>Task</Label><Input value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} placeholder="e.g. Inventory Audit" /></div>
      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
      <Button type="submit" className="w-full" disabled={mutation.isPending || !form.staff_name}>
        {mutation.isPending ? 'Saving...' : 'Add Entry'}
      </Button>
    </form>
  );
}

function EditTimeLogForm({ log, onSuccess }: { log: TimeLog; onSuccess: () => void }) {
  const [status, setStatus] = useState(log.status);
  const [task, setTask] = useState(log.task ?? '');
  const [notes, setNotes] = useState(log.notes ?? '');
  const [hours, setHours] = useState(log.hours ? String(Number(log.hours)) : '');

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = { status, task: task || null, notes: notes || null };
      if (hours) payload.hours = parseFloat(hours);
      await axios.patch(`/api/admin/timesheets/${log.id}`, payload);
    },
    onSuccess: () => { toast.success('Log updated'); onSuccess(); },
    onError: () => toast.error('Failed to update'),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="p-3 bg-muted rounded-md text-sm">
        <div><strong>Clock In:</strong> {format(new Date(log.clock_in), 'MMM d, yyyy h:mm a')}</div>
        {log.clock_out && <div><strong>Clock Out:</strong> {format(new Date(log.clock_out), 'MMM d, yyyy h:mm a')}</div>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={v => setStatus(v as typeof status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in_progress">On Shift</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending_review">Needs Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Hours (override)</Label>
          <Input type="number" step="0.1" min="0" value={hours} onChange={e => setHours(e.target.value)} placeholder="Auto-calculated" />
        </div>
      </div>
      <div><Label>Task</Label><Input value={task} onChange={e => setTask(e.target.value)} /></div>
      <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
