import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from '@inertiajs/react';
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
import { Plus, Pencil, Trash2, UserCheck } from 'lucide-react';
import { Staff } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { isDemoModeEnabled } from '@/lib/demoSession';
import { DEMO_STAFF } from '@/lib/demoData';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminStaff() {
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Staff | null>(null);
  const queryClient = useQueryClient();
  const { impersonate, impersonating, effectiveStaff, staff: currentStaff } = useAuth();
  const isDemoMode = isDemoModeEnabled();

  const { data: staffList } = useQuery({
    queryKey: ['admin-staff', isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_STAFF as Staff[];
      }

      const response = await axios.get('/api/admin/staff');
      return response.data as Staff[];
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string | number; is_active: boolean }) => {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }

      await axios.patch(`/api/admin/staff/${id}/toggle-active`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }

      await axios.delete(`/api/admin/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      toast.success('Staff member deleted');
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete staff member');
      setDeleteConfirm(null);
    }
  });

  const handleImpersonate = (staffMember: Staff) => {
    if (staffMember.id === currentStaff?.id) {
      toast.error("You can't impersonate yourself");
      return;
    }
    impersonate(staffMember);
    toast.success(`Now impersonating ${staffMember.name}`);
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Staff Member</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong> ({deleteConfirm?.email})?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditStaff(s);
                          setIsDialogOpen(true);
                        }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {String(s.id) !== String(currentStaff?.id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(s)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
    password: '',
    is_active: staff?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return;
      }

      const data: Record<string, any> = {
        name: form.name,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
      };

      // Password required on create, optional on edit
      if (form.password) {
        data.password = form.password;
      } else if (!staff) {
        throw new Error('Password is required for new staff members');
      }

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
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || 'An error occurred';
      toast.error(msg);
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
        <Label>Password {staff && <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}</Label>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={staff ? 'Leave blank to keep current' : 'Enter password'}
          required={!staff}
          minLength={6}
        />
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Staff['role'] })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="cashier">Cashier</SelectItem>
            <SelectItem value="warehouse">Warehouse</SelectItem>
            <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
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
