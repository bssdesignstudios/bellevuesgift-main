import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Construction } from 'lucide-react';

export default function AdminEmailLogs() {
  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Email Logs
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
              Email delivery logs and tracking will be available here. This includes order confirmations,
              password resets, and other automated emails sent by the system.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
