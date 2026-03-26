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

interface QuoteItemForm {
  product_id?: string | null;
  sku?: string | null;
  description: string;
  qty: number;
  unit_price: number;
  tax_amount?: number;
  discount_amount?: number;
}

interface QuoteRecord {
  id: string;
  quote_number: string;
  customer_id: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'converted';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  issued_at: string | null;
  valid_until: string | null;
  notes: string | null;
  items: QuoteItemForm[];
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'converted', label: 'Converted' },
];

function emptyItem(): QuoteItemForm {
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

export default function AdminQuotes() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [emailQuote, setEmailQuote] = useState<QuoteRecord | null>(null);
  const [emailForm, setEmailForm] = useState({ email: '', message: '' });
  const [form, setForm] = useState({
    quote_number: '',
    customer_id: '',
    status: 'draft',
    issued_at: '',
    valid_until: '',
    notes: '',
    items: [emptyItem()],
  });

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['admin-quotes'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/quotes');
      return data as QuoteRecord[];
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
        quote_number: form.quote_number,
        customer_id: form.customer_id ? form.customer_id : null,
        status: form.status,
        issued_at: form.issued_at || null,
        valid_until: form.valid_until || null,
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
        return axios.put(`/api/admin/quotes/${editingId}`, payload);
      }

      return axios.post('/api/admin/quotes', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Quote updated' : 'Quote created');
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      setEditingId(null);
      setForm({
        quote_number: '',
        customer_id: '',
        status: 'draft',
        issued_at: '',
        valid_until: '',
        notes: '',
        items: [emptyItem()],
      });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to save quote');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axios.delete(`/api/admin/quotes/${id}`),
    onSuccess: () => {
      toast.success('Quote deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete quote');
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => axios.post(`/api/admin/quotes/${id}/convert`),
    onSuccess: (response: any) => {
      const invoiceNumber = response?.data?.invoice_number;
      toast.success(invoiceNumber ? `Converted to invoice ${invoiceNumber}` : 'Quote converted to invoice');
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to convert quote');
    },
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      if (!emailQuote) return;
      return axios.post(`/api/admin/quotes/${emailQuote.id}/email`, {
        email: emailForm.email,
        message: emailForm.message || null,
      });
    },
    onSuccess: () => {
      toast.success('Quote email sent');
      setEmailQuote(null);
      setEmailForm({ email: '', message: '' });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to send quote email');
    },
  });

  const handleEdit = (quote: QuoteRecord) => {
    setEditingId(quote.id);
    setForm({
      quote_number: quote.quote_number,
      customer_id: quote.customer_id || '',
      status: quote.status,
      issued_at: quote.issued_at ? quote.issued_at.slice(0, 10) : '',
      valid_until: quote.valid_until ? quote.valid_until.slice(0, 10) : '',
      notes: quote.notes || '',
      items: quote.items.length ? quote.items.map((item) => ({
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
    if (!form.quote_number.trim()) {
      toast.error('Quote number is required');
      return;
    }
    if (!form.items.length || form.items.some((item) => !item.description.trim())) {
      toast.error('Each item needs a description');
      return;
    }
    saveMutation.mutate();
  };

  const handleItemChange = (index: number, key: keyof QuoteItemForm, value: string | number) => {
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
    const url = `${window.location.origin}/admin/quotes/${id}/share`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied');
    } catch {
      toast.error('Failed to copy share link');
    }
  };

  return (
    <>
      <AdminLayout>
        <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">Create, update, and manage customer quotes.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Quote' : 'New Quote'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quote Number</Label>
                  <Input
                    value={form.quote_number}
                    onChange={(event) => setForm((prev) => ({ ...prev, quote_number: event.target.value }))}
                    placeholder="Q-1001"
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
                  <Label>Issued Date</Label>
                  <Input
                    type="date"
                    value={form.issued_at}
                    onChange={(event) => setForm((prev) => ({ ...prev, issued_at: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={form.valid_until}
                    onChange={(event) => setForm((prev) => ({ ...prev, valid_until: event.target.value }))}
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
                  <Label className="text-base">Quote Items</Label>
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
                  {saveMutation.isPending ? 'Saving...' : (editingId ? 'Update Quote' : 'Create Quote')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      quote_number: '',
                      customer_id: '',
                      status: 'draft',
                      issued_at: '',
                      valid_until: '',
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
            <CardTitle>Quotes List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Loading quotes...
                      </TableCell>
                    </TableRow>
                  ) : quotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No quotes found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">{quote.quote_number}</TableCell>
                        <TableCell className="capitalize">{quote.status}</TableCell>
                        <TableCell>${Number(quote.total).toFixed(2)}</TableCell>
                        <TableCell>{quote.issued_at ? new Date(quote.issued_at).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(quote)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={quote.status === 'converted'}
                              onClick={() => {
                                if (quote.status === 'converted') {
                                  toast.error('Quote already converted');
                                  return;
                                }
                                if (confirm('Convert this quote to an invoice?')) {
                                  convertMutation.mutate(quote.id);
                                }
                              }}
                            >
                              Convert
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/admin/quotes/${quote.id}/print`, '_blank')}
                            >
                              Print
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/admin/quotes/${quote.id}/download`, '_blank')}
                            >
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/admin/quotes/${quote.id}/share`, '_blank')}
                            >
                              Share
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyShareLink(quote.id)}
                            >
                              Copy Link
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEmailQuote(quote)}
                            >
                              Email
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={quote.status !== 'draft'}
                              onClick={() => {
                                if (quote.status !== 'draft') {
                                  toast.error('Only draft quotes can be deleted');
                                  return;
                                }
                                if (confirm('Delete this draft quote?')) {
                                  deleteMutation.mutate(quote.id);
                                }
                              }}
                            >
                              Delete
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
      </AdminLayout>
      <Dialog open={!!emailQuote} onOpenChange={(open) => !open && setEmailQuote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote</DialogTitle>
          </DialogHeader>
          {emailQuote && (
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
                Quote {emailQuote.quote_number}
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
                <Button type="button" variant="outline" onClick={() => setEmailQuote(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
