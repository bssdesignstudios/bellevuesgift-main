import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

export default function AdminStaff() {
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { impersonate, impersonating, effectiveStaff, staff: currentStaff, demoSession } = useAuth();
  const isDemoMode = isDemoModeEnabled();

  const { data: staffList } = useQuery({
    queryKey: ['admin-staff', isDemoMode],
    queryFn: async () => {
      // In demo mode, return mock data since RLS blocks access
      if (isDemoMode) {
        return DEMO_STAFF as Staff[];
      }
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Staff[];
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('staff')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
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
  };

  return (
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
    is_active: staff?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: form.name,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
      };

      if (staff) {
        const { error } = await supabase
          .from('staff')
          .update(data)
          .eq('id', staff.id);
        if (error) throw error;
      } else {
        // For new staff, we just create a record without auth user
        // In production, you'd use admin API to create auth user too
        const { error } = await supabase.from('staff').insert(data);
        if (error) throw error;
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
            <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
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
