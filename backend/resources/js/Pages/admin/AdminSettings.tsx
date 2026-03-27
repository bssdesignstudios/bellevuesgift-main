import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Settings,
  ToggleLeft,
  Save,
  Loader2,
  RefreshCw,
  Store,
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderOpen,
  Warehouse,
  Users,
  UserCog,
  Tag,
  BarChart3,
  Wrench,
  Gift,
  Building2,
  Clock,
  Wallet,
  HelpCircle,
  FileText,
  Receipt,
  Mail,
  Monitor,
} from 'lucide-react';
import axios from 'axios';

interface ModuleInfo {
  key: string;
  label: string;
  description: string;
  icon: any;
  category: 'core' | 'finance' | 'operations' | 'advanced';
}

const MODULE_LIST: ModuleInfo[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Admin overview and analytics', icon: LayoutDashboard, category: 'core' },
  { key: 'pos', label: 'Point of Sale', description: 'POS terminal for in-store sales', icon: Store, category: 'core' },
  { key: 'registers', label: 'Registers', description: 'Cash register management', icon: Monitor, category: 'core' },
  { key: 'products', label: 'Products', description: 'Product catalog management', icon: Package, category: 'core' },
  { key: 'categories', label: 'Categories', description: 'Product category organization', icon: FolderOpen, category: 'core' },
  { key: 'inventory', label: 'Inventory', description: 'Stock levels and tracking', icon: Warehouse, category: 'core' },
  { key: 'orders', label: 'Orders', description: 'Order management and fulfillment', icon: ShoppingCart, category: 'core' },
  { key: 'customers', label: 'Customers', description: 'Customer database and profiles', icon: Users, category: 'core' },
  { key: 'repairs', label: 'Repair Tickets', description: 'Device repair tracking', icon: Wrench, category: 'operations' },
  { key: 'gift_cards', label: 'Gift Cards', description: 'Gift card issuance and tracking', icon: Gift, category: 'operations' },
  { key: 'vendors', label: 'Vendors', description: 'Supplier management', icon: Building2, category: 'operations' },
  { key: 'staff', label: 'Staff', description: 'Employee management', icon: UserCog, category: 'operations' },
  { key: 'discounts', label: 'Discounts', description: 'Coupons and promotions', icon: Tag, category: 'operations' },
  { key: 'reports', label: 'Reports', description: 'Sales and business analytics', icon: BarChart3, category: 'finance' },
  { key: 'expenses', label: 'Expenses', description: 'Expense tracking', icon: Wallet, category: 'finance' },
  { key: 'timesheets', label: 'Timesheets', description: 'Staff time tracking', icon: Clock, category: 'finance' },
  { key: 'payroll', label: 'Payroll', description: 'Payroll management', icon: Wallet, category: 'finance' },
  { key: 'quotes', label: 'Quotes', description: 'Customer quotations', icon: FileText, category: 'advanced' },
  { key: 'invoices', label: 'Invoices', description: 'Invoice generation', icon: Receipt, category: 'advanced' },
  { key: 'statements', label: 'Statements', description: 'Customer statements', icon: FileText, category: 'advanced' },
  { key: 'help', label: 'Help / SOP', description: 'Standard operating procedures', icon: HelpCircle, category: 'core' },
  { key: 'settings', label: 'Settings', description: 'System configuration', icon: Settings, category: 'core' },
  { key: 'advanced_platform', label: 'Advanced Platform', description: 'Advanced features and integrations', icon: Settings, category: 'advanced' },
];

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core Modules',
  operations: 'Operations',
  finance: 'Finance & Reporting',
  advanced: 'Advanced (Coming Soon)',
};

export default function AdminSettings() {
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [allSettings, setAllSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [taxRate, setTaxRate] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, modulesRes] = await Promise.all([
        axios.get('/api/admin/settings'),
        axios.get('/api/admin/settings/modules'),
      ]);
      setAllSettings(settingsRes.data);
      setModules(modulesRes.data);

      // Populate general settings fields
      const s = settingsRes.data;
      setStoreName(s['store.name'] || '');
      setStorePhone(s['store.phone'] || '');
      setStoreEmail(s['store.email'] || '');
      setStoreAddress(s['store.address'] || '');
      setTaxRate(s['store.tax_rate'] || '');
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggleModule = async (moduleKey: string) => {
    try {
      const { data } = await axios.patch(`/api/admin/settings/modules/${moduleKey}`);
      setModules(prev => ({ ...prev, [moduleKey]: data.enabled }));
      toast.success(`${moduleKey} ${data.enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to toggle module');
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      await axios.put('/api/admin/settings', {
        settings: {
          'store.name': storeName,
          'store.phone': storePhone,
          'store.email': storeEmail,
          'store.address': storeAddress,
          'store.tax_rate': taxRate,
        },
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const grouped = MODULE_LIST.reduce((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, ModuleInfo[]>);

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure your store and manage feature modules
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* General Store Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Store Information
                </CardTitle>
                <CardDescription>Basic store details used across the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input
                      id="storeName"
                      value={storeName}
                      onChange={e => setStoreName(e.target.value)}
                      placeholder="Bellevue Gifts"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storePhone">Phone</Label>
                    <Input
                      id="storePhone"
                      value={storePhone}
                      onChange={e => setStorePhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeEmail">Email</Label>
                    <Input
                      id="storeEmail"
                      type="email"
                      value={storeEmail}
                      onChange={e => setStoreEmail(e.target.value)}
                      placeholder="info@bellevuegifts.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      value={taxRate}
                      onChange={e => setTaxRate(e.target.value)}
                      placeholder="10.25"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Address</Label>
                  <Input
                    id="storeAddress"
                    value={storeAddress}
                    onChange={e => setStoreAddress(e.target.value)}
                    placeholder="123 Main St, City, State ZIP"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveGeneral} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Store Info
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Module Toggles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ToggleLeft className="h-5 w-5" />
                  Feature Modules
                </CardTitle>
                <CardDescription>
                  Enable or disable features. Disabled modules are hidden from the sidebar and navigation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(['core', 'operations', 'finance', 'advanced'] as const).map(category => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <div className="space-y-3">
                      {grouped[category]?.map(mod => {
                        const Icon = mod.icon;
                        const enabled = modules[mod.key] ?? false;
                        const isAdvanced = mod.category === 'advanced';
                        return (
                          <div
                            key={mod.key}
                            className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {mod.label}
                                  {isAdvanced && (
                                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{mod.description}</p>
                              </div>
                            </div>
                            <Switch
                              checked={enabled}
                              onCheckedChange={() => handleToggleModule(mod.key)}
                              disabled={isAdvanced}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
