import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface InvoiceItem {
  description: string;
  qty: number;
  unit_price?: number;
  price?: number;
  line_total?: number;
  total?: number;
  tax_rate?: number;
  discount?: number;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  status: string;
  customer_id: string | null;
  customer_name?: string | null;
  subtotal: number;
  tax_total?: number;
  tax?: number;
  discount_total?: number;
  total: number;
  amount_paid?: number;
  balance?: number;
  balance_due?: number;
  issued_date?: string | null;
  due_date?: string | null;
  notes: string | null;
  items: InvoiceItem[];
  customer?: { name?: string | null; email?: string | null; phone?: string | null } | null;
}

export default function AdminInvoicePrint({ id, autoPrint = false, documentTitle }: { id: string; autoPrint?: boolean; documentTitle?: string }) {
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
        setTimeout(() => window.print(), 300);
      }
    }
  }, [invoice, autoPrint, documentTitle]);

  if (isLoading || !invoice) {
    return <div className="p-6 text-sm">Loading invoice...</div>;
  }

  const taxTotal = invoice.tax_total ?? invoice.tax ?? 0;
  const discountTotal = invoice.discount_total ?? 0;
  const amountPaid = invoice.amount_paid ?? 0;
  const balanceDue = invoice.balance ?? invoice.balance_due ?? (Number(invoice.total) - Number(amountPaid));
  const customerName = invoice.customer?.name ?? invoice.customer_name ?? '—';
  const customerEmail = invoice.customer?.email ?? '';

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
            <h2 className="text-xl font-bold text-gray-700">INVOICE</h2>
            <div className="text-sm text-gray-600 mt-1">#{invoice.invoice_number}</div>
          </div>
        </div>

        {/* Info Row */}
        <div className="grid grid-cols-2 gap-6 border rounded-md p-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bill To</div>
            <div className="text-sm font-medium">{customerName}</div>
            {customerEmail && <div className="text-sm text-gray-600">{customerEmail}</div>}
            {invoice.customer?.phone && <div className="text-sm text-gray-600">{invoice.customer.phone}</div>}
          </div>
          <div className="text-right">
            <div className="text-sm"><span className="text-gray-500">Status:</span> <span className="font-medium capitalize">{invoice.status}</span></div>
            <div className="text-sm"><span className="text-gray-500">Issued:</span> {invoice.issued_date ? new Date(invoice.issued_date).toLocaleDateString() : '—'}</div>
            <div className="text-sm"><span className="text-gray-500">Due:</span> {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</div>
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
            {invoice.items.map((item, index) => {
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
            <div className="flex justify-between"><span>Subtotal</span><span>${Number(invoice.subtotal).toFixed(2)}</span></div>
            {Number(taxTotal) > 0 && (
              <div className="flex justify-between"><span>Tax</span><span>${Number(taxTotal).toFixed(2)}</span></div>
            )}
            {Number(discountTotal) > 0 && (
              <div className="flex justify-between"><span>Discount</span><span>-${Number(discountTotal).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>${Number(invoice.total).toFixed(2)}</span></div>
            {Number(amountPaid) > 0 && (
              <div className="flex justify-between text-green-600"><span>Amount Paid</span><span>-${Number(amountPaid).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-1">
              <span>Balance Due</span>
              <span>${Number(balanceDue).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="border rounded-md p-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</div>
          </div>
        )}

        {/* Print footer */}
        <div className="text-center text-xs text-gray-400 pt-4 print:pt-8">
          Thank you for your business!
        </div>

        {/* Print / Back buttons — hidden when printing */}
        <div className="flex justify-center gap-3 pt-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700"
          >
            Print
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
