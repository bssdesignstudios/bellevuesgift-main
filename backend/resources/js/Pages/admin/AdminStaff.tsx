import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from '@inertiajs/react';
import { supabase } from '@/integrations/supabase/client';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, UserCheck } from 'lucide-react';
import { Staff } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoModeEnabled } from '@/lib/demoSession';
import { DEMO_STAFF } from '@/lib/demoData';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminStaff() {
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { impersonate, impersonating, effectiveStaff, staff: currentStaff } = useAuth();
  const isDemoMode = isDemoModeEnabled();

  const { data: staffList } = useQuery({
    queryKey: ['admin-staff', isDemoMode],
    queryFn: async () => {
      // In demo mode, return mock data since RLS blocks access
      if (isDemoMode) {
        return DEMO_STAFF as Staff[];
      }

      const response = await axios.get('/api/admin/staff');
      return response.data as Staff[];
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (isDemoMode) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }

      await axios.put(`/api/admin/staff/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    }
  });

  const handleImpersonate = (staffMember: Staff) => {
    if (staffMember.id === currentStaff?.id) {
      toast.error("You can't impersonate yourself");
      return;
    }
    impersonate(staffMember);
    toast.success(`Now impersonating ${staffMember.name}`);
    // Non-admin roles can't access the admin panel — redirect to POS
    if (staffMember.role === 'cashier') {
      router.visit('/pos');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditStaff(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editStaff ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
              </DialogHeader>
              <StaffForm
                staff={editStaff}
                isDemoMode={isDemoMode}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {impersonating && (
          <div className="bg-warning/10 border border-warning rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">Currently impersonating: {impersonating.name}</div>
              <div className="text-sm text-muted-foreground">Role: {impersonating.role}</div>
            </div>
            <Button variant="outline" onClick={() => impersonate(null)}>
              Stop Impersonating
            </Button>
          </div>
        )}

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {s.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={(checked) =>
                        toggleActive.mutate({ id: s.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditStaff(s);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {s.id !== currentStaff?.id && s.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImpersonate(s)}
                          title={!['admin'].includes(s.role) ? `Impersonate will switch to POS (${s.role} role)` : undefined}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Login as
                        </Button>
                      )}
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

function StaffForm({
  staff,
  isDemoMode,
  onSuccess
}: {
  staff: Staff | null;
  isDemoMode: boolean;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    role: staff?.role || 'cashier',
    is_active: staff?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return;
      }

      const data = {
        name: form.name,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
      };

      if (staff) {
        await axios.put(`/api/admin/staff/${staff.id}`, data);
      } else {
        await axios.post('/api/admin/staff', data);
      }
    },
    onSuccess: () => {
      toast.success(staff ? 'Staff updated' : 'Staff created');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Staff['role'] })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cashier">Cashier</SelectItem>
            <SelectItem value="warehouse">Warehouse</SelectItem>
            <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
        <Label>Active</Label>
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : (staff ? 'Update Staff' : 'Create Staff')}
      </Button>
    </form>
  );
}
