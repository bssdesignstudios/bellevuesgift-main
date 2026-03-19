import { useState } from 'react';
import axios from 'axios';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Wrench, Clock, CheckCircle, XCircle, Package } from 'lucide-react';

interface RepairTicket {
    ticket_number: string;
    customer_name: string;
    status: string;
    service_type: string;
    item_make: string | null;
    model_number: string | null;
    problem_description: string | null;
    eta_date: string | null;
    created_at: string;
    notes: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-800' },
    in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-800' },
    waiting_parts: { label: 'Waiting for Parts', className: 'bg-orange-100 text-orange-800' },
    ready_for_pickup: { label: 'Ready for Pickup', className: 'bg-green-100 text-green-800' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
    picked_up: { label: 'Picked Up', className: 'bg-gray-100 text-gray-800' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
};

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case 'submitted':
            return <Clock className="h-5 w-5 text-blue-600" />;
        case 'in_progress':
            return <Wrench className="h-5 w-5 text-amber-600" />;
        case 'waiting_parts':
            return <Package className="h-5 w-5 text-orange-600" />;
        case 'ready_for_pickup':
        case 'completed':
            return <CheckCircle className="h-5 w-5 text-green-600" />;
        case 'picked_up':
            return <CheckCircle className="h-5 w-5 text-gray-500" />;
        case 'cancelled':
            return <XCircle className="h-5 w-5 text-red-600" />;
        default:
            return <Clock className="h-5 w-5 text-gray-400" />;
    }
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function RepairStatusPage() {
    const [ticketNumber, setTicketNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [ticket, setTicket] = useState<RepairTicket | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = ticketNumber.trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);
        setTicket(null);

        try {
            const response = await axios.post('/api/repair/status', { ticket_number: trimmed });
            setTicket(response.data);
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError('No repair ticket found with that number. Please double-check and try again.');
            } else {
                setError('Something went wrong. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    const statusConfig = ticket ? (STATUS_CONFIG[ticket.status] ?? { label: ticket.status, className: 'bg-gray-100 text-gray-800' }) : null;

    return (
        <StorefrontLayout>
            <div className="min-h-screen bg-slate-50 py-12 px-4">
                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="bg-brand-blue/10 p-3 rounded-full">
                                <Wrench className="h-7 w-7 text-brand-blue" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Check Repair Status</h1>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto">
                            Enter your repair ticket number (e.g. RPR-2026-XXXXXX) to check your repair status.
                        </p>
                    </div>

                    {/* Search Card */}
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-slate-700">Enter Ticket Number</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex gap-3">
                                <Input
                                    value={ticketNumber}
                                    onChange={(e) => setTicketNumber(e.target.value)}
                                    placeholder="e.g. RPR-2026-000001"
                                    className="flex-1 h-11 border-slate-300 focus-visible:ring-brand-blue"
                                    disabled={loading}
                                />
                                <Button
                                    type="submit"
                                    disabled={loading || !ticketNumber.trim()}
                                    className="h-11 bg-brand-blue hover:bg-brand-blue/90 px-6"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            Searching...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Search className="h-4 w-4" />
                                            Search
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Error State */}
                    {error && (
                        <Card className="border-red-200 bg-red-50 shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3 text-red-700">
                                    <XCircle className="h-5 w-5 flex-shrink-0" />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Ticket Result */}
                    {ticket && statusConfig && (
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="pb-4 border-b border-slate-100">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Ticket Number</p>
                                        <p className="text-xl font-bold text-slate-900 font-mono">{ticket.ticket_number}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${statusConfig.className}`}>
                                        <StatusIcon status={ticket.status} />
                                        {statusConfig.label}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-5">
                                {/* Customer & Service */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Customer Name</p>
                                        <p className="text-sm font-medium text-slate-800">{ticket.customer_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Service Type</p>
                                        <p className="text-sm font-medium text-slate-800 capitalize">{ticket.service_type.replace(/_/g, ' ')}</p>
                                    </div>
                                </div>

                                {/* Device Info */}
                                {(ticket.item_make || ticket.model_number) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        {ticket.item_make && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Item Make</p>
                                                <p className="text-sm font-medium text-slate-800">{ticket.item_make}</p>
                                            </div>
                                        )}
                                        {ticket.model_number && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Model Number</p>
                                                <p className="text-sm font-medium text-slate-800">{ticket.model_number}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Date Submitted</p>
                                        <p className="text-sm font-medium text-slate-800">{formatDate(ticket.created_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Estimated Completion</p>
                                        <p className="text-sm font-medium text-slate-800">{formatDate(ticket.eta_date)}</p>
                                    </div>
                                </div>

                                {/* Problem Description */}
                                {ticket.problem_description && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Problem Description</p>
                                        <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3 border border-slate-100">{ticket.problem_description}</p>
                                    </div>
                                )}

                                {/* Notes */}
                                {ticket.notes && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Technician Notes</p>
                                        <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3 border border-slate-100">{ticket.notes}</p>
                                    </div>
                                )}

                                {/* Contact prompt */}
                                <div className="pt-2 border-t border-slate-100 text-center">
                                    <p className="text-xs text-slate-400">
                                        Questions about your repair? Contact us at our store and reference your ticket number.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </StorefrontLayout>
    );
}
