import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Wallet, ArrowUpRight, ArrowDownLeft, History } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminPettyCash() {
    const [balance] = useState(1250.75);

    const transactions = [
        { id: 1, date: '2024-02-04', description: 'Office Supplies', category: 'Expense', amount: -45.20, status: 'Approved' },
        { id: 2, date: '2024-02-03', description: 'Weekly Top-up', category: 'Fund Addition', amount: 500.00, status: 'Completed' },
        { id: 3, date: '2024-02-02', description: 'Taxi Fare - Client Meeting', category: 'Expense', amount: -15.00, status: 'Approved' },
    ];

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Wallet className="h-8 w-8 text-brand-blue" />
                            Petty Cash Management
                        </h1>
                        <p className="text-muted-foreground">Monitor and manage small business expenses</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <ArrowDownLeft className="h-4 w-4 mr-2" />
                            Add Funds
                        </Button>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Expense
                        </Button>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="bg-brand-navy text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-white/70 text-nowrap">Current Balance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">${balance.toLocaleString()}</div>
                            <p className="text-xs text-white/50 mt-1">Available for immediate use</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-destructive">$482.15</div>
                            <p className="text-xs text-muted-foreground mt-1 text-nowrap">12% lower than last month</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-amber-500">3</div>
                            <p className="text-xs text-muted-foreground mt-1">Totaling $124.50</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Recent Transactions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.date}</TableCell>
                                        <TableCell className="font-medium">{t.description}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{t.category}</Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${t.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                            {t.amount < 0 ? '-' : '+'}${Math.abs(t.amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={t.status === 'Approved' ? 'bg-green-500' : 'bg-blue-500'}>
                                                {t.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
