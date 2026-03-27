import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings, Globe } from 'lucide-react';

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/settings');
      return data as { maintenance_mode: boolean };
    },
  });

  const maintenanceMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data } = await axios.post('/api/admin/settings/maintenance', { enabled });
      return data as { maintenance_mode: boolean };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['admin-settings'], result);
      toast.success(result.maintenance_mode ? 'Coming soon page enabled' : 'Store is now live');
    },
    onError: () => toast.error('Failed to update setting'),
  });

  return (
    <AdminLayout>
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage store configuration.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Storefront
            </CardTitle>
            <CardDescription>
              Control what customers see on the public website.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Coming Soon Page</Label>
                <p className="text-sm text-muted-foreground">
                  Show a "Coming Soon" page to all public visitors. Admin, POS, and staff tools are unaffected.
                </p>
              </div>
              {isLoading ? (
                <div className="w-10 h-6 bg-muted rounded-full animate-pulse shrink-0" />
              ) : (
                <Switch
                  checked={data?.maintenance_mode ?? false}
                  onCheckedChange={(checked) => maintenanceMutation.mutate(checked)}
                  disabled={maintenanceMutation.isPending}
                  className="shrink-0"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
