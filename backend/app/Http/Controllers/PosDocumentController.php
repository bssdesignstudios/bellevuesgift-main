<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PosDocumentController extends Controller
{
    // ── Customer search & create ─────────────────────────────────────────────

    public function searchCustomers(Request $request)
    {
        $q = $request->input('q', '');
        $query = Customer::orderBy('name');

        if ($q) {
            $query->where(function ($qb) use ($q) {
                $qb->where('name', 'like', "%{$q}%")
                   ->orWhere('email', 'like', "%{$q}%")
                   ->orWhere('phone', 'like', "%{$q}%");
            });
        }

        return response()->json(
            $query->limit(20)->get(['id', 'name', 'email', 'phone'])
        );
    }

    public function createCustomer(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'email'        => 'nullable|email|max:255|unique:customers,email',
            'phone'        => 'nullable|string|max:50',
            'address'      => 'nullable|string|max:500',
            'island'       => 'nullable|string|max:100',
            'account_type' => 'nullable|in:personal,business',
        ]);

        $customer = Customer::create([
            'name'          => $validated['name'],
            'email'         => $validated['email'] ?? null,
            'phone'         => $validated['phone'] ?? null,
            'address'       => $validated['address'] ?? null,
            'island'        => $validated['island'] ?? null,
            'customer_tier' => 'retail',
        ]);

        return response()->json($customer, 201);
    }

    // ── Quote search ─────────────────────────────────────────────────────────

    public function searchQuotes(Request $request)
    {
        $q = $request->input('q', '');
        $query = Quote::with('customer')->orderBy('created_at', 'desc');

        if ($q) {
            $query->where(function ($qb) use ($q) {
                $qb->where('quote_number', 'like', "%{$q}%")
                   ->orWhereHas('customer', fn($c) => $c->where('name', 'like', "%{$q}%"));
            });
        }

        return response()->json(
            $query->limit(20)->get()->map(fn($quote) => [
                'id'           => $quote->id,
                'quote_number' => $quote->quote_number,
                'status'       => $quote->status,
                'customer'     => $quote->customer ? ['id' => $quote->customer->id, 'name' => $quote->customer->name] : null,
                'total'        => $quote->total,
                'issued_date'  => $quote->issued_date,
                'valid_until'  => $quote->valid_until,
            ])
        );
    }

    // ── Invoice search ───────────────────────────────────────────────────────

    public function searchInvoices(Request $request)
    {
        $q = $request->input('q', '');
        $query = Invoice::with('customer')->orderBy('created_at', 'desc');

        if ($q) {
            $query->where(function ($qb) use ($q) {
                $qb->where('invoice_number', 'like', "%{$q}%")
                   ->orWhereHas('customer', fn($c) => $c->where('name', 'like', "%{$q}%"));
            });
        }

        return response()->json(
            $query->limit(20)->get()->map(fn($inv) => [
                'id'             => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'status'         => $inv->status,
                'customer'       => $inv->customer ? ['id' => $inv->customer->id, 'name' => $inv->customer->name] : null,
                'total'          => $inv->total,
                'amount_paid'    => $inv->amount_paid ?? 0,
                'balance'        => $inv->balance ?? $inv->balance_due ?? 0,
                'issued_date'    => $inv->issued_date ?? null,
                'due_date'       => $inv->due_date ?? null,
            ])
        );
    }

    // ── Create Quote from POS cart ───────────────────────────────────────────

    public function createQuote(Request $request)
    {
        $validated = $request->validate([
            'customer_id'  => 'nullable|string|exists:customers,id',
            'notes'        => 'nullable|string',
            'issued_date'  => 'nullable|date',
            'valid_until'  => 'nullable|date',
            'items'        => 'required|array|min:1',
            'items.*.product_id'  => 'nullable|string|exists:products,id',
            'items.*.name'        => 'required|string',
            'items.*.quantity'    => 'required|numeric|min:0.01',
            'items.*.unit_price'  => 'present|numeric|min:0',
            'items.*.tax_percent' => 'nullable|numeric|min:0',
            'items.*.discount'    => 'nullable|numeric|min:0',
            'items.*.line_total'  => 'nullable|numeric',
        ]);

        $year = date('Y');
        $last = Quote::where('quote_number', 'like', "QT-{$year}-%")
            ->orderByRaw("LENGTH(quote_number) DESC, quote_number DESC")
            ->value('quote_number');
        $seq = $last ? ((int) substr(strrchr($last, '-'), 1)) + 1 : 1;
        $quoteNumber = "QT-{$year}-" . str_pad($seq, 4, '0', STR_PAD_LEFT);

        $totals = $this->calcTotals($validated['items']);

        // Detect Postgres schema (has 'price' column instead of 'unit_price')
        $usePriceCol = Schema::hasColumn('quote_items', 'price');

        $quote = DB::transaction(function () use ($validated, $quoteNumber, $totals, $request, $usePriceCol) {
            // Adapt quote columns to schema
            $quoteData = [
                'quote_number'   => $quoteNumber,
                'customer_id'    => $validated['customer_id'] ?? null,
                'status'         => 'draft',
                'notes'          => $validated['notes'] ?? null,
                'subtotal'       => $totals['subtotal'],
                'total'          => $totals['total'],
                'created_by'     => $request->user()?->id,
            ];

            // SQLite has issued_date, valid_until, tax_total, discount_total
            // Postgres has tax, customer_name, customer_email
            if (Schema::hasColumn('quotes', 'issued_date')) {
                $quoteData['issued_date']    = $validated['issued_date'] ?? now()->toDateString();
                $quoteData['valid_until']    = $validated['valid_until'] ?? null;
                $quoteData['tax_total']      = $totals['tax_total'];
                $quoteData['discount_total'] = $totals['discount_total'];
            } else {
                $quoteData['tax'] = $totals['tax_total'];
                if ($validated['customer_id']) {
                    $cust = Customer::find($validated['customer_id']);
                    $quoteData['customer_name']  = $cust?->name;
                    $quoteData['customer_email'] = $cust?->email;
                }
            }

            $quote = Quote::create($quoteData);

            foreach ($validated['items'] as $item) {
                $itemData = [
                    'quote_id'    => $quote->id,
                    'product_id'  => $item['product_id'] ?? null,
                    'description' => $item['name'],
                    'qty'         => $item['quantity'],
                ];

                if ($usePriceCol) {
                    // Postgres: price, total
                    $itemData['price'] = $item['unit_price'];
                    $itemData['total'] = $item['line_total'] ?? $this->calcLineTotal($item);
                } else {
                    // SQLite: unit_price, tax_rate, discount, line_total
                    $itemData['unit_price']  = $item['unit_price'];
                    $itemData['tax_rate']    = $item['tax_percent'] ?? 0;
                    $itemData['discount']    = $item['discount'] ?? 0;
                    $itemData['line_total']  = $item['line_total'] ?? $this->calcLineTotal($item);
                }

                DB::table('quote_items')->insert(array_merge($itemData, [
                    'id'         => (string) \Illuminate\Support\Str::uuid(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }

            return $quote;
        });

        return response()->json($quote->load(['items', 'customer']), 201);
    }

    // ── Create Invoice from POS cart ─────────────────────────────────────────

    public function createInvoice(Request $request)
    {
        $validated = $request->validate([
            'customer_id'  => 'nullable|string|exists:customers,id',
            'notes'        => 'nullable|string',
            'issued_date'  => 'nullable|date',
            'due_date'     => 'nullable|date',
            'items'        => 'required|array|min:1',
            'items.*.product_id'  => 'nullable|string|exists:products,id',
            'items.*.name'        => 'required|string',
            'items.*.quantity'    => 'required|numeric|min:0.01',
            'items.*.unit_price'  => 'present|numeric|min:0',
            'items.*.tax_percent' => 'nullable|numeric|min:0',
            'items.*.discount'    => 'nullable|numeric|min:0',
            'items.*.line_total'  => 'nullable|numeric',
        ]);

        $year = date('Y');
        $last = Invoice::where('invoice_number', 'like', "INV-{$year}-%")
            ->orderByRaw("LENGTH(invoice_number) DESC, invoice_number DESC")
            ->value('invoice_number');
        $seq = $last ? ((int) substr(strrchr($last, '-'), 1)) + 1 : 1;
        $invoiceNumber = "INV-{$year}-" . str_pad($seq, 4, '0', STR_PAD_LEFT);

        $totals = $this->calcTotals($validated['items']);

        // Detect Postgres schema
        $usePriceCol = Schema::hasColumn('invoice_items', 'price');

        $invoice = DB::transaction(function () use ($validated, $invoiceNumber, $totals, $request, $usePriceCol) {
            // Adapt invoice columns to schema
            $invoiceData = [
                'invoice_number' => $invoiceNumber,
                'customer_id'    => $validated['customer_id'] ?? null,
                'status'         => 'draft',
                'notes'          => $validated['notes'] ?? null,
                'subtotal'       => $totals['subtotal'],
                'total'          => $totals['total'],
                'amount_paid'    => 0,
                'created_by'     => $request->user()?->id,
            ];

            // SQLite has issued_date, due_date, tax_total, discount_total
            // Postgres has tax, balance_due, customer_name, customer_email
            if (Schema::hasColumn('invoices', 'issued_date')) {
                $invoiceData['issued_date']    = $validated['issued_date'] ?? now()->toDateString();
                $invoiceData['due_date']       = $validated['due_date'] ?? null;
                $invoiceData['tax_total']      = $totals['tax_total'];
                $invoiceData['discount_total'] = $totals['discount_total'];
            } else {
                $invoiceData['tax']         = $totals['tax_total'];
                $invoiceData['balance_due'] = $totals['total'];
                if ($validated['customer_id']) {
                    $cust = Customer::find($validated['customer_id']);
                    $invoiceData['customer_name']  = $cust?->name;
                    $invoiceData['customer_email'] = $cust?->email;
                }
            }

            $invoice = Invoice::create($invoiceData);

            foreach ($validated['items'] as $item) {
                $itemData = [
                    'invoice_id'  => $invoice->id,
                    'product_id'  => $item['product_id'] ?? null,
                    'description' => $item['name'],
                    'qty'         => $item['quantity'],
                ];

                if ($usePriceCol) {
                    // Postgres: price, total
                    $itemData['price'] = $item['unit_price'];
                    $itemData['total'] = $item['line_total'] ?? $this->calcLineTotal($item);
                } else {
                    // SQLite: unit_price, tax_rate, discount, line_total
                    $itemData['unit_price']  = $item['unit_price'];
                    $itemData['tax_rate']    = $item['tax_percent'] ?? 0;
                    $itemData['discount']    = $item['discount'] ?? 0;
                    $itemData['line_total']  = $item['line_total'] ?? $this->calcLineTotal($item);
                }

                DB::table('invoice_items')->insert(array_merge($itemData, [
                    'id'         => (string) \Illuminate\Support\Str::uuid(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }

            return $invoice;
        });

        return response()->json($invoice->load(['items', 'customer']), 201);
    }

    // ── Get Quote items in POS cart format ───────────────────────────────────

    public function getQuoteItems(Request $request, $id)
    {
        $quote = Quote::with(['items', 'customer'])->findOrFail($id);
        $usePriceCol = Schema::hasColumn('quote_items', 'price');

        return response()->json([
            'id'           => $quote->id,
            'quote_number' => $quote->quote_number,
            'status'       => $quote->status,
            'customer'     => $quote->customer ? ['id' => $quote->customer->id, 'name' => $quote->customer->name] : null,
            'total'        => $quote->total,
            'items'        => $quote->items->map(fn($item) => [
                'product_id'  => $item->product_id,
                'name'        => $item->description,
                'quantity'    => $item->qty,
                'unit_price'  => $usePriceCol ? $item->price : $item->unit_price,
                'tax_percent' => $usePriceCol ? 0 : ($item->tax_rate ?? 0),
                'discount'    => $usePriceCol ? 0 : ($item->discount ?? 0),
                'line_total'  => $usePriceCol ? $item->total : $item->line_total,
            ]),
        ]);
    }

    // ── Get Invoice items in POS cart format ─────────────────────────────────

    public function getInvoiceItems(Request $request, $id)
    {
        $invoice = Invoice::with(['items', 'customer'])->findOrFail($id);
        $usePriceCol = Schema::hasColumn('invoice_items', 'price');

        return response()->json([
            'id'             => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'status'         => $invoice->status,
            'customer'       => $invoice->customer ? ['id' => $invoice->customer->id, 'name' => $invoice->customer->name] : null,
            'total'          => $invoice->total,
            'balance'        => $invoice->balance ?? ($invoice->balance_due ?? 0),
            'items'          => $invoice->items->map(fn($item) => [
                'product_id'  => $item->product_id,
                'name'        => $item->description,
                'quantity'    => $item->qty,
                'unit_price'  => $usePriceCol ? $item->price : $item->unit_price,
                'tax_percent' => $usePriceCol ? 0 : ($item->tax_rate ?? 0),
                'discount'    => $usePriceCol ? 0 : ($item->discount ?? 0),
                'line_total'  => $usePriceCol ? $item->total : $item->line_total,
            ]),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function calcLineTotal(array $item): float
    {
        $sub = (float) $item['quantity'] * (float) $item['unit_price'];
        $tax = $sub * ((float) ($item['tax_percent'] ?? 0) / 100);
        $disc = (float) ($item['discount'] ?? 0);
        return round($sub + $tax - $disc, 2);
    }

    private function calcTotals(array $items): array
    {
        $subtotal = $taxTotal = $discountTotal = 0;
        foreach ($items as $item) {
            $sub = (float) $item['quantity'] * (float) $item['unit_price'];
            $subtotal += $sub;
            $taxTotal += $sub * ((float) ($item['tax_percent'] ?? 0) / 100);
            $discountTotal += (float) ($item['discount'] ?? 0);
        }
        return [
            'subtotal'       => round($subtotal, 2),
            'tax_total'      => round($taxTotal, 2),
            'discount_total' => round($discountTotal, 2),
            'total'          => round($subtotal + $taxTotal - $discountTotal, 2),
        ];
    }
}
