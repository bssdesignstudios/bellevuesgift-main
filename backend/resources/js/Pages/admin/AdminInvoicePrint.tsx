import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface InvoicePrintProps {
  id: string;
  autoPrint?: boolean;
  documentTitle?: string;
}

interface InvoiceItem {
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
  status: string;
  customer_id: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  balance_due: number;
  issued_at: string | null;
  due_date: string | null;
  notes: string | null;
  items: InvoiceItem[];
  customer?: { name?: string | null; email?: string | null } | null;
}

export default function AdminInvoicePrint({ id, autoPrint = true, documentTitle }: InvoicePrintProps) {
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice-print', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/admin/invoices/${id}`);
      return data as InvoiceRecord;
    },
  });

  useEffect(() => {
    if (invoice) {
      if (documentTitle) {
        document.title = documentTitle + ' ' + invoice.invoice_number;
      }
      if (autoPrint) {
        setTimeout(() => window.print(), 100);
      }
    }
  }, [invoice, autoPrint, documentTitle]);

  if (isLoading || !invoice) {
    return <div className="p-6 text-sm">Loading invoice...</div>;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invoice</h1>
            <div className="text-sm text-gray-600">#{invoice.invoice_number}</div>
          </div>
          <div className="text-sm text-gray-600 text-right">
            <div>Status: {invoice.status}</div>
            <div>Issued: {invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : '—'}</div>
            <div>Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</div>
          </div>
        </div>

        <div className="border rounded-md p-4">
          <div className="text-sm font-medium">Customer</div>
          <div className="text-sm text-gray-600">{invoice.customer?.name || invoice.customer_id || '—'}</div>
          {invoice.customer?.email && <div className="text-sm text-gray-600">{invoice.customer.email}</div>}
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
            {invoice.items.map((item, index) => (
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
            <div className="flex justify-between"><span>Subtotal</span><span>${Number(invoice.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>${Number(invoice.tax_amount).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-${Number(invoice.discount_amount).toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>${Number(invoice.total).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Balance Due</span><span>${Number(invoice.balance_due).toFixed(2)}</span></div>
          </div>
        </div>

        {invoice.notes && (
          <div className="text-sm text-gray-600">Notes: {invoice.notes}</div>
        )}
      </div>
    </div>
  );
}
