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
import { Plus, Pencil, Monitor, Users, Clock } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

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

export default function AdminRegisters() {
  const [editRegister, setEditRegister] = useState<RegisterData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignRegister, setAssignRegister] = useState<RegisterData | null>(null);
  const queryClient = useQueryClient();

  const { data: registers } = useQuery({
    queryKey: ['admin-registers'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/registers');
      return data as RegisterData[];
    },
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
                          <Clock className="h-3 w-3 text-green-600" />
                          <span className="text-green-600 font-medium">Open</span>
                          <span className="text-muted-foreground">
                            since {new Date(reg.active_session.opened_at).toLocaleTimeString()}
                          </span>
                        </div>
                        {reg.session_duration_minutes != null && (
                          <div className="text-xs text-muted-foreground pl-4">
                            {Math.floor(reg.session_duration_minutes / 60)}h {reg.session_duration_minutes % 60}m
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Closed</span>
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
  );
}

function RegisterForm({
  register,
  onSuccess,
}: {
  register: RegisterData | null;
  onSuccess: () => void;
}) {
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
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Register 1"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="e.g. Freeport Store"
        />
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : (register ? 'Update Register' : 'Create Register')}
      </Button>
    </form>
  );
}

function AssignStaffForm({
  register,
  cashiers,
  onSuccess,
}: {
  register: RegisterData;
  cashiers: { id: number; name: string; role: string }[];
  onSuccess: () => void;
}) {
  const assignedIds = new Set(register.assigned_staff?.map(s => s.id) || []);
  const [selected, setSelected] = useState<Set<number>>(assignedIds);

  const mutation = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/admin/registers/${register.id}/assign`, {
        user_ids: Array.from(selected),
      });
    },
    onSuccess: () => {
      toast.success('Staff assignments updated');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update assignments');
    },
  });

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select which staff members can use this register.
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {cashiers.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={() => toggle(c.id)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <div>
              <div className="font-medium text-sm">{c.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{c.role.replace('_', ' ')}</div>
            </div>
          </label>
        ))}
        {cashiers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No cashier or admin staff found.</p>
        )}
      </div>
      <Button onClick={() => mutation.mutate()} className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save Assignments'}
      </Button>
    </div>
  );
}
