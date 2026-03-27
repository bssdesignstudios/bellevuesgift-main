import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Construction } from 'lucide-react';

export default function AdminStatements() {
  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Statements
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
              Generate customer account statements showing transaction history, balances,
              and payment summaries over a selected period.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
