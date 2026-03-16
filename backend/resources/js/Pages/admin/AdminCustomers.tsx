import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Star } from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface CustomerWithFavorite {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  island: string | null;
  is_favorite: boolean;
  created_at: string;
}

export default function AdminCustomers() {
  const [search, setSearch] = useState('');

  const { data: customers } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;

      const { data } = await axios.get('/api/admin/customers', { params });
      return data as CustomerWithFavorite[];
    }
  });

  return (
    <AdminLayout>
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Customers</h1>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
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
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Island</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {customer.is_favorite && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        VIP
                      </Badge>
                    )}
                    {customer.name}
                  </div>
                </TableCell>
                <TableCell>{customer.phone || '-'}</TableCell>
                <TableCell>{customer.email || '-'}</TableCell>
                <TableCell>{customer.island || '-'}</TableCell>
                <TableCell>{format(new Date(customer.created_at), 'MMM d, yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
    </AdminLayout>
  );
}
