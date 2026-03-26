import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface QuotePrintProps {
  id: string;
  autoPrint?: boolean;
  documentTitle?: string;
}

interface QuoteItem {
  description: string;
  qty: number;
  unit_price: number;
  line_total?: number;
  tax_amount?: number;
  discount_amount?: number;
}

interface QuoteRecord {
  id: string;
  quote_number: string;
  status: string;
  customer_id: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  issued_at: string | null;
  valid_until: string | null;
  notes: string | null;
  items: QuoteItem[];
  customer?: { name?: string | null; email?: string | null } | null;
}

export default function AdminQuotePrint({ id, autoPrint = true, documentTitle }: QuotePrintProps) {
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
        setTimeout(() => window.print(), 100);
      }
    }
  }, [quote, autoPrint, documentTitle]);

  if (isLoading || !quote) {
    return <div className="p-6 text-sm">Loading quote...</div>;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quote</h1>
            <div className="text-sm text-gray-600">#{quote.quote_number}</div>
          </div>
          <div className="text-sm text-gray-600 text-right">
            <div>Status: {quote.status}</div>
            <div>Issued: {quote.issued_at ? new Date(quote.issued_at).toLocaleDateString() : '—'}</div>
            <div>Valid Until: {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '—'}</div>
          </div>
        </div>

        <div className="border rounded-md p-4">
          <div className="text-sm font-medium">Customer</div>
          <div className="text-sm text-gray-600">{quote.customer?.name || quote.customer_id || '—'}</div>
          {quote.customer?.email && <div className="text-sm text-gray-600">{quote.customer.email}</div>}
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Description</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Unit</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{item.qty}</td>
                <td className="py-2 text-right">${Number(item.unit_price).toFixed(2)}</td>
                <td className="py-2 text-right">
                  ${Number(item.line_total ?? (Number(item.qty) * Number(item.unit_price) + Number(item.tax_amount || 0) - Number(item.discount_amount || 0))).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>${Number(quote.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>${Number(quote.tax_amount).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-${Number(quote.discount_amount).toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>${Number(quote.total).toFixed(2)}</span></div>
          </div>
        </div>

        {quote.notes && (
          <div className="text-sm text-gray-600">Notes: {quote.notes}</div>
        )}
      </div>
    </div>
  );
}
