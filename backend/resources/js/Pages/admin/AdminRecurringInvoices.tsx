import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Calendar, CreditCard, ChevronRight } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminRecurringInvoices() {
    const recurringBills = [
        { id: 1, customer: 'Island Resort & Spa', service: 'Monthly Gift Shop Restock', frequency: 'Monthly', amount: 2450.00, nextDate: '2024-03-01', status: 'Active' },
        { id: 2, customer: 'Beach Club Bahamas', service: 'Quarterly Maintenance', frequency: 'Quarterly', amount: 850.00, nextDate: '2024-04-15', status: 'Paused' },
        { id: 3, customer: 'Ocean View Rentals', service: 'Weekly Cleaning Supplies', frequency: 'Weekly', amount: 125.50, nextDate: '2024-02-11', status: 'Active' },
    ];

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <RefreshCw className="h-8 w-8 text-brand-blue" />
                            Recurring Invoices & Bills
                        </h1>
                        <p className="text-muted-foreground">Automated billing and subscription management</p>
                    </div>
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Recurring Bill
                    </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total MRR</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">$4,850.00</div>
                            <p className="text-xs text-green-600 mt-1">+5.2% from last month</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">142</div>
                            <p className="text-xs text-muted-foreground mt-1">Churn rate: 1.2%</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Renewals</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">12</div>
                            <p className="text-xs text-muted-foreground mt-1 text-nowrap">In the last 24 hours</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Subscription Plans</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Service / Plan</TableHead>
                                    <TableHead>Frequency</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Next Billing</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recurringBills.map((bill) => (
                                    <TableRow key={bill.id}>
                                        <TableCell className="font-medium text-nowrap">{bill.customer}</TableCell>
                                        <TableCell className="text-nowrap">{bill.service}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{bill.frequency}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">${bill.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                                {bill.nextDate}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={bill.status === 'Active' ? 'bg-green-500' : 'bg-zinc-500'}>
                                                {bill.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
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
