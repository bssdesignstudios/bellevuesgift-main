import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface QuoteItem {
  description: string;
  qty: number;
  unit_price?: number;
  price?: number;
  line_total?: number;
  total?: number;
  tax_rate?: number;
  discount?: number;
}

interface QuoteRecord {
  id: string;
  quote_number: string;
  status: string;
  customer_id: string | null;
  customer_name?: string | null;
  subtotal: number;
  tax_total?: number;
  tax?: number;
  discount_total?: number;
  total: number;
  issued_date?: string | null;
  valid_until?: string | null;
  notes: string | null;
  items: QuoteItem[];
  customer?: { name?: string | null; email?: string | null; phone?: string | null } | null;
}

export default function AdminQuotePrint({ id, autoPrint = true, documentTitle }: { id: string; autoPrint?: boolean; documentTitle?: string }) {
  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote-print', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/admin/quotes/${id}`);
      return data as QuoteRecord;
    },
  });

  useEffect(() => {
    if (quote) {
      if (documentTitle) {
        document.title = documentTitle + ' ' + quote.quote_number;
      }
      if (autoPrint) {
        setTimeout(() => window.print(), 300);
      }
    }
  }, [quote, autoPrint, documentTitle]);

  if (isLoading || !quote) {
    return <div className="p-6 text-sm">Loading quote...</div>;
  }

  const taxTotal = quote.tax_total ?? quote.tax ?? 0;
  const discountTotal = quote.discount_total ?? 0;
  const customerName = quote.customer?.name ?? quote.customer_name ?? '—';
  const customerEmail = quote.customer?.email ?? '';

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bellevue Gifts & Supplies</h1>
            <p className="text-sm text-gray-500">Freeport, Grand Bahama</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-700">QUOTE</h2>
            <div className="text-sm text-gray-600 mt-1">#{quote.quote_number}</div>
          </div>
        </div>

        {/* Info Row */}
        <div className="grid grid-cols-2 gap-6 border rounded-md p-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bill To</div>
            <div className="text-sm font-medium">{customerName}</div>
            {customerEmail && <div className="text-sm text-gray-600">{customerEmail}</div>}
            {quote.customer?.phone && <div className="text-sm text-gray-600">{quote.customer.phone}</div>}
          </div>
          <div className="text-right">
            <div className="text-sm"><span className="text-gray-500">Status:</span> <span className="font-medium capitalize">{quote.status}</span></div>
            <div className="text-sm"><span className="text-gray-500">Issued:</span> {quote.issued_date ? new Date(quote.issued_date).toLocaleDateString() : '—'}</div>
            <div className="text-sm"><span className="text-gray-500">Valid Until:</span> {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '—'}</div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 font-semibold">Description</th>
              <th className="text-right py-2 font-semibold">Qty</th>
              <th className="text-right py-2 font-semibold">Unit Price</th>
              <th className="text-right py-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => {
              const unitPrice = item.unit_price ?? item.price ?? 0;
              const lineTotal = item.line_total ?? item.total ?? (Number(item.qty) * Number(unitPrice));
              return (
                <tr key={index} className="border-b">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{item.qty}</td>
                  <td className="py-2 text-right">${Number(unitPrice).toFixed(2)}</td>
                  <td className="py-2 text-right">${Number(lineTotal).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>${Number(quote.subtotal).toFixed(2)}</span></div>
            {Number(taxTotal) > 0 && (
              <div className="flex justify-between"><span>Tax</span><span>${Number(taxTotal).toFixed(2)}</span></div>
            )}
            {Number(discountTotal) > 0 && (
              <div className="flex justify-between"><span>Discount</span><span>-${Number(discountTotal).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-1">
              <span>Total</span>
              <span>${Number(quote.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {quote.notes && (
          <div className="border rounded-md p-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</div>
          </div>
        )}

        {/* Print footer */}
        <div className="text-center text-xs text-gray-400 pt-4 print:pt-8">
          Thank you for your business!
        </div>
      </div>
    </div>
  );
}
