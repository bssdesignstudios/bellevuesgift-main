import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { StoreSettings } from '@/types';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/settings');
      return data as StoreSettings[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      return axios.post('/api/admin/settings', {
        key: keyInput.trim(),
        value: valueInput ?? '',
      });
    },
    onSuccess: () => {
      toast.success('Setting saved');
      setKeyInput('');
      setValueInput('');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to save setting');
    },
  });

  const moduleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return axios.post('/api/admin/settings', { key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update module');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      toast.error('Key is required');
      return;
    }
    upsertMutation.mutate();
  };

  const handleSelect = (setting: StoreSettings) => {
    setKeyInput(setting.key);
    setValueInput(setting.value ?? '');
  };

  const moduleList = [
    { key: 'dashboard', label: 'Dashboard', defaultEnabled: true },
    { key: 'pos', label: 'POS', defaultEnabled: true },
    { key: 'registers', label: 'Registers', defaultEnabled: true },
    { key: 'inventory', label: 'Inventory', defaultEnabled: true },
    { key: 'products', label: 'Products', defaultEnabled: true },
    { key: 'categories', label: 'Categories', defaultEnabled: true },
    { key: 'orders', label: 'Orders', defaultEnabled: true },
    { key: 'repairs', label: 'Repairs', defaultEnabled: true },
    { key: 'customers', label: 'Customers', defaultEnabled: true },
    { key: 'vendors', label: 'Vendors', defaultEnabled: true },
    { key: 'staff', label: 'Staff', defaultEnabled: true },
    { key: 'discounts', label: 'Discounts', defaultEnabled: true },
    { key: 'reports', label: 'Reports', defaultEnabled: true },
    { key: 'expenses', label: 'Expenses', defaultEnabled: true },
    { key: 'settings', label: 'Settings', defaultEnabled: true },
    { key: 'help', label: 'Help / SOP', defaultEnabled: true },
    { key: 'gift_cards', label: 'Gift Cards', defaultEnabled: false },
    { key: 'timesheets', label: 'Timesheets', defaultEnabled: false },
    { key: 'payroll', label: 'Payroll', defaultEnabled: false },
    { key: 'quotes', label: 'Quotes', defaultEnabled: false },
    { key: 'invoices', label: 'Invoices', defaultEnabled: false },
    { key: 'statements', label: 'Statements', defaultEnabled: false },
    { key: 'advanced_platform', label: 'Advanced Platform', defaultEnabled: false },
  ];

  const getModuleValue = (moduleKey: string, defaultEnabled: boolean) => {
    const match = settings?.find((s) => s.key === `module.${moduleKey}`);
    if (!match) return defaultEnabled;
    const normalized = String(match.value ?? '').trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Store-level configuration values for admin use.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Module Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {moduleList.map((module) => {
                const isEnabled = getModuleValue(module.key, module.defaultEnabled);
                return (
                  <div key={module.key} className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-medium">{module.label}</div>
                      <div className="text-xs text-muted-foreground">module.{module.key}</div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        moduleMutation.mutate({
                          key: `module.${module.key}`,
                          value: checked ? '1' : '0',
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Setting</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Key</label>
                <Input
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="e.g. coming_soon_enabled"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Value</label>
                <Textarea
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  placeholder="String value"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setKeyInput('');
                    setValueInput('');
                  }}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Loading settings...
                      </TableCell>
                    </TableRow>
                  ) : settings && settings.length > 0 ? (
                    settings.map((setting) => (
                      <TableRow key={setting.id}>
                        <TableCell className="font-mono text-sm">{setting.key}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[420px] truncate">
                          {setting.value}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {setting.updated_at ? new Date(setting.updated_at).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleSelect(setting)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No settings found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
