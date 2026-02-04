import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Star } from 'lucide-react';
import { format } from 'date-fns';
import { isDemoModeEnabled } from '@/lib/demoSession';
import { DEMO_CUSTOMERS } from '@/lib/demoData';
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
  const isDemoMode = isDemoModeEnabled();

  const { data: customers } = useQuery({
    queryKey: ['admin-customers', search, isDemoMode],
    queryFn: async () => {
      // In demo mode, return mock data since RLS blocks access
      if (isDemoMode) {
        let filtered = DEMO_CUSTOMERS as CustomerWithFavorite[];
        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower) ||
            c.phone?.includes(search)
          );
        }
        return filtered.sort((a, b) => {
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }

      let query = supabase
        .from('customers')
        .select('id, name, email, phone, island, is_favorite, created_at')
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
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
