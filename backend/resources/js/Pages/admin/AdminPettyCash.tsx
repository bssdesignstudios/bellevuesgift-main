import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Wrench } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminPettyCash() {
    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Wallet className="h-8 w-8 text-brand-blue" />
                        Petty Cash Management
                    </h1>
                    <p className="text-muted-foreground">Monitor and manage small business expenses</p>
                </div>

                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Wrench className="h-12 w-12 text-muted-foreground/40 mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
                        <p className="text-muted-foreground max-w-md">
                            Petty cash tracking with fund management, expense logging, and approval workflows is under development.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
