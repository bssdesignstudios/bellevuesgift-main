import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Square, Calendar, User, Search } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';

export default function AdminTimesheets() {
    const [isClockedIn, setIsClockedIn] = useState(false);

    const logs = [
        { id: 1, staff: 'John Doe', date: '2024-02-04', task: 'Inventory Audit', status: 'In Progress', hours: '4.5' },
        { id: 2, staff: 'Sarah Smith', date: '2024-02-04', task: 'Customer Support', status: 'Completed', hours: '8.0' },
        { id: 3, staff: 'Mike Jones', date: '2024-02-03', task: 'Warehouse Restocking', status: 'Completed', hours: '7.5' },
    ];

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Clock className="h-8 w-8 text-brand-blue" />
                            Timesheet & Attendance
                        </h1>
                        <p className="text-muted-foreground">Track work hours and team productivity</p>
                    </div>
                    <Button
                        size="lg"
                        variant={isClockedIn ? "destructive" : "default"}
                        onClick={() => setIsClockedIn(!isClockedIn)}
                        className="h-14 px-8 text-lg font-bold shadow-lg transition-all hover:scale-105"
                    >
                        {isClockedIn ? (
                            <><Square className="h-6 w-6 mr-3 fill-current" /> Finish Shift</>
                        ) : (
                            <><Play className="h-6 w-6 mr-3 fill-current" /> Start Shift</>
                        )}
                    </Button>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Today's Total Hours</div>
                            <div className="text-2xl font-bold">42.5 hrs</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Active Staff</div>
                            <div className="text-2xl font-bold">8 / 12</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Pending Reviews</div>
                            <div className="text-2xl font-bold text-amber-500">5</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Average Shift</div>
                            <div className="text-2xl font-bold">7.8 hrs</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search staff or tasks..." className="pl-10" />
                    </div>
                    <Button variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Select Date Range
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Time Logs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff Member</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Task / Project</TableHead>
                                    <TableHead>Hours</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center font-bold text-brand-navy">
                                                    {log.staff[0]}
                                                </div>
                                                <span className="font-medium">{log.staff}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{log.date}</TableCell>
                                        <TableCell>{log.task}</TableCell>
                                        <TableCell className="font-bold">{log.hours}h</TableCell>
                                        <TableCell>
                                            <Badge className={log.status === 'Completed' ? 'bg-green-500' : 'bg-blue-500'}>
                                                {log.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm">View Details</Button>
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
