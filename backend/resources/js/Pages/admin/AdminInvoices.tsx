import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Receipt, Plus, Trash2, Eye, Printer } from 'lucide-react';
import { CustomerCombobox } from '@/components/admin/CustomerCombobox';
import { ProductCombobox } from '@/components/admin/ProductCombobox';
import { cn } from '@/lib/utils';
import { SOPHelper } from '@/components/admin/SOPHelper';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  _key: string;
  product_id: string | null;
  product_label: string | null;
  description: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
}

interface InvoiceSummary {
  id: string;
  invoice_number: string;
  status: string;
  customer: { id: string; name: string } | null;
  total: number;
  amount_paid: number;
  balance: number;
  issued_date: string | null;
  due_date: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const lineTotal = (item: LineItem) => {
  const sub = item.qty * item.unit_price;
  return sub + sub * (item.tax_rate / 100) - item.discount;
};

const newItem = (): LineItem => ({
  _key: Math.random().toString(36).slice(2),
  product_id: null, product_label: null,
  description: '', qty: 1, unit_price: 0, tax_rate: 0, discount: 0,
});

const STATUS_COLORS: Record<string, string> = {
  draft:   'bg-gray-100 text-gray-700',
  sent:    'bg-blue-100 text-blue-700',
  paid:    'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void:    'bg-gray-100 text-gray-400',
};

const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminInvoices() {
  const qc = useQueryClient();

  // Form state
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerLabel, setCustomerLabel] = useState<string | null>(null);
  const [status, setStatus] = useState('draft');
  const [issuedDate, setIssuedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // List state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: invoices = [], isLoading } = useQuery<InvoiceSummary[]>({
    queryKey: ['admin-invoices', statusFilter, search],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/invoices', {
        params: { status: statusFilter, search: search || undefined },
      });
      return data;
    },
  });

  // ─── Item helpers ──────────────────────────────────────────────────────────

  const setItem = useCallback((key: string, patch: Partial<LineItem>) => {
    setItems(prev => prev.map(i => i._key === key ? { ...i, ...patch } : i));
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(i => i._key !== key) : prev);
  }, []);

  const totals = items.reduce(
    (acc, item) => {
      const sub = item.qty * item.unit_price;
      acc.subtotal += sub;
      acc.tax += sub * (item.tax_rate / 100);
      acc.discount += item.discount;
      return acc;
    },
    { subtotal: 0, tax: 0, discount: 0 }
  );
  const grandTotal = totals.subtotal + totals.tax - totals.discount;
  const balance = grandTotal - (parseFloat(amountPaid) || 0);

  // ─── Reset ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setCustomerId(null); setCustomerLabel(null);
    setStatus('draft'); setIssuedDate(''); setDueDate('');
    setNotes(''); setAmountPaid('');
    setItems([newItem()]); setEditingId(null);
  };

  // ─── Load invoice for editing ──────────────────────────────────────────────

  const loadInvoice = async (id: string) => {
    const { data } = await axios.get(`/api/admin/invoices/${id}`);
    setEditingId(data.id);
    setCustomerId(data.customer?.id ?? data.customer_id ?? null);
    setCustomerLabel(data.customer?.name ?? data.customer_name ?? null);
    setStatus(data.status);
    setIssuedDate(data.issued_date ?? '');
    setDueDate(data.due_date ?? '');
    setNotes(data.notes ?? '');
    setAmountPaid(data.amount_paid ? String(data.amount_paid) : '');
    setItems(data.items.map((it: any) => ({
      _key: Math.random().toString(36).slice(2),
      product_id: it.product_id,
      product_label: it.product?.name ?? it.description,
      description: it.description,
      qty: Number(it.qty),
      unit_price: Number(it.unit_price),
      tax_rate: Number(it.tax_rate),
      discount: Number(it.discount),
    })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const buildPayload = () => ({
    customer_id: customerId,
    status,
    issued_date: issuedDate || undefined,
    due_date: dueDate || undefined,
    notes: notes || undefined,
    amount_paid: amountPaid ? parseFloat(amountPaid) : undefined,
    items: items.map(i => ({
      product_id: i.product_id,
      description: i.description || i.product_label || 'Item',
      qty: i.qty,
      unit_price: i.unit_price,
      tax_rate: i.tax_rate,
      discount: i.discount,
    })),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (editingId) {
        return axios.put(`/api/admin/invoices/${editingId}`, payload);
      }
      return axios.post('/api/admin/invoices', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Invoice updated' : 'Invoice created');
      qc.invalidateQueries({ queryKey: ['admin-invoices'] });
      resetForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to save invoice'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/admin/invoices/${id}`),
    onSuccess: () => {
      toast.success('Invoice deleted');
      qc.invalidateQueries({ queryKey: ['admin-invoices'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.description && !i.product_label)) {
      toast.error('Each line item needs a description or product');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Invoices
          </h1>
          <p className="text-muted-foreground">Create, update, and track invoices.</p>
        </div>

        {/* ── Form ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editingId ? 'Edit Invoice' : 'New Invoice'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Customer</Label>
                  <CustomerCombobox
                    value={customerId}
                    label={customerLabel}
                    onChange={(id, name) => { setCustomerId(id); setCustomerLabel(name); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['draft','sent','paid','overdue','void'].map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Issued Date</Label>
                  <Input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount Paid ($)</Label>
                  <Input
                    type="number" min="0" step="0.01"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Payment terms, instructions…"
                    rows={2}
                  />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Line Items</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setItems(p => [...p, newItem()])}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-muted text-xs font-medium text-muted-foreground">
                    <span>Product / Description</span>
                    <span>Qty</span>
                    <span>Unit Price</span>
                    <span>Tax %</span>
                    <span>Discount $</span>
                    <span />
                  </div>

                  {items.map(item => (
                    <div key={item._key} className="border-t">
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 items-center">
                        <div className="space-y-1">
                          <ProductCombobox
                            value={item.product_id}
                            label={item.product_label}
                            onChange={p => {
                              if (p) {
                                setItem(item._key, {
                                  product_id: p.id,
                                  product_label: p.name,
                                  description: p.name,
                                  unit_price: p.price,
                                });
                              } else {
                                setItem(item._key, { product_id: null, product_label: null });
                              }
                            }}
                          />
                          <Input
                            className="h-7 text-xs"
                            placeholder="Description (optional override)"
                            value={item.description}
                            onChange={e => setItem(item._key, { description: e.target.value })}
                          />
                        </div>
                        <Input
                          type="number" min="0.01" step="0.01" className="h-8"
                          value={item.qty}
                          onChange={e => setItem(item._key, { qty: parseFloat(e.target.value) || 1 })}
                        />
                        <Input
                          type="number" min="0" step="0.01" className="h-8"
                          value={item.unit_price}
                          onChange={e => setItem(item._key, { unit_price: parseFloat(e.target.value) || 0 })}
                        />
                        <Input
                          type="number" min="0" step="0.01" className="h-8"
                          value={item.tax_rate}
                          onChange={e => setItem(item._key, { tax_rate: parseFloat(e.target.value) || 0 })}
                        />
                        <Input
                          type="number" min="0" step="0.01" className="h-8"
                          value={item.discount}
                          onChange={e => setItem(item._key, { discount: parseFloat(e.target.value) || 0 })}
                        />
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item._key)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="px-3 pb-1.5 text-xs text-muted-foreground">
                        Line Total: {fmt(lineTotal(item))}
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="border-t bg-muted/30 px-3 py-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal: {fmt(totals.subtotal)}</span>
                      <span className="text-muted-foreground">Tax: {fmt(totals.tax)}</span>
                      <span className="text-muted-foreground">Discount: {fmt(totals.discount)}</span>
                      <span className="font-semibold">Total: {fmt(grandTotal)}</span>
                    </div>
                    {(parseFloat(amountPaid) || 0) > 0 && (
                      <div className="flex justify-end text-sm">
                        <span className={cn('font-medium', balance <= 0 ? 'text-green-600' : 'text-amber-600')}>
                          Balance Due: {fmt(Math.max(0, balance))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : editingId ? 'Update Invoice' : 'Create Invoice'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                )}
                <Button type="button" variant="ghost" onClick={resetForm}>Clear</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── List ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">Invoices List</CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 w-48"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {['draft','sent','paid','overdue','void'].map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-muted-foreground text-xs">
                    <th className="px-4 py-2">Invoice #</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Total</th>
                    <th className="px-4 py-2">Balance</th>
                    <th className="px-4 py-2">Issued</th>
                    <th className="px-4 py-2">Due</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Loading…</td></tr>
                  )}
                  {!isLoading && invoices.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted-foreground py-8">No invoices found.</td></tr>
                  )}
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-2">{inv.customer?.name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2">
                        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium capitalize', STATUS_COLORS[inv.status])}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-medium">{fmt(Number(inv.total))}</td>
                      <td className="px-4 py-2">
                        <span className={cn('font-medium', Number(inv.balance) <= 0 ? 'text-green-600' : 'text-amber-600')}>
                          {fmt(Number(inv.balance))}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{inv.issued_date ?? '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{inv.due_date ?? '—'}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={() => window.open(`/admin/invoices/${inv.id}`, '_blank')}
                            title="View / Print"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={() => loadInvoice(inv.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Delete this invoice?')) deleteMutation.mutate(inv.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      <SOPHelper context="invoices" />
    </AdminLayout>
  );
}
