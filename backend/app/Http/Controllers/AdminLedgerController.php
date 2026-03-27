<?php

namespace App\Http\Controllers;

use App\Models\CustomerLedgerEntry;
use App\Models\Invoice;
use Illuminate\Http\Request;

class AdminLedgerController extends Controller
{
    public function index(Request $request)
    {
        $customerId = $request->query('customer_id');

        $query = CustomerLedgerEntry::with('customer')
            ->orderBy('entry_date', 'asc')
            ->orderBy('created_at', 'asc');

        if ($customerId) {
            $query->where('customer_id', $customerId);
        }

        $entries = $query->get();

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
        $entries = $entries->map(function ($entry) use ($invoiceMap, $customerId, &$running) {
            $invoiceNumber = null;
            if ($entry->reference_type === 'invoice' && $entry->reference_id) {
                $invoiceNumber = $invoiceMap->get($entry->reference_id);
            }

            if ($customerId) {
                $running = (float) $running + (float) $entry->amount;
            }

            return [
                'id' => $entry->id,
                'customer_id' => $entry->customer_id,
                'customer_name' => $entry->customer?->name,
                'entry_type' => $entry->entry_type,
                'reference_type' => $entry->reference_type,
                'reference_id' => $entry->reference_id,
                'invoice_number' => $invoiceNumber,
                'amount' => (float) $entry->amount,
                'balance_after' => $entry->balance_after !== null ? (float) $entry->balance_after : null,
                'running_balance' => $customerId ? (float) $running : null,
                'notes' => $entry->notes,
                'entry_date' => $entry->entry_date,
                'created_at' => $entry->created_at,
            ];
        });

        return response()->json(['entries' => $entries]);
    }
}
