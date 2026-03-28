<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminQuoteController extends Controller
{
    public function index(Request $request)
    {
        $query = Quote::with('customer')->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('quote_number', 'ilike', "%{$s}%")
                  ->orWhereHas('customer', fn($c) => $c->where('name', 'ilike', "%{$s}%"));
            });
        }

        return response()->json($query->limit(200)->get()->map(fn($q) => [
            'id'           => $q->id,
            'quote_number' => $q->quote_number,
            'status'       => $q->status,
            'customer'     => $q->customer
                ? ['id' => $q->customer->id, 'name' => $q->customer->name]
                : ($q->customer_name ? ['id' => $q->customer_id, 'name' => $q->customer_name] : null),
            'total'        => $q->total,
            'issued_date'  => $q->issued_date ?? null,
            'valid_until'  => $q->valid_until ?? null,
        ]));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'  => 'nullable|uuid|exists:customers,id',
            'status'       => 'nullable|in:draft,sent,accepted,rejected,expired',
            'issued_date'  => 'nullable|date',
            'valid_until'  => 'nullable|date',
            'notes'        => 'nullable|string',
            'items'        => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.product_id'  => 'nullable|uuid|exists:products,id',
            'items.*.qty'         => 'required|numeric|min:0.01',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.tax_rate'    => 'nullable|numeric|min:0',
            'items.*.discount'    => 'nullable|numeric|min:0',
        ]);

        $year = date('Y');
        // Search both QT- and Q- prefixes to find the highest sequence number
        $last = Quote::where(function ($q) use ($year) {
                $q->where('quote_number', 'like', "QT-{$year}-%")
                  ->orWhere('quote_number', 'like', "Q-{$year}-%");
            })
            ->orderByRaw("LENGTH(quote_number) DESC, quote_number DESC")
            ->value('quote_number');
        $seq = $last ? ((int) substr(strrchr($last, '-'), 1)) + 1 : 1;
        $quoteNumber = "QT-{$year}-" . str_pad($seq, 4, '0', STR_PAD_LEFT);

        $totals = $this->calcTotals($validated['items']);
        $usePriceCol = Schema::hasColumn('quote_items', 'price');

        $quoteData = [
            'quote_number' => $quoteNumber,
            'customer_id'  => $validated['customer_id'] ?? null,
            'status'       => $validated['status'] ?? 'draft',
            'notes'        => $validated['notes'] ?? null,
            'subtotal'     => $totals['subtotal'],
            'total'        => $totals['total'],
            'created_by'   => $request->user()?->id,
        ];

        if (Schema::hasColumn('quotes', 'issued_date')) {
            $quoteData['issued_date']    = $validated['issued_date'] ?? now()->toDateString();
            $quoteData['valid_until']    = $validated['valid_until'] ?? null;
            $quoteData['tax_total']      = $totals['tax_total'];
            $quoteData['discount_total'] = $totals['discount_total'];
        } else {
            $quoteData['tax'] = $totals['tax_total'];
            if ($validated['customer_id'] ?? null) {
                $cust = Customer::find($validated['customer_id']);
                $quoteData['customer_name']  = $cust?->name;
                $quoteData['customer_email'] = $cust?->email;
            }
        }

        $quote = Quote::create($quoteData);

        foreach ($validated['items'] as $item) {
            $lineTotal = $this->lineTotal($item);
            $itemData = [
                'quote_id'    => $quote->id,
                'product_id'  => $item['product_id'] ?? null,
                'description' => $item['description'],
                'qty'         => $item['qty'],
            ];

            if ($usePriceCol) {
                $itemData['price'] = $item['unit_price'];
                $itemData['total'] = $lineTotal;
            } else {
                $itemData['unit_price']  = $item['unit_price'];
                $itemData['tax_rate']    = $item['tax_rate'] ?? 0;
                $itemData['discount']    = $item['discount'] ?? 0;
                $itemData['line_total']  = $lineTotal;
            }

            DB::table('quote_items')->insert(array_merge($itemData, [
                'id'         => (string) Str::uuid(),
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        return response()->json($quote->load(['items', 'customer']), 201);
    }

    public function show($id)
    {
        $quote = Quote::with(['items', 'customer'])->findOrFail($id);
        $usePriceCol = Schema::hasColumn('quote_items', 'price');

        // Normalize items for frontend
        $quoteArray = $quote->toArray();
        if ($usePriceCol && !empty($quoteArray['items'])) {
            $quoteArray['items'] = array_map(function ($item) {
                $item['unit_price'] = $item['price'] ?? 0;
                $item['line_total'] = $item['total'] ?? 0;
                $item['tax_rate']   = $item['tax_rate'] ?? 0;
                $item['discount']   = $item['discount'] ?? 0;
                return $item;
            }, $quoteArray['items']);
        }

        return response()->json($quoteArray);
    }

    public function update(Request $request, $id)
    {
        $quote = Quote::findOrFail($id);

        $validated = $request->validate([
            'customer_id'  => 'nullable|uuid|exists:customers,id',
            'status'       => 'nullable|in:draft,sent,accepted,rejected,expired',
            'issued_date'  => 'nullable|date',
            'valid_until'  => 'nullable|date',
            'notes'        => 'nullable|string',
            'items'        => 'nullable|array',
            'items.*.description' => 'required_with:items|string',
            'items.*.product_id'  => 'nullable|uuid|exists:products,id',
            'items.*.qty'         => 'required_with:items|numeric|min:0.01',
            'items.*.unit_price'  => 'required_with:items|numeric|min:0',
            'items.*.tax_rate'    => 'nullable|numeric|min:0',
            'items.*.discount'    => 'nullable|numeric|min:0',
        ]);

        $usePriceCol = Schema::hasColumn('quote_items', 'price');

        if (!empty($validated['items'])) {
            $totals = $this->calcTotals($validated['items']);
            $quote->items()->delete();

            foreach ($validated['items'] as $item) {
                $lineTotal = $this->lineTotal($item);
                $itemData = [
                    'quote_id'    => $quote->id,
                    'product_id'  => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'qty'         => $item['qty'],
                ];

                if ($usePriceCol) {
                    $itemData['price'] = $item['unit_price'];
                    $itemData['total'] = $lineTotal;
                } else {
                    $itemData['unit_price']  = $item['unit_price'];
                    $itemData['tax_rate']    = $item['tax_rate'] ?? 0;
                    $itemData['discount']    = $item['discount'] ?? 0;
                    $itemData['line_total']  = $lineTotal;
                }

                DB::table('quote_items')->insert(array_merge($itemData, [
                    'id'         => (string) Str::uuid(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }

            $validated = array_merge($validated, $totals);

            // Update quote totals based on schema
            $updateData = ['subtotal' => $totals['subtotal'], 'total' => $totals['total']];
            if (Schema::hasColumn('quotes', 'tax_total')) {
                $updateData['tax_total']      = $totals['tax_total'];
                $updateData['discount_total'] = $totals['discount_total'];
            } else {
                $updateData['tax'] = $totals['tax_total'];
            }
            $quote->update($updateData);
        }

        // Update non-item fields
        $updateFields = [];
        if (array_key_exists('customer_id', $validated)) $updateFields['customer_id'] = $validated['customer_id'];
        if (array_key_exists('status', $validated) && $validated['status']) $updateFields['status'] = $validated['status'];
        if (array_key_exists('notes', $validated)) $updateFields['notes'] = $validated['notes'];
        if (Schema::hasColumn('quotes', 'issued_date')) {
            if (array_key_exists('issued_date', $validated)) $updateFields['issued_date'] = $validated['issued_date'];
            if (array_key_exists('valid_until', $validated)) $updateFields['valid_until'] = $validated['valid_until'];
        }
        if (!empty($updateFields)) {
            $quote->update($updateFields);
        }

        return response()->json($quote->fresh()->load(['items', 'customer']));
    }

    public function destroy($id)
    {
        Quote::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function convertToInvoice(Request $request, $id)
    {
        $quote = Quote::with('items')->findOrFail($id);

        $year = date('Y');
        $lastInv = Invoice::where('invoice_number', 'like', "INV-{$year}-%")
            ->orderByRaw("LENGTH(invoice_number) DESC, invoice_number DESC")
            ->value('invoice_number');
        $seq = $lastInv ? ((int) substr(strrchr($lastInv, '-'), 1)) + 1 : 1;
        $invoiceNumber = "INV-{$year}-" . str_pad($seq, 4, '0', STR_PAD_LEFT);

        $usePriceCol = Schema::hasColumn('invoice_items', 'price');

        // Build invoice data adapting to schema
        $invoiceData = [
            'invoice_number' => $invoiceNumber,
            'customer_id'    => $quote->customer_id,
            'quote_id'       => $quote->id,
            'status'         => 'draft',
            'notes'          => $quote->notes,
            'subtotal'       => $quote->subtotal,
            'total'          => $quote->total,
            'amount_paid'    => 0,
            'created_by'     => $request->user()?->id,
        ];

        if (Schema::hasColumn('invoices', 'issued_date')) {
            $invoiceData['issued_date']    = now()->toDateString();
            $invoiceData['due_date']       = now()->addDays(30)->toDateString();
            $invoiceData['tax_total']      = $quote->tax_total ?? $quote->tax ?? 0;
            $invoiceData['discount_total'] = $quote->discount_total ?? 0;
        } else {
            $invoiceData['tax']         = $quote->tax ?? $quote->tax_total ?? 0;
            $invoiceData['balance_due'] = $quote->total;
            if ($quote->customer_id) {
                $cust = Customer::find($quote->customer_id);
                $invoiceData['customer_name']  = $cust?->name;
                $invoiceData['customer_email'] = $cust?->email;
            }
        }

        $invoice = Invoice::create($invoiceData);

        foreach ($quote->items as $item) {
            $itemData = [
                'invoice_id'  => $invoice->id,
                'product_id'  => $item->product_id,
                'description' => $item->description,
                'qty'         => $item->qty,
            ];

            if ($usePriceCol) {
                $itemData['price'] = $item->price ?? $item->unit_price ?? 0;
                $itemData['total'] = $item->total ?? $item->line_total ?? 0;
            } else {
                $itemData['unit_price']  = $item->unit_price ?? $item->price ?? 0;
                $itemData['tax_rate']    = $item->tax_rate ?? 0;
                $itemData['discount']    = $item->discount ?? 0;
                $itemData['line_total']  = $item->line_total ?? $item->total ?? 0;
            }

            DB::table('invoice_items')->insert(array_merge($itemData, [
                'id'         => (string) Str::uuid(),
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $quote->update(['status' => 'accepted']);

        // Create ledger "charge" entry for the new invoice
        if ($invoice->customer_id && Schema::hasTable('customer_ledger_entries')) {
            $lastEntry = DB::table('customer_ledger_entries')
                ->where('customer_id', $invoice->customer_id)
                ->orderBy('created_at', 'desc')
                ->first();
            $prevBalance = $lastEntry ? (float) $lastEntry->balance_after : 0;

            DB::table('customer_ledger_entries')->insert([
                'id'             => (string) Str::uuid(),
                'customer_id'    => $invoice->customer_id,
                'entry_type'     => 'charge',
                'reference_type' => 'invoice',
                'reference_id'   => $invoice->id,
                'amount'         => $invoice->total,
                'balance_after'  => round($prevBalance + $invoice->total, 2),
                'notes'          => "Invoice {$invoiceNumber} created from quote {$quote->quote_number}",
                'entry_date'     => now()->toDateString(),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        }

        return response()->json($invoice->load(['items', 'customer']), 201);
    }

    private function lineTotal(array $item): float
    {
        $subtotal = (float) $item['qty'] * (float) $item['unit_price'];
        $tax = $subtotal * ((float) ($item['tax_rate'] ?? 0) / 100);
        $discount = (float) ($item['discount'] ?? 0);
        return round($subtotal + $tax - $discount, 2);
    }

    private function calcTotals(array $items): array
    {
        $subtotal = 0;
        $taxTotal = 0;
        $discountTotal = 0;

        foreach ($items as $item) {
            $sub = (float) $item['qty'] * (float) $item['unit_price'];
            $tax = $sub * ((float) ($item['tax_rate'] ?? 0) / 100);
            $disc = (float) ($item['discount'] ?? 0);
            $subtotal += $sub;
            $taxTotal += $tax;
            $discountTotal += $disc;
        }

        return [
            'subtotal'       => round($subtotal, 2),
            'tax_total'      => round($taxTotal, 2),
            'discount_total' => round($discountTotal, 2),
            'total'          => round($subtotal + $taxTotal - $discountTotal, 2),
        ];
    }
}
