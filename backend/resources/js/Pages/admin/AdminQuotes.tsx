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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Plus, Trash2, RefreshCw, ChevronRight, Eye } from 'lucide-react';
import { CustomerCombobox } from '@/components/admin/CustomerCombobox';
import { ProductCombobox } from '@/components/admin/ProductCombobox';
import { cn } from '@/lib/utils';
import { SOPHelper } from '@/components/admin/SOPHelper';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface QuoteSummary {
  id: string;
  quote_number: string;
  status: string;
  customer: { id: string; name: string } | null;
  total: number;
  issued_date: string | null;
  valid_until: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-amber-100 text-amber-700',
};

const fmt = (n: number) => `$${n.toFixed(2)}`;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminQuotes() {
  const qc = useQueryClient();

  // Form state
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerLabel, setCustomerLabel] = useState<string | null>(null);
  const [status, setStatus] = useState('draft');
  const [issuedDate, setIssuedDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // List state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: quotes = [], isLoading } = useQuery<QuoteSummary[]>({
    queryKey: ['admin-quotes', statusFilter, search],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/quotes', {
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

  // ─── Reset ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setCustomerId(null); setCustomerLabel(null);
    setStatus('draft'); setIssuedDate(''); setValidUntil(''); setNotes('');
    setItems([newItem()]); setEditingId(null);
  };

  // ─── Load quote for editing ────────────────────────────────────────────────

  const loadQuote = async (id: string) => {
    const { data } = await axios.get(`/api/admin/quotes/${id}`);
    setEditingId(data.id);
    setCustomerId(data.customer?.id ?? data.customer_id ?? null);
    setCustomerLabel(data.customer?.name ?? data.customer_name ?? null);
    setStatus(data.status);
    setIssuedDate(data.issued_date ?? '');
    setValidUntil(data.valid_until ?? '');
    setNotes(data.notes ?? '');
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
    valid_until: validUntil || undefined,
    notes: notes || undefined,
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
        return axios.put(`/api/admin/quotes/${editingId}`, payload);
      }
      return axios.post('/api/admin/quotes', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Quote updated' : 'Quote created');
      qc.invalidateQueries({ queryKey: ['admin-quotes'] });
      resetForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to save quote'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/admin/quotes/${id}`),
    onSuccess: () => {
      toast.success('Quote deleted');
      qc.invalidateQueries({ queryKey: ['admin-quotes'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => axios.post(`/api/admin/quotes/${id}/convert-to-invoice`),
    onSuccess: (res) => {
      toast.success(`Invoice ${res.data.invoice_number} created`);
      qc.invalidateQueries({ queryKey: ['admin-quotes'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to convert'),
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
            <FileText className="h-6 w-6" />
            Quotes
          </h1>
          <p className="text-muted-foreground">Create and manage customer quotations.</p>
        </div>

        {/* ── Form ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editingId ? 'Edit Quote' : 'New Quote'}
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
                      {['draft','sent','accepted','rejected','expired'].map(s => (
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
                  <Label>Valid Until</Label>
                  <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Terms, conditions, or customer notes…"
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
                        {/* Product picker */}
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
                  <div className="border-t bg-muted/30 px-3 py-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal: {fmt(totals.subtotal)}</span>
                    <span className="text-muted-foreground">Tax: {fmt(totals.tax)}</span>
                    <span className="text-muted-foreground">Discount: {fmt(totals.discount)}</span>
                    <span className="font-semibold">Total: {fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : editingId ? 'Update Quote' : 'Create Quote'}
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
              <CardTitle className="text-base">Quotes List</CardTitle>
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
                    {['draft','sent','accepted','rejected','expired'].map(s => (
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
                    <th className="px-4 py-2">Quote #</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Total</th>
                    <th className="px-4 py-2">Issued</th>
                    <th className="px-4 py-2">Valid Until</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Loading…</td></tr>
                  )}
                  {!isLoading && quotes.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted-foreground py-8">No quotes found.</td></tr>
                  )}
                  {quotes.map(q => (
                    <tr key={q.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{q.quote_number}</td>
                      <td className="px-4 py-2">{q.customer?.name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2">
                        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium capitalize', STATUS_COLORS[q.status])}>
                          {q.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-medium">{fmt(Number(q.total))}</td>
                      <td className="px-4 py-2 text-muted-foreground">{q.issued_date ?? '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{q.valid_until ?? '—'}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={() => window.open(`/admin/quotes/${q.id}`, '_blank')}
                            title="View / Print"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                          {q.customer?.id && (
                            <Button
                              size="sm" variant="ghost" className="h-7 px-2 text-xs"
                              onClick={() => window.open(`/admin/statements?customer_id=${q.customer!.id}`, '_blank')}
                              title="View customer statement"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              Statement
                            </Button>
                          )}
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={() => loadQuote(q.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            disabled={convertMutation.isPending}
                            onClick={() => convertMutation.mutate(q.id)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            → Invoice
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Delete this quote?')) deleteMutation.mutate(q.id);
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
      <SOPHelper context="quotes" />
    </AdminLayout>
  );
}
