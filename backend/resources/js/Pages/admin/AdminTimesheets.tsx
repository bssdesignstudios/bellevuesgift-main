import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
    id: number;
    name: string;
    role: string;
    email: string;
}

interface TimesheetEntry {
    id: string;
    user_id: number;
    date: string;
    clock_in: string;
    clock_out: string | null;
    hours: string | null;
    task: string | null;
    notes: string | null;
    user: StaffMember;
}

interface PaginatedTimesheets {
    data: TimesheetEntry[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

interface TimesheetFormData {
    user_id: string;
    date: string;
    clock_in: string;
    clock_out: string;
    task: string;
    notes: string;
    hours: string;
}

const BLANK_FORM: TimesheetFormData = {
    user_id: '',
    date: '',
    clock_in: '',
    clock_out: '',
    task: '',
    notes: '',
    hours: '',
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchTimesheets(params: Record<string, string>): Promise<PaginatedTimesheets> {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))).toString();
    const res = await fetch(`/api/admin/timesheets?${qs}`);
    if (!res.ok) throw new Error('Failed to load timesheets');
    return res.json();
}

async function fetchStaff(): Promise<StaffMember[]> {
    const res = await fetch('/api/admin/timesheets/staff');
    if (!res.ok) throw new Error('Failed to load staff');
    return res.json();
}

// ─── TimesheetForm ─────────────────────────────────────────────────────────────

function TimesheetForm({
    form,
    staff,
    onChange,
    onSubmit,
    onCancel,
    saving,
    isEdit,
}: {
    form: TimesheetFormData;
    staff: StaffMember[];
    onChange: (f: TimesheetFormData) => void;
    onSubmit: () => void;
    onCancel: () => void;
    saving: boolean;
    isEdit: boolean;
}) {
    const set = (key: keyof TimesheetFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange({ ...form, [key]: e.target.value });

    // Auto-compute hours from clock_in / clock_out for display
    const computedHours = (() => {
        if (form.clock_in && form.clock_out) {
            const [ih, im] = form.clock_in.split(':').map(Number);
            const [oh, om] = form.clock_out.split(':').map(Number);
            const mins = (oh * 60 + om) - (ih * 60 + im);
            if (mins > 0) return (mins / 60).toFixed(2);
        }
        return '';
    })();

    return (
        <div className="space-y-4">
            {/* Staff */}
            <div className="space-y-1">
                <Label>Staff Member <span className="text-red-500">*</span></Label>
                <Select
                    value={form.user_id}
                    onValueChange={(val) => onChange({ ...form, user_id: val })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select staff member…" />
                    </SelectTrigger>
                    <SelectContent>
                        {staff.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                                <span className="ml-2 text-xs text-muted-foreground capitalize">({s.role})</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Date */}
            <div className="space-y-1">
                <Label>Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.date} onChange={set('date')} />
            </div>

            {/* Clock In / Clock Out */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>Clock In <span className="text-red-500">*</span></Label>
                    <Input type="time" value={form.clock_in} onChange={set('clock_in')} />
                </div>
                <div className="space-y-1">
                    <Label>Clock Out</Label>
                    <Input type="time" value={form.clock_out} onChange={set('clock_out')} />
                </div>
            </div>

            {/* Computed hours indicator */}
            {computedHours && (
                <p className="text-sm text-muted-foreground -mt-1">
                    Auto-computed: <strong>{computedHours}h</strong>
                    {form.hours && ' (manual override below)'}
                </p>
            )}

            {/* Manual hours override */}
            <div className="space-y-1">
                <Label>Hours Override <span className="text-xs text-muted-foreground">(leave blank to auto-compute)</span></Label>
                <Input type="number" min="0" step="0.25" placeholder="e.g. 7.5" value={form.hours} onChange={set('hours')} />
            </div>

            {/* Task */}
            <div className="space-y-1">
                <Label>Task / Project</Label>
                <Input placeholder="e.g. Inventory Audit, Customer Support…" value={form.task} onChange={set('task')} />
            </div>

            {/* Notes */}
            <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} placeholder="Optional notes…" value={form.notes} onChange={set('notes')} />
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button onClick={onSubmit} disabled={saving}>
                    {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Entry'}
                </Button>
            </DialogFooter>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTimesheets() {
    const qc = useQueryClient();

    // Filters
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [userId, setUserId] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    // Reset page on filter change
    useEffect(() => { setPage(1); }, [debouncedSearch, userId, dateFrom, dateTo]);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<TimesheetEntry | null>(null);
    const [form, setForm] = useState<TimesheetFormData>(BLANK_FORM);

    // ── Queries ───────────────────────────────────────────────────────────────

    const { data, isLoading } = useQuery({
        queryKey: ['admin-timesheets', debouncedSearch, userId, dateFrom, dateTo, page],
        queryFn: () => fetchTimesheets({
            search: debouncedSearch,
            user_id: userId,
            date_from: dateFrom,
            date_to: dateTo,
            page: String(page),
            per_page: '50',
        }),
    });

    const { data: staffList = [] } = useQuery({
        queryKey: ['admin-timesheet-staff'],
        queryFn: fetchStaff,
        staleTime: 5 * 60 * 1000,
    });

    // ── Mutations ─────────────────────────────────────────────────────────────

    const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-timesheets'] });

    const createMutation = useMutation({
        mutationFn: (payload: object) =>
            fetch('/api/admin/timesheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            }).then(async (r) => {
                if (!r.ok) throw new Error((await r.json()).message ?? 'Create failed');
                return r.json();
            }),
        onSuccess: () => { invalidate(); closeDialog(); },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: object }) =>
            fetch(`/api/admin/timesheets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            }).then(async (r) => {
                if (!r.ok) throw new Error((await r.json()).message ?? 'Update failed');
                return r.json();
            }),
        onSuccess: () => { invalidate(); closeDialog(); },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            fetch(`/api/admin/timesheets/${id}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            }).then((r) => { if (!r.ok && r.status !== 204) throw new Error('Delete failed'); }),
        onSuccess: invalidate,
    });

    // ── Dialog helpers ────────────────────────────────────────────────────────

    function openCreate() {
        setEditing(null);
        setForm(BLANK_FORM);
        setDialogOpen(true);
    }

    function openEdit(entry: TimesheetEntry) {
        setEditing(entry);
        setForm({
            user_id: String(entry.user_id),
            date: entry.date,
            clock_in: entry.clock_in ?? '',
            clock_out: entry.clock_out ?? '',
            task: entry.task ?? '',
            notes: entry.notes ?? '',
            hours: entry.hours ?? '',
        });
        setDialogOpen(true);
    }

    function closeDialog() {
        setDialogOpen(false);
        setEditing(null);
        setForm(BLANK_FORM);
    }

    function handleSubmit() {
        const payload: Record<string, string | number> = {
            user_id: Number(form.user_id),
            date: form.date,
            clock_in: form.clock_in,
        };
        if (form.clock_out) payload.clock_out = form.clock_out;
        if (form.task) payload.task = form.task;
        if (form.notes) payload.notes = form.notes;
        if (form.hours) payload.hours = Number(form.hours);

        if (editing) {
            updateMutation.mutate({ id: editing.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    }

    const saving = createMutation.isPending || updateMutation.isPending;

    // ── Derived ───────────────────────────────────────────────────────────────

    const entries = data?.data ?? [];
    const totalPages = data?.last_page ?? 1;
    const totalEntries = data?.total ?? 0;

    const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.hours ?? '0') || 0), 0);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Clock className="h-8 w-8 text-brand-blue" />
                            Timesheet & Attendance
                        </h1>
                        <p className="text-muted-foreground">Track staff work hours and shifts</p>
                    </div>
                    <Button onClick={openCreate} size="lg" className="gap-2">
                        <Plus className="h-5 w-5" />
                        Add Entry
                    </Button>
                </div>

                {/* Summary cards */}
                <div className="grid sm:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Entries (current view)</div>
                            <div className="text-2xl font-bold">{totalEntries}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Hours (this page)</div>
                            <div className="text-2xl font-bold">{totalHours.toFixed(1)} hrs</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Staff Members</div>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                {staffList.length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-end">
                    {/* Search */}
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search staff, task, notes…"
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Staff filter */}
                    <div className="w-52">
                        <Select value={userId} onValueChange={setUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="All staff" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All staff</SelectItem>
                                {staffList.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date from */}
                    <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Input type="date" className="w-38" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>

                    <span className="text-muted-foreground text-sm">to</span>

                    <Input type="date" className="w-38" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

                    {(search || userId || dateFrom || dateTo) && (
                        <Button variant="ghost" size="sm" onClick={() => {
                            setSearch(''); setDebouncedSearch(''); setUserId('');
                            setDateFrom(''); setDateTo('');
                        }}>
                            Clear filters
                        </Button>
                    )}
                </div>

                {/* Table */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Time Logs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff Member</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Clock In</TableHead>
                                    <TableHead>Clock Out</TableHead>
                                    <TableHead>Hours</TableHead>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                            Loading…
                                        </TableCell>
                                    </TableRow>
                                ) : entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                            No timesheet entries found.
                                        </TableCell>
                                    </TableRow>
                                ) : entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-brand-navy/10 flex items-center justify-center text-xs font-bold text-brand-navy">
                                                    {entry.user?.name?.[0] ?? '?'}
                                                </div>
                                                <span className="font-medium text-sm">{entry.user?.name ?? '—'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">{entry.date}</TableCell>
                                        <TableCell className="text-sm font-mono">{entry.clock_in}</TableCell>
                                        <TableCell className="text-sm font-mono">{entry.clock_out ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                        <TableCell>
                                            {entry.hours
                                                ? <span className="font-semibold">{parseFloat(entry.hours).toFixed(2)}h</span>
                                                : <span className="text-muted-foreground text-sm">—</span>}
                                        </TableCell>
                                        <TableCell className="text-sm max-w-[160px] truncate">{entry.task ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                        <TableCell className="text-sm max-w-[160px] truncate text-muted-foreground">{entry.notes ?? '—'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => {
                                                        if (confirm('Delete this timesheet entry?')) {
                                                            deleteMutation.mutate(entry.id);
                                                        }
                                                    }}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Page {page} of {totalPages} · {totalEntries} entries</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Timesheet Entry' : 'Add Timesheet Entry'}</DialogTitle>
                    </DialogHeader>
                    <TimesheetForm
                        form={form}
                        staff={staffList}
                        onChange={setForm}
                        onSubmit={handleSubmit}
                        onCancel={closeDialog}
                        saving={saving}
                        isEdit={!!editing}
                    />
                    {(createMutation.isError || updateMutation.isError) && (
                        <p className="text-sm text-destructive mt-2">
                            {(createMutation.error ?? updateMutation.error as Error)?.message ?? 'An error occurred.'}
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
