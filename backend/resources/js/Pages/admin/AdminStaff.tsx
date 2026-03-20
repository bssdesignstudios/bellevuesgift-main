import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Plus, Pencil, Trash2, UserCheck, Search, Users, Shield, ShoppingCart, Warehouse, DollarSign, Loader2 } from 'lucide-react';
import { Staff } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin:             { label: 'Admin',             color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Shield },
  cashier:           { label: 'Cashier',           color: 'bg-blue-100 text-blue-800 border-blue-200',     icon: ShoppingCart },
  warehouse:         { label: 'Warehouse',         color: 'bg-amber-100 text-amber-800 border-amber-200',  icon: Warehouse },
  warehouse_manager: { label: 'Warehouse Mgr',     color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Warehouse },
  finance:           { label: 'Finance',           color: 'bg-green-100 text-green-800 border-green-200',  icon: DollarSign },
};

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role] || { label: role, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Users };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`${config.color} border font-medium gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default function AdminStaff() {
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Staff | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<Staff | null>(null);
  const [impersonatePassword, setImpersonatePassword] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();
  const { impersonate, impersonating, staff: currentStaff } = useAuth();

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/staff');
      return response.data as Staff[];
    }
  });

  const filtered = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch = !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || s.role === roleFilter;
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && s.is_active) ||
        (statusFilter === 'inactive' && !s.is_active);
      return matchSearch && matchRole && matchStatus;
    });
  }, [staffList, search, roleFilter, statusFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    staffList.forEach((s) => { counts[s.role] = (counts[s.role] || 0) + 1; });
    return counts;
  }, [staffList]);

  const activeCount = staffList.filter(s => s.is_active).length;
  const inactiveCount = staffList.filter(s => !s.is_active).length;

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string | number; is_active: boolean }) => {
      await axios.patch(`/api/admin/staff/${id}/toggle-active`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
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

  const handleImpersonate = async () => {
    if (!impersonateTarget) return;

    try {
      await impersonate(String(impersonateTarget.id), impersonatePassword);
      toast.success(`Now impersonating ${impersonateTarget.name}`);
      setImpersonateTarget(null);
      setImpersonatePassword('');
    } catch (err: any) {
      toast.error(err.message || 'Impersonation failed');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground">
              {staffList.length} team member{staffList.length !== 1 ? 's' : ''} &middot;{' '}
              <span className="text-green-600">{activeCount} active</span>
              {inactiveCount > 0 && <span className="text-muted-foreground"> &middot; {inactiveCount} inactive</span>}
            </p>
          </div>
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
                onSuccess={() => {
                  setIsDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Impersonation Banner */}
        {impersonating && (
          <div className="bg-warning/10 border border-warning rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">Currently impersonating: {currentStaff?.name}</div>
              <div className="text-sm text-muted-foreground">Role: {currentStaff?.role}</div>
            </div>
            <Button variant="outline" onClick={() => impersonate(null)}>
              Stop Impersonating
            </Button>
          </div>
        )}

        {/* Role Summary Pills */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROLE_CONFIG).map(([role, config]) => {
            const count = roleCounts[role] || 0;
            if (count === 0) return null;
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  roleFilter === role
                    ? 'ring-2 ring-offset-1 ring-primary ' + config.color
                    : config.color + ' opacity-80 hover:opacity-100'
                }`}
              >
                <config.icon className="h-3.5 w-3.5" />
                {config.label}
                <span className="ml-0.5 font-bold">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                <SelectItem key={role} value={role}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); }}
            >
              Clear filters
            </Button>
          )}
        </div>

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

        {/* Staff Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>POS PIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {staffList.length === 0 ? 'No staff members yet.' : 'No staff match your filters.'}
                  </TableCell>
                </TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id} className={!s.is_active ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${
                        s.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={s.role} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {['admin', 'cashier'].includes(s.role) ? (s.pos_pin || <span className="text-muted-foreground">—</span>) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: s.id, is_active: checked })
                        }
                      />
                      <span className={`text-xs font-medium ${s.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
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
                      {String(s.id) !== String(currentStaff?.id) && s.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setImpersonateTarget(s)}
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

        {/* Showing count */}
        {!isLoading && filtered.length > 0 && filtered.length !== staffList.length && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {filtered.length} of {staffList.length} staff members
          </p>
        )}

        {/* Impersonation Re-auth Dialog */}
        <Dialog open={!!impersonateTarget} onOpenChange={(open) => !open && setImpersonateTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Impersonation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                You are about to impersonate <strong>{impersonateTarget?.name}</strong>.
                For security, please enter your admin password.
              </p>
              <div className="space-y-2">
                <Label>Your Password</Label>
                <Input
                  type="password"
                  value={impersonatePassword}
                  onChange={(e) => setImpersonatePassword(e.target.value)}
                  placeholder="Enter your password"
                  onKeyDown={(e) => e.key === 'Enter' && handleImpersonate()}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImpersonateTarget(null)}>
                Cancel
              </Button>
              <Button onClick={handleImpersonate} disabled={!impersonatePassword}>
                Start Impersonation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function StaffForm({
  staff,
  onSuccess
}: {
  staff: Staff | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    role: staff?.role || 'cashier',
    password: '',
    pos_pin: staff?.pos_pin || '',
    is_active: staff?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {

      const data: Record<string, any> = {
        name: form.name,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
        pos_pin: ['admin', 'cashier'].includes(form.role) ? (form.pos_pin || null) : null,
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

      {['admin', 'cashier'].includes(form.role) && (
        <div className="space-y-2">
          <Label>POS PIN <span className="text-muted-foreground text-xs">(4 digits for POS login)</span></Label>
          <Input
            value={form.pos_pin}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4);
              setForm({ ...form, pos_pin: v });
            }}
            placeholder="e.g. 1234"
            maxLength={4}
            inputMode="numeric"
            pattern="[0-9]{4}"
            className="font-mono tracking-widest"
          />
        </div>
      )}

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
