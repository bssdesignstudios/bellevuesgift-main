import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Building2 } from 'lucide-react';
import { Vendor } from '@/types';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminVendors() {
    const [search, setSearch] = useState('');
    const [editVendor, setEditVendor] = useState<Vendor | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: vendors, isLoading } = useQuery({
        queryKey: ['admin-vendors', search],
        queryFn: async () => {
            const response = await axios.get('/api/admin/vendors', { params: { search } });
            return response.data as Vendor[];
        }
    });

    const deleteVendor = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/api/admin/vendors/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
            toast.success('Vendor deleted');
        }
    });

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-8 w-8 text-brand-blue" />
                        <h1 className="text-3xl font-bold">Vendors</h1>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setEditVendor(null)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Vendor
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
                            </DialogHeader>
                            <VendorForm
                                vendor={editVendor}
                                onSuccess={() => {
                                    setIsDialogOpen(false);
                                    queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search vendors..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendor Name</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vendors?.map((vendor) => (
                                <TableRow key={vendor.id}>
                                    <TableCell className="font-medium">{vendor.name}</TableCell>
                                    <TableCell>{vendor.contact_person || '-'}</TableCell>
                                    <TableCell>{vendor.email || '-'}</TableCell>
                                    <TableCell>{vendor.phone || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={vendor.is_active ? 'default' : 'secondary'}>
                                            {vendor.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setEditVendor(vendor);
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive"
                                                onClick={() => {
                                                    if (confirm('Delete this vendor?')) {
                                                        deleteVendor.mutate(vendor.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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

function VendorForm({
    vendor,
    onSuccess
}: {
    vendor: Vendor | null;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        name: vendor?.name || '',
        contact_person: vendor?.contact_person || '',
        email: vendor?.email || '',
        phone: vendor?.phone || '',
        address: vendor?.address || '',
        is_active: vendor?.is_active ?? true,
    });

    const mutation = useMutation({
        mutationFn: async () => {
            if (vendor) {
                await axios.put(`/api/admin/vendors/${vendor.id}`, form);
            } else {
                await axios.post('/api/admin/vendors', form);
            }
        },
        onSuccess: () => {
            toast.success(vendor ? 'Vendor updated' : 'Vendor created');
            onSuccess();
        },
        onError: (error: any) => {
            toast.error('Error: ' + (error.response?.data?.message || error.message));
        }
    });

    return (
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
                <Label>Active</Label>
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : (vendor ? 'Update Vendor' : 'Create Vendor')}
            </Button>
        </form>
    );
}
