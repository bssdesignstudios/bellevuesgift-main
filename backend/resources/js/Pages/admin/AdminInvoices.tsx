import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, Construction } from 'lucide-react';

export default function AdminInvoices() {
  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Invoices
        </h1>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Construction className="h-5 w-5" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Generate and manage invoices for customers and business accounts. Track payment
              status, send reminders, and maintain invoice history.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
