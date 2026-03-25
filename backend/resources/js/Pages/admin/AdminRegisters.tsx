import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Monitor, Users, Clock, Eye, AlertTriangle, LogOut, RefreshCcw, XCircle, CheckCircle2, ArrowLeftRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { format, formatDistanceToNow } from 'date-fns';

interface RegisterData {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
  assigned_staff: { id: number; name: string; email: string; role: string }[];
  active_session: {
    id: string;
    staff_id: string;
    opened_at: string;
    opening_balance: string;
  } | null;
  today_sales: number;
  today_orders: number;
  last_transaction_at: string | null;
  session_duration_minutes: number | null;
}

interface ActivityLog {
  type: 'activity' | 'cashier';
  action: string;
  details: Record<string, any> | null;
  staff_name: string;
  occurred_at: string;
}

interface SessionRecord {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number;
  status: string;
}

// ── Action label helpers ─────────────────────────────────────────────────────
const ACTION_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  session_open:       { label: 'Session Opened',      color: 'text-green-600',  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  session_close:      { label: 'Session Closed',      color: 'text-slate-500',  icon: <XCircle className="h-3.5 w-3.5" /> },
  session_force_close:{ label: 'Force Closed',        color: 'text-red-600',    icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  force_close:        { label: 'Force Closed (Admin)',color: 'text-red-600',    icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  switch_out:         { label: 'Cashier Switched Out',color: 'text-amber-600',  icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
  switch_in:          { label: 'Cashier Switched In', color: 'text-cyan-600',   icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
  sale:               { label: 'Sale Completed',      color: 'text-blue-600',   icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  refund:             { label: 'Refund Processed',    color: 'text-orange-600', icon: <RefreshCcw className="h-3.5 w-3.5" /> },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { label: action.replace(/_/g, ' '), color: 'text-muted-foreground', icon: <Clock className="h-3.5 w-3.5" /> };
}

export default function AdminRegisters() {
  const [editRegister, setEditRegister] = useState<RegisterData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignRegister, setAssignRegister] = useState<RegisterData | null>(null);
  const [detailRegister, setDetailRegister] = useState<RegisterData | null>(null);
  const queryClient = useQueryClient();

  const { data: registers } = useQuery({
    queryKey: ['admin-registers'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/registers');
      return data as RegisterData[];
    },
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const { data: cashiers } = useQuery({
    queryKey: ['admin-staff-cashiers'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/staff');
      return (data as any[]).filter(s => ['cashier', 'admin'].includes(s.role));
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await axios.put(`/api/admin/registers/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registers'] });
    },
  });

  return (
    <>
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Registers</h1>
            <p className="text-muted-foreground">Manage POS terminals and cashier assignments</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditRegister(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Register
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editRegister ? 'Edit Register' : 'Add Register'}</DialogTitle>
              </DialogHeader>
              <RegisterForm
                register={editRegister}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['admin-registers'] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Assign Staff Dialog */}
        <Dialog open={!!assignRegister} onOpenChange={(open) => !open && setAssignRegister(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Staff to {assignRegister?.name}</DialogTitle>
            </DialogHeader>
            {assignRegister && (
              <AssignStaffForm
                register={assignRegister}
                cashiers={cashiers || []}
                onSuccess={() => {
                  setAssignRegister(null);
                  queryClient.invalidateQueries({ queryKey: ['admin-registers'] });
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Register</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead>Current Session</TableHead>
                <TableHead>Today's Sales</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registers?.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      {reg.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{reg.location}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {reg.assigned_staff?.length > 0 ? (
                        reg.assigned_staff.map((s) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {s.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No staff assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {reg.active_session ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          <span className="text-green-600 font-medium">Open</span>
                          <span className="text-muted-foreground">
                            since {new Date(reg.active_session.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {reg.session_duration_minutes != null && (
                          <div className="text-xs text-muted-foreground pl-3">
                            {Math.floor(reg.session_duration_minutes / 60)}h {reg.session_duration_minutes % 60}m
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Closed
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">${Number(reg.today_sales || 0).toFixed(2)}</div>
                      <div className="text-muted-foreground text-xs">{reg.today_orders || 0} orders</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={reg.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: reg.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDetailRegister(reg)}
                        title="View Activity"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditRegister(reg); setIsDialogOpen(true); }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAssignRegister(reg)}
                        title="Assign Staff"
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!registers || registers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No registers yet. Click "Add Register" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
    {detailRegister && (
      <RegisterDetail
        register={detailRegister}
        onClose={() => setDetailRegister(null)}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin-registers'] })}
      />
    )}
    </>
  );
}

// ── Register Form ─────────────────────────────────────────────────────────────
function RegisterForm({ register, onSuccess }: { register: RegisterData | null; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: register?.name || '',
    location: register?.location || 'Freeport Store',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (register) {
        await axios.put(`/api/admin/registers/${register.id}`, form);
      } else {
        await axios.post('/api/admin/registers', form);
      }
    },
    onSuccess: () => {
      toast.success(register ? 'Register updated' : 'Register created');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to save register');
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Register 1" required />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Freeport Store" />
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : (register ? 'Update Register' : 'Create Register')}
      </Button>
    </form>
  );
}

// ── Assign Staff Form ─────────────────────────────────────────────────────────
function AssignStaffForm({ register, cashiers, onSuccess }: { register: RegisterData; cashiers: { id: number; name: string; role: string }[]; onSuccess: () => void }) {
  const assignedIds = new Set(register.assigned_staff?.map(s => s.id) || []);
  const [selected, setSelected] = useState<Set<number>>(assignedIds);

  const mutation = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/admin/registers/${register.id}/assign`, { user_ids: Array.from(selected) });
    },
    onSuccess: () => { toast.success('Staff assignments updated'); onSuccess(); },
    onError: (error: any) => { toast.error(error?.response?.data?.message || 'Failed'); },
  });

  const toggle = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Select which staff members can use this register.</p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {cashiers.map((c) => (
          <label key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4 rounded border-gray-300" />
            <div>
              <div className="font-medium text-sm">{c.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{c.role.replace('_', ' ')}</div>
            </div>
          </label>
        ))}
        {cashiers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No cashier or admin staff found.</p>}
      </div>
      <Button onClick={() => mutation.mutate()} className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save Assignments'}
      </Button>
    </div>
  );
}

// ── Register Detail Sheet ─────────────────────────────────────────────────────
function RegisterDetail({ register, onClose, onRefresh }: { register: RegisterData; onClose: () => void; onRefresh: () => void }) {
  const queryClient = useQueryClient();
  const [adminPin, setAdminPin] = useState('');
  const [showForceClose, setShowForceClose] = useState(false);

  const { data: activityData, isLoading, refetch } = useQuery({
    queryKey: ['register-activity', register.id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/admin/registers/${register.id}/activity-logs`);
      return data as { logs: ActivityLog[]; sessions: SessionRecord[] };
    },
    refetchInterval: 15_000,
  });

  const forceClose = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/admin/registers/${register.id}/force-close`, { admin_pin: adminPin });
    },
    onSuccess: () => {
      toast.success('Register session force-closed');
      setShowForceClose(false);
      setAdminPin('');
      queryClient.invalidateQueries({ queryKey: ['register-activity', register.id] });
      onRefresh();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Force close failed');
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['register-orders', register.id],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/orders', { params: { register_id: register.id, limit: 10 } });
      return data as any[];
    },
    enabled: !!register.id,
  });

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-[520px] sm:w-[580px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {register.name}
            {register.active_session ? (
              <Badge className="bg-green-500 text-white ml-2 animate-pulse">LIVE</Badge>
            ) : (
              <Badge variant="outline" className="border-red-500 text-red-500 ml-2 uppercase text-[10px]">Offline</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">

          {/* Core info + Force Close */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Location</p>
              <p className="font-medium mt-1">{register.location || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
              <Badge className={`mt-1 ${register.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                {register.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Current Session + Force Close */}
          <div className="rounded-xl border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-b">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Session</span>
              {register.active_session && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowForceClose(!showForceClose)}
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Force Close Register
                </Button>
              )}
            </div>
            <div className="p-4">
              {register.active_session ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    Session Open
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Opened</p>
                      <p className="font-medium">{format(new Date(register.active_session.opened_at), 'h:mm a')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-medium">{register.session_duration_minutes != null ? `${Math.floor(register.session_duration_minutes / 60)}h ${register.session_duration_minutes % 60}m` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Opening Float</p>
                      <p className="font-medium">${Number(register.active_session.opening_balance).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Today's Sales</p>
                      <p className="font-medium text-green-600">${Number(register.today_sales || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Force close PIN entry */}
                  {showForceClose && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-red-600 text-sm font-bold">
                        <AlertTriangle className="h-4 w-4" />
                        Admin Authorization Required
                      </div>
                      <Input
                        type="password"
                        placeholder="Enter Admin PIN"
                        maxLength={4}
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                        className="text-center tracking-widest font-bold"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowForceClose(false); setAdminPin(''); }}>
                          Cancel
                        </Button>
                        <Button variant="destructive" size="sm" className="flex-1" onClick={() => forceClose.mutate()} disabled={adminPin.length < 4 || forceClose.isPending}>
                          {forceClose.isPending ? 'Closing...' : 'Confirm Force Close'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  No Active Session
                </div>
              )}
            </div>
          </div>

          {/* Today's Metrics */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Today's Metrics</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Sales</p>
                <p className="text-xl font-bold">${Number(register.today_sales || 0).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{register.today_orders || 0}</p>
              </div>
            </div>
          </div>

          {/* ── Activity Log Timeline ────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold">Activity Log</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => refetch()}>
                <RefreshCcw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">Loading logs...</div>
            ) : activityData?.logs && activityData.logs.length > 0 ? (
              <div className="relative pl-5 border-l-2 border-border space-y-4">
                {activityData.logs.map((log, idx) => {
                  const meta = getActionMeta(log.action);
                  return (
                    <div key={idx} className="relative">
                      {/* dot on the timeline */}
                      <div className={`absolute -left-[22px] top-0.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center bg-white dark:bg-slate-900 ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <div className="pl-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {log.occurred_at ? formatDistanceToNow(new Date(log.occurred_at), { addSuffix: true }) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">by {log.staff_name}</p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-1 text-xs bg-muted/50 rounded px-2 py-1 space-y-0.5">
                            {log.details.closing_balance != null && (
                              <p>Closing Balance: <strong>${Number(log.details.closing_balance).toFixed(2)}</strong></p>
                            )}
                            {log.details.variance != null && (
                              <p className={log.details.variance < 0 ? 'text-red-500' : 'text-green-600'}>
                                Variance: {log.details.variance >= 0 ? '+' : ''}${Number(log.details.variance).toFixed(2)}
                              </p>
                            )}
                            {log.details.notes && <p>Note: {log.details.notes}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No activity logged yet.</p>
            )}
          </div>

          {/* ── Session History ────────────────────────── */}
          {activityData?.sessions && activityData.sessions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-3">Session History</p>
              <div className="space-y-2">
                {activityData.sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                    <div>
                      <p className="font-medium">{s.opened_at ? format(new Date(s.opened_at), 'MMM d, h:mm a') : '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.closed_at ? `Closed ${format(new Date(s.closed_at), 'h:mm a')}` : 'Still Open'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={s.status === 'open' ? 'default' : 'secondary'} className="text-xs capitalize">
                        {s.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">Float: ${s.opening_balance.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent Orders ─────────────────────────── */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-bold">Recent Orders</p>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-2">
                {recentOrders.slice(0, 8).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">${Number(order.total).toFixed(2)}</p>
                      <Badge variant="outline" className="text-xs capitalize">{order.payment_status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent orders</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
