import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ClipboardPlus, ArrowLeft, AlertCircle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

const DEVICE_TYPES = [
  'Phone',
  'Laptop',
  'Tablet',
  'Desktop / Computer',
  'TV',
  'Gaming Console',
  'Camera',
  'Smartwatch',
  'Printer',
  'Other',
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Non-urgent, no rush' },
  { value: 'normal', label: 'Normal', description: 'Standard turnaround' },
  { value: 'urgent', label: 'Urgent', description: 'Customer is waiting / same-day' },
];

interface FormState {
  customer_name: string;
  phone: string;
  email: string;
  device_type: string;
  item_make: string;
  model_number: string;
  serial_number: string;
  problem_description: string;
  accessories: string;
  condition_notes: string;
  estimated_cost: string;
  internal_notes: string;
  priority: string;
}

const EMPTY_FORM: FormState = {
  customer_name: '',
  phone: '',
  email: '',
  device_type: '',
  item_make: '',
  model_number: '',
  serial_number: '',
  problem_description: '',
  accessories: '',
  condition_notes: '',
  estimated_cost: '',
  internal_notes: '',
  priority: 'normal',
};

export default function AdminRepairIntake() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const set = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormState> = {};
    if (!form.customer_name.trim()) newErrors.customer_name = 'Customer name is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!form.device_type) newErrors.device_type = 'Device type is required';
    if (!form.problem_description.trim()) newErrors.problem_description = 'Issue description is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<FormState>) => {
      const { data } = await axios.post('/api/admin/repair-tickets', payload);
      return data;
    },
    onSuccess: (ticket) => {
      toast.success(`Ticket ${ticket.ticket_number} created`);
      router.visit('/admin/repairs');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to create ticket';
      const serverErrors = error.response?.data?.errors;
      if (serverErrors) {
        const mapped: Partial<FormState> = {};
        for (const key of Object.keys(serverErrors)) {
          (mapped as any)[key] = serverErrors[key][0];
        }
        setErrors(mapped);
      }
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Record<string, any> = {
      customer_name: form.customer_name.trim(),
      phone: form.phone.trim(),
      device_type: form.device_type,
      problem_description: form.problem_description.trim(),
      priority: form.priority,
    };

    if (form.email.trim()) payload.email = form.email.trim();
    if (form.item_make.trim()) payload.item_make = form.item_make.trim();
    if (form.model_number.trim()) payload.model_number = form.model_number.trim();
    if (form.serial_number.trim()) payload.serial_number = form.serial_number.trim();
    if (form.accessories.trim()) payload.accessories = form.accessories.trim();
    if (form.condition_notes.trim()) payload.condition_notes = form.condition_notes.trim();
    if (form.estimated_cost.trim()) payload.estimated_cost = parseFloat(form.estimated_cost);
    if (form.internal_notes.trim()) payload.internal_notes = form.internal_notes.trim();

    createMutation.mutate(payload);
  };

  const content = (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.visit('/admin/repairs')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardPlus className="h-6 w-6" />
          New Repair Intake
        </h1>
        <p className="text-muted-foreground">Walk-in customer repair. Ticket status will be set to Received.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer_name">
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer_name"
                value={form.customer_name}
                onChange={e => set('customer_name', e.target.value)}
                placeholder="Full name"
                autoFocus
              />
              {errors.customer_name && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.customer_name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(555) 555-5555"
              />
              {errors.phone && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.phone}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Device Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Device Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Device Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.device_type}
                onValueChange={v => set('device_type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map(dt => (
                    <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.device_type && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.device_type}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item_make">Brand / Make</Label>
              <Input
                id="item_make"
                value={form.item_make}
                onChange={e => set('item_make', e.target.value)}
                placeholder="e.g. Apple, Samsung, Dell"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="model_number">Model</Label>
              <Input
                id="model_number"
                value={form.model_number}
                onChange={e => set('model_number', e.target.value)}
                placeholder="e.g. iPhone 14 Pro, Galaxy S23"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={form.serial_number}
                onChange={e => set('serial_number', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </CardContent>
        </Card>

        {/* Issue + Intake Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Issue &amp; Intake Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="problem_description">
                Issue Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="problem_description"
                value={form.problem_description}
                onChange={e => set('problem_description', e.target.value)}
                placeholder="Describe what the customer says is wrong..."
                rows={3}
              />
              {errors.problem_description && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.problem_description}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accessories">Accessories Included</Label>
              <Input
                id="accessories"
                value={form.accessories}
                onChange={e => set('accessories', e.target.value)}
                placeholder="e.g. charger, case, SIM card tray tool"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="condition_notes">Physical Condition Notes</Label>
              <Textarea
                id="condition_notes"
                value={form.condition_notes}
                onChange={e => set('condition_notes', e.target.value)}
                placeholder="e.g. cracked screen corner, scuff on back..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimated_cost}
                  onChange={e => set('estimated_cost', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={v => set('priority', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="font-medium">{p.label}</span>
                        <span className="text-muted-foreground ml-1 text-xs">— {p.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Internal Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="internal_notes">
                Staff Notes{' '}
                <span className="text-muted-foreground font-normal text-xs">(not shown to customer)</span>
              </Label>
              <Textarea
                id="internal_notes"
                value={form.internal_notes}
                onChange={e => set('internal_notes', e.target.value)}
                placeholder="Internal observations, special handling, sourcing notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="min-w-[140px]"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.visit('/admin/repairs')}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );

  return (
    <AdminLayout>
      {content}
    </AdminLayout>
  );
}
