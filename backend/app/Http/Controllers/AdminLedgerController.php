<?php

namespace App\Http\Controllers;

use App\Models\CustomerLedgerEntry;
use App\Models\Invoice;
use Illuminate\Http\Request;

class AdminLedgerController extends Controller
{
    public function index(Request $request)
    {
        $customerId  = $request->query('customer_id');
        $search      = $request->query('search');       // customer name search
        $entryType   = $request->query('entry_type');   // charge | payment | credit | adjustment
        $dateFrom    = $request->query('date_from');    // YYYY-MM-DD
        $dateTo      = $request->query('date_to');      // YYYY-MM-DD

        $query = CustomerLedgerEntry::with('customer')
            ->orderBy('entry_date', 'asc')
            ->orderBy('created_at', 'asc');

        // Filter by specific customer UUID
        if ($customerId) {
            $query->where('customer_id', $customerId);
        }

        // Full-text search across customer name (joins customers table)
        if ($search) {
            $query->whereHas('customer', function ($q) use ($search) {
                $q->where('name', 'ilike', '%' . $search . '%')
                  ->orWhere('email', 'ilike', '%' . $search . '%');
            });
        }

        // Filter by entry type
        if ($entryType && $entryType !== 'all') {
            $query->where('entry_type', $entryType);
        }

        // Date range filter
        if ($dateFrom) {
            $query->whereDate('entry_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('entry_date', '<=', $dateTo);
        }

        $entries = $query->get();

        // Resolve invoice numbers
        $invoiceIds = $entries
            ->where('reference_type', 'invoice')
            ->pluck('reference_id')
            ->filter()
            ->unique()
            ->values();

        $invoiceMap = $invoiceIds->isNotEmpty()
            ? Invoice::whereIn('id', $invoiceIds)->pluck('invoice_number', 'id')
            : collect();

        $running = 0.0;
        $mapped  = $entries->map(function ($entry) use ($invoiceMap, $customerId, &$running) {
            $invoiceNumber = null;
            if ($entry->reference_type === 'invoice' && $entry->reference_id) {
                $invoiceNumber = $invoiceMap->get($entry->reference_id);
            }

            if ($customerId) {
                $running = (float) $running + (float) $entry->amount;
            }

            return [
                'id'             => $entry->id,
                'customer_id'    => $entry->customer_id,
                'customer_name'  => $entry->customer?->name,
                'customer_email' => $entry->customer?->email,
                'entry_type'     => $entry->entry_type,
                'reference_type' => $entry->reference_type,
                'reference_id'   => $entry->reference_id,
                'invoice_number' => $invoiceNumber,
                'amount'         => (float) $entry->amount,
                'balance_after'  => $entry->balance_after !== null ? (float) $entry->balance_after : null,
                'running_balance'=> $customerId ? (float) $running : null,
                'notes'          => $entry->notes,
                'entry_date'     => $entry->entry_date,
                'created_at'     => $entry->created_at,
            ];
        });

        // Summary totals
        $totalCharged  = $mapped->where('amount', '>', 0)->sum('amount');
        $totalPaid     = $mapped->where('amount', '<', 0)->sum('amount');
        $lastBalance   = $mapped->last()['balance_after'] ?? $mapped->last()['running_balance'] ?? null;

        return response()->json([
            'entries'       => $mapped->values(),
            'summary'       => [
                'count'         => $mapped->count(),
                'total_charged' => round((float) $totalCharged, 2),
                'total_paid'    => round((float) abs($totalPaid), 2),
                'balance'       => $lastBalance !== null ? round((float) $lastBalance, 2) : null,
            ],
        ]);
    }
}
