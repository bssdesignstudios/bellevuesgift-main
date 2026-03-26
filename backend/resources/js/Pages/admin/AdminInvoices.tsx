import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface InvoiceItemForm {
  product_id?: string | null;
  sku?: string | null;
  description: string;
  qty: number;
  unit_price: number;
  line_total?: number;
  tax_amount?: number;
  discount_amount?: number;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  quote_id: string | null;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'void';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  balance_due: number;
  issued_at: string | null;
  due_date: string | null;
  notes: string | null;
  items: InvoiceItemForm[];
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

function emptyItem(): InvoiceItemForm {
  return {
    product_id: '',
    sku: '',
    description: '',
    qty: 1,
    unit_price: 0,
    tax_amount: 0,
    discount_amount: 0,
  };
}

export default function AdminInvoices() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRecord | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', entry_date: '', notes: '' });
  const [emailInvoice, setEmailInvoice] = useState<InvoiceRecord | null>(null);
  const [emailForm, setEmailForm] = useState({ email: '', message: '' });
  const [form, setForm] = useState({
    invoice_number: '',
    customer_id: '',
    quote_id: '',
    status: 'draft',
    issued_at: '',
    due_date: '',
    notes: '',
    items: [emptyItem()],
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/invoices');
      return data as InvoiceRecord[];
    },
  });

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unit_price)), 0);
    const tax = form.items.reduce((sum, item) => sum + Number(item.tax_amount || 0), 0);
    const discount = form.items.reduce((sum, item) => sum + Number(item.discount_amount || 0), 0);
    return {
      subtotal,
      tax,
      discount,
      total: subtotal + tax - discount,
    };
  }, [form.items]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        invoice_number: form.invoice_number,
        customer_id: form.customer_id ? form.customer_id : null,
        quote_id: form.quote_id ? form.quote_id : null,
        status: form.status,
        issued_at: form.issued_at || null,
        due_date: form.due_date || null,
        notes: form.notes || null,
        items: form.items.map((item) => ({
          product_id: item.product_id || null,
          sku: item.sku || null,
          description: item.description,
          qty: Number(item.qty),
          unit_price: Number(item.unit_price),
          tax_amount: Number(item.tax_amount || 0),
          discount_amount: Number(item.discount_amount || 0),
        })),
      };

      if (editingId) {
        return axios.put(`/api/admin/invoices/${editingId}`, payload);
      }

      return axios.post('/api/admin/invoices', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Invoice updated' : 'Invoice created');
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      setEditingId(null);
      setForm({
        invoice_number: '',
        customer_id: '',
        quote_id: '',
        status: 'draft',
        issued_at: '',
        due_date: '',
        notes: '',
        items: [emptyItem()],
      });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to save invoice');
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentInvoice) return;
      return axios.post(`/api/admin/invoices/${paymentInvoice.id}/payments`, {
        amount: Number(paymentForm.amount),
        entry_date: paymentForm.entry_date || null,
        notes: paymentForm.notes || null,
      });
    },
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      setPaymentInvoice(null);
      setPaymentForm({ amount: '', entry_date: '', notes: '' });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to record payment');
    },
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      if (!emailInvoice) return;
      return axios.post(`/api/admin/invoices/${emailInvoice.id}/email`, {
        email: emailForm.email,
        message: emailForm.message || null,
      });
    },
    onSuccess: () => {
      toast.success('Invoice email sent');
      setEmailInvoice(null);
      setEmailForm({ email: '', message: '' });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to send invoice email');
    },
  });

  const handleEdit = (invoice: InvoiceRecord) => {
    setEditingId(invoice.id);
    setForm({
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id || '',
      quote_id: invoice.quote_id || '',
      status: invoice.status,
      issued_at: invoice.issued_at ? invoice.issued_at.slice(0, 10) : '',
      due_date: invoice.due_date ? invoice.due_date.slice(0, 10) : '',
      notes: invoice.notes || '',
      items: invoice.items.length ? invoice.items.map((item) => ({
        product_id: item.product_id || '',
        sku: item.sku || '',
        description: item.description,
        qty: Number(item.qty),
        unit_price: Number(item.unit_price),
        tax_amount: Number(item.tax_amount || 0),
        discount_amount: Number(item.discount_amount || 0),
      })) : [emptyItem()],
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.invoice_number.trim()) {
      toast.error('Invoice number is required');
      return;
    }
    if (!form.items.length || form.items.some((item) => !item.description.trim())) {
      toast.error('Each item needs a description');
      return;
    }
    saveMutation.mutate();
  };

  const handleItemChange = (index: number, key: keyof InvoiceItemForm, value: string | number) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, items };
    });
  };

  const handleRemoveItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const copyShareLink = async (id: string) => {
    const url = `${window.location.origin}/admin/invoices/${id}/share`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied');
    } catch {
      toast.error('Failed to copy share link');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Create, update, and track invoices.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Invoice' : 'New Invoice'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input
                    value={form.invoice_number}
                    onChange={(event) => setForm((prev) => ({ ...prev, invoice_number: event.target.value }))}
                    placeholder="INV-1001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Customer ID (optional)</Label>
                  <Input
                    value={form.customer_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, customer_id: event.target.value }))}
                    placeholder="customer UUID"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quote ID (optional)</Label>
                  <Input
                    value={form.quote_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, quote_id: event.target.value }))}
                    placeholder="quote UUID"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Issued Date</Label>
                  <Input
                    type="date"
                    value={form.issued_at}
                    onChange={(event) => setForm((prev) => ({ ...prev, issued_at: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Invoice Items</Label>
                  <Button type="button" variant="outline" onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))}>
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, index) => (
                    <div key={index} className="grid md:grid-cols-6 gap-3 border rounded-lg p-3">
                      <div className="md:col-span-2 space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(event) => handleItemChange(index, 'description', event.target.value)}
                          placeholder="Item description"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(event) => handleItemChange(index, 'qty', Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(event) => handleItemChange(index, 'unit_price', Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tax</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.tax_amount || 0}
                          onChange={(event) => handleItemChange(index, 'tax_amount', Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Discount</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount_amount || 0}
                          onChange={(event) => handleItemChange(index, 'discount_amount', Number(event.target.value))}
                        />
                      </div>
                      <div className="md:col-span-6 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Line Total: ${(Number(item.qty) * Number(item.unit_price) + Number(item.tax_amount || 0) - Number(item.discount_amount || 0)).toFixed(2)}
                        </div>
                        {form.items.length > 1 && (
                          <Button type="button" variant="ghost" onClick={() => handleRemoveItem(index)}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>Subtotal: ${totals.subtotal.toFixed(2)}</div>
                <div>Tax: ${totals.tax.toFixed(2)}</div>
                <div>Discount: ${totals.discount.toFixed(2)}</div>
                <div className="font-semibold text-foreground">Total: ${totals.total.toFixed(2)}</div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : (editingId ? 'Update Invoice' : 'Create Invoice')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      invoice_number: '',
                      customer_id: '',
                      quote_id: '',
                      status: 'draft',
                      issued_at: '',
                      due_date: '',
                      notes: '',
                      items: [emptyItem()],
                    });
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
            <CardTitle>Invoices List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Loading invoices...
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No invoices found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell className="capitalize">{invoice.status}</TableCell>
                        <TableCell>${Number(invoice.total).toFixed(2)}</TableCell>
                        <TableCell>${Number(invoice.balance_due).toFixed(2)}</TableCell>
                        <TableCell>{invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setViewingInvoice(invoice)}>
                              View
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(invoice)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/admin/invoices/${invoice.id}/print`, '_blank')}
                            >
                              Print
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/admin/invoices/${invoice.id}/download`, '_blank')}
                            >
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/admin/invoices/${invoice.id}/share`, '_blank')}
                            >
                              Share
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyShareLink(invoice.id)}
                            >
                              Copy Link
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEmailInvoice(invoice)}
                            >
                              Email
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPaymentInvoice(invoice)}
                              disabled={invoice.status === 'void'}
                            >
                              Record Payment
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/admin/invoices/${viewingInvoice.id}/print`, '_blank')}
                >
                  Print
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Invoice #:</span> {viewingInvoice.invoice_number}</div>
                <div><span className="text-muted-foreground">Status:</span> {viewingInvoice.status}</div>
                <div><span className="text-muted-foreground">Total:</span> ${Number(viewingInvoice.total).toFixed(2)}</div>
                <div><span className="text-muted-foreground">Balance:</span> ${Number(viewingInvoice.balance_due).toFixed(2)}</div>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingInvoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>${Number(item.unit_price).toFixed(2)}</TableCell>
                        <TableCell>${Number(item.line_total ?? (Number(item.qty) * Number(item.unit_price))).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {viewingInvoice.notes && (
                <div className="text-sm text-muted-foreground">Notes: {viewingInvoice.notes}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentInvoice} onOpenChange={(open) => !open && setPaymentInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {paymentInvoice && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!paymentForm.amount) {
                  toast.error('Payment amount required');
                  return;
                }
                paymentMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="text-sm text-muted-foreground">
                Invoice {paymentInvoice.invoice_number} — Balance ${Number(paymentInvoice.balance_due).toFixed(2)}
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Entry Date</Label>
                <Input
                  type="date"
                  value={paymentForm.entry_date}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, entry_date: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending ? 'Saving...' : 'Record Payment'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setPaymentInvoice(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!emailInvoice} onOpenChange={(open) => !open && setEmailInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
          </DialogHeader>
          {emailInvoice && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!emailForm.email.trim()) {
                  toast.error('Recipient email required');
                  return;
                }
                emailMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="text-sm text-muted-foreground">
                Invoice {emailInvoice.invoice_number}
              </div>
              <div className="space-y-2">
                <Label>Recipient Email</Label>
                <Input
                  type="email"
                  value={emailForm.email}
                  onChange={(event) => setEmailForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  value={emailForm.message}
                  onChange={(event) => setEmailForm((prev) => ({ ...prev, message: event.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={emailMutation.isPending}>
                  {emailMutation.isPending ? 'Sending...' : 'Send'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEmailInvoice(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
