import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface EmailLog {
  id: string;
  document_type: string;
  document_id: string | null;
  recipient_email: string;
  sent_by_user_id: number | null;
  subject: string;
  sent_at: string;
}

export default function AdminEmailLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-email-logs'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/email-logs');
      return data as { logs: EmailLog[] };
    },
  });

  const logs = data?.logs || [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Logs</h1>
          <p className="text-muted-foreground">Read-only history of document emails.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Sends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Document ID</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sent By</TableHead>
                    <TableHead>Subject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Loading email logs...
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No email logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}</TableCell>
                        <TableCell className="capitalize">{log.document_type}</TableCell>
                        <TableCell className="font-mono text-xs">{log.document_id || '—'}</TableCell>
                        <TableCell>{log.recipient_email}</TableCell>
                        <TableCell>{log.sent_by_user_id ?? '—'}</TableCell>
                        <TableCell className="max-w-[320px] truncate">{log.subject}</TableCell>
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
  );
}
