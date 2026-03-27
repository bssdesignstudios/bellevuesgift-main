import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface LedgerEntry {
  id: string;
  customer_id: string;
  customer_name: string | null;
  entry_type: string;
  reference_type: string | null;
  reference_id: string | null;
  invoice_number: string | null;
  amount: number;
  balance_after: number | null;
  running_balance: number | null;
  notes: string | null;
  entry_date: string;
}

export default function AdminStatementPrint({ autoPrint = true, documentTitle }: { autoPrint?: boolean; documentTitle?: string }) {
  const params = new URLSearchParams(window.location.search);
  const customerId = params.get('customer_id') || '';

  const { data: ledgerResponse, isLoading } = useQuery({
    queryKey: ['statement-print', customerId],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/ledger-entries', {
        params: customerId ? { customer_id: customerId } : {},
      });
      return data as { entries: LedgerEntry[] };
    },
  });

  const entries = ledgerResponse?.entries || [];
  const customerName = entries[0]?.customer_name || (customerId ? customerId : 'All Customers');

  useEffect(() => {
    if (!isLoading) {
      if (documentTitle) {
        document.title = documentTitle + (customerName ? ` - ${customerName}` : '');
      }
      if (autoPrint) {
        setTimeout(() => window.print(), 100);
      }
    }
  }, [isLoading, autoPrint, documentTitle, customerName]);

  if (isLoading) {
    return <div className="p-6 text-sm">Loading statement...</div>;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Statement</h1>
            <div className="text-sm text-gray-600">{customerName}</div>
          </div>
          <div className="text-sm text-gray-600 text-right">
            <div>{new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Type</th>
              <th className="text-left py-2">Reference</th>
              <th className="text-right py-2">Amount</th>
              <th className="text-right py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-600">No ledger entries.</td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="py-2">{entry.entry_date ? new Date(entry.entry_date).toLocaleDateString() : '—'}</td>
                  <td className="py-2 capitalize">{entry.entry_type}</td>
                  <td className="py-2">{entry.invoice_number ? `Invoice ${entry.invoice_number}` : entry.reference_type || '—'}</td>
                  <td className="py-2 text-right">{entry.amount < 0 ? '-' : ''}${Math.abs(Number(entry.amount)).toFixed(2)}</td>
                  <td className="py-2 text-right">
                    {entry.balance_after !== null
                      ? `$${Number(entry.balance_after).toFixed(2)}`
                      : entry.running_balance !== null
                        ? `$${Number(entry.running_balance).toFixed(2)}`
                        : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
