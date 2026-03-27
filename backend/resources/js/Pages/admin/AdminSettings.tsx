import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings, Globe, LayoutGrid } from 'lucide-react';

const MODULE_LIST = [
  { key: 'dashboard',   label: 'Dashboard' },
  { key: 'pos',         label: 'Point of Sale' },
  { key: 'registers',   label: 'Registers' },
  { key: 'inventory',   label: 'Inventory' },
  { key: 'products',    label: 'Products' },
  { key: 'categories',  label: 'Categories' },
  { key: 'orders',      label: 'Orders' },
  { key: 'repairs',     label: 'Repairs' },
  { key: 'customers',   label: 'Customers' },
  { key: 'vendors',     label: 'Vendors' },
  { key: 'staff',       label: 'Staff' },
  { key: 'discounts',   label: 'Discounts' },
  { key: 'reports',     label: 'Reports' },
  { key: 'expenses',    label: 'Expenses' },
  { key: 'settings',    label: 'Settings' },
  { key: 'help',        label: 'Help' },
  { key: 'gift_cards',  label: 'Gift Cards' },
  { key: 'timesheets',  label: 'Timesheets' },
  { key: 'payroll',     label: 'Payroll' },
  { key: 'quotes',      label: 'Quotes' },
  { key: 'invoices',    label: 'Invoices' },
  { key: 'statements',  label: 'Statements' },
] as const;

interface Setting {
  key: string;
  value: string;
}

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const { data: settingsArray = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/settings');
      return data as Setting[];
    },
  });

  // Build a lookup map from the array
  const settingsMap: Record<string, string> = {};
  for (const s of settingsArray) {
    settingsMap[s.key] = s.value;
  }

  const maintenanceMode = settingsMap['maintenance_mode'] === '1' || settingsMap['maintenance_mode'] === 'true';

  const maintenanceMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data } = await axios.post('/api/admin/settings/maintenance', { enabled });
      return data as { maintenance_mode: boolean };
    },
    onSuccess: (result) => {
      // Patch local cache
      queryClient.setQueryData<Setting[]>(['admin-settings'], (prev = []) => {
        const filtered = prev.filter((s) => s.key !== 'maintenance_mode');
        return [...filtered, { key: 'maintenance_mode', value: result.maintenance_mode ? '1' : '0' }];
      });
      toast.success(result.maintenance_mode ? 'Coming soon page enabled' : 'Store is now live');
    },
    onError: () => toast.error('Failed to update setting'),
  });

  const moduleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await axios.put('/api/admin/settings', {
        settings: [{ key: `module.${key}`, value }],
      });
      return { key, value };
    },
    onSuccess: ({ key, value }) => {
      queryClient.setQueryData<Setting[]>(['admin-settings'], (prev = []) => {
        const filtered = prev.filter((s) => s.key !== `module.${key}`);
        return [...filtered, { key: `module.${key}`, value }];
      });
      toast.success('Module setting saved');
    },
    onError: () => toast.error('Failed to update module setting'),
  });

  const isModuleEnabled = (key: string): boolean => {
    const val = settingsMap[`module.${key}`];
    if (val === undefined) return true; // default on
    return val === '1' || val === 'true';
  };

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
                  checked={maintenanceMode}
                  onCheckedChange={(checked) => maintenanceMutation.mutate(checked)}
                  disabled={maintenanceMutation.isPending}
                  className="shrink-0"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Module Controls
            </CardTitle>
            <CardDescription>
              Enable or disable individual modules. Disabled modules are hidden from the sidebar navigation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="w-10 h-6 bg-muted rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {MODULE_LIST.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-3">
                    <Label className="text-sm font-medium cursor-pointer" htmlFor={`module-${key}`}>
                      {label}
                    </Label>
                    <Switch
                      id={`module-${key}`}
                      checked={isModuleEnabled(key)}
                      onCheckedChange={(checked) =>
                        moduleMutation.mutate({ key, value: checked ? '1' : '0' })
                      }
                      disabled={moduleMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
