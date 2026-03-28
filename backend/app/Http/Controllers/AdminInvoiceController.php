<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Customer;
use App\Models\CustomerLedgerEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminInvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with('customer')->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('invoice_number', 'ilike', "%{$s}%")
                  ->orWhereHas('customer', fn($c) => $c->where('name', 'ilike', "%{$s}%"));
            });
        }

        return response()->json($query->limit(200)->get()->map(fn($inv) => [
            'id'             => $inv->id,
            'invoice_number' => $inv->invoice_number,
            'status'         => $inv->status,
            'customer'       => $inv->customer
                ? ['id' => $inv->customer->id, 'name' => $inv->customer->name]
                : ($inv->customer_name ? ['id' => $inv->customer_id, 'name' => $inv->customer_name] : null),
            'total'          => $inv->total,
            'amount_paid'    => $inv->amount_paid ?? 0,
            'balance'        => $inv->balance ?? $inv->balance_due ?? 0,
            'issued_date'    => $inv->issued_date ?? null,
            'due_date'       => $inv->due_date ?? null,
        ]));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'  => 'nullable|uuid|exists:customers,id',
            'quote_id'     => 'nullable|uuid|exists:quotes,id',
            'status'       => 'nullable|in:draft,sent,paid,overdue,void',
            'issued_date'  => 'nullable|date',
            'due_date'     => 'nullable|date',
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
        $lastInv = Invoice::where('invoice_number', 'like', "INV-{$year}-%")
            ->orderByRaw("LENGTH(invoice_number) DESC, invoice_number DESC")
            ->value('invoice_number');
        $seq = $lastInv ? ((int) substr(strrchr($lastInv, '-'), 1)) + 1 : 1;
        $invoiceNumber = "INV-{$year}-" . str_pad($seq, 4, '0', STR_PAD_LEFT);
        $totals = $this->calcTotals($validated['items']);
        $usePriceCol = Schema::hasColumn('invoice_items', 'price');

        $invoiceData = [
            'invoice_number' => $invoiceNumber,
            'customer_id'    => $validated['customer_id'] ?? null,
            'quote_id'       => $validated['quote_id'] ?? null,
            'status'         => $validated['status'] ?? 'draft',
            'notes'          => $validated['notes'] ?? null,
            'subtotal'       => $totals['subtotal'],
            'total'          => $totals['total'],
            'amount_paid'    => 0,
            'created_by'     => $request->user()?->id,
        ];

        if (Schema::hasColumn('invoices', 'issued_date')) {
            $invoiceData['issued_date']    = $validated['issued_date'] ?? now()->toDateString();
            $invoiceData['due_date']       = $validated['due_date'] ?? null;
            $invoiceData['tax_total']      = $totals['tax_total'];
            $invoiceData['discount_total'] = $totals['discount_total'];
        } else {
            $invoiceData['tax']         = $totals['tax_total'];
            $invoiceData['balance_due'] = $totals['total'];
            if ($validated['customer_id'] ?? null) {
                $cust = Customer::find($validated['customer_id']);
                $invoiceData['customer_name']  = $cust?->name;
                $invoiceData['customer_email'] = $cust?->email;
            }
        }

        $invoice = Invoice::create($invoiceData);

        foreach ($validated['items'] as $item) {
            $lineTotal = $this->lineTotal($item);
            $itemData = [
                'invoice_id'  => $invoice->id,
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

            DB::table('invoice_items')->insert(array_merge($itemData, [
                'id'         => (string) Str::uuid(),
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        // Create ledger "charge" entry if invoice has a customer
        if ($invoice->customer_id) {
            $this->createLedgerEntry($invoice->customer_id, 'charge', 'invoice', $invoice->id,
                $invoice->total, "Invoice {$invoiceNumber} created");
        }

        return response()->json($invoice->load(['items', 'customer']), 201);
    }

    public function recordPayment(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'amount'         => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|in:cash,card,bank_transfer,other',
            'notes'          => 'nullable|string',
        ]);

        $amount = (float) $validated['amount'];
        $currentPaid = (float) ($invoice->amount_paid ?? 0);
        $newPaid = $currentPaid + $amount;
        $total = (float) $invoice->total;
        $newBalance = max(0, $total - $newPaid);

        $updateData = ['amount_paid' => $newPaid];
        if (Schema::hasColumn('invoices', 'balance_due')) {
            $updateData['balance_due'] = $newBalance;
        }
        if ($newPaid >= $total && $total > 0) {
            $updateData['status'] = 'paid';
        }

        $invoice->update($updateData);

        // Create ledger "payment" entry (negative amount = reduces balance)
        if ($invoice->customer_id) {
            $method = $validated['payment_method'] ?? 'cash';
            $notes = $validated['notes'] ?? "Payment of \${$amount} via {$method}";
            $this->createLedgerEntry($invoice->customer_id, 'payment', 'invoice', $invoice->id,
                -$amount, $notes);
        }

        $fresh = $invoice->fresh();
        return response()->json([
            'id'             => $fresh->id,
            'invoice_number' => $fresh->invoice_number,
            'status'         => $fresh->status,
            'total'          => $fresh->total,
            'amount_paid'    => $fresh->amount_paid,
            'balance'        => $fresh->balance_due ?? max(0, $fresh->total - $fresh->amount_paid),
        ]);
    }

    public function show($id)
    {
        $invoice = Invoice::with(['items', 'customer', 'quote'])->findOrFail($id);
        $usePriceCol = Schema::hasColumn('invoice_items', 'price');

        $invoiceArray = $invoice->toArray();
        if ($usePriceCol && !empty($invoiceArray['items'])) {
            $invoiceArray['items'] = array_map(function ($item) {
                $item['unit_price'] = $item['price'] ?? 0;
                $item['line_total'] = $item['total'] ?? 0;
                $item['tax_rate']   = $item['tax_rate'] ?? 0;
                $item['discount']   = $item['discount'] ?? 0;
                return $item;
            }, $invoiceArray['items']);
        }

        // Normalize balance field
        $invoiceArray['balance'] = $invoice->balance ?? $invoice->balance_due ?? 0;

        return response()->json($invoiceArray);
    }

    public function update(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'customer_id'  => 'nullable|uuid|exists:customers,id',
            'status'       => 'nullable|in:draft,sent,paid,overdue,void',
            'issued_date'  => 'nullable|date',
            'due_date'     => 'nullable|date',
            'notes'        => 'nullable|string',
            'amount_paid'  => 'nullable|numeric|min:0',
            'items'        => 'nullable|array',
            'items.*.description' => 'required_with:items|string',
            'items.*.product_id'  => 'nullable|uuid|exists:products,id',
            'items.*.qty'         => 'required_with:items|numeric|min:0.01',
            'items.*.unit_price'  => 'required_with:items|numeric|min:0',
            'items.*.tax_rate'    => 'nullable|numeric|min:0',
            'items.*.discount'    => 'nullable|numeric|min:0',
        ]);

        $usePriceCol = Schema::hasColumn('invoice_items', 'price');

        if (!empty($validated['items'])) {
            $totals = $this->calcTotals($validated['items']);
            $invoice->items()->delete();

            foreach ($validated['items'] as $item) {
                $lineTotal = $this->lineTotal($item);
                $itemData = [
                    'invoice_id'  => $invoice->id,
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

                DB::table('invoice_items')->insert(array_merge($itemData, [
                    'id'         => (string) Str::uuid(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }

            $updateData = ['subtotal' => $totals['subtotal'], 'total' => $totals['total']];
            if (Schema::hasColumn('invoices', 'tax_total')) {
                $updateData['tax_total']      = $totals['tax_total'];
                $updateData['discount_total'] = $totals['discount_total'];
            } else {
                $updateData['tax'] = $totals['tax_total'];
            }
            $invoice->update($updateData);
        }

        // Update non-item fields
        $updateFields = [];
        if (array_key_exists('customer_id', $validated)) $updateFields['customer_id'] = $validated['customer_id'];
        if (array_key_exists('status', $validated) && $validated['status']) $updateFields['status'] = $validated['status'];
        if (array_key_exists('notes', $validated)) $updateFields['notes'] = $validated['notes'];
        if (array_key_exists('amount_paid', $validated) && $validated['amount_paid'] !== null) {
            $updateFields['amount_paid'] = $validated['amount_paid'];
            if (Schema::hasColumn('invoices', 'balance_due')) {
                $updateFields['balance_due'] = $invoice->total - $validated['amount_paid'];
            }
        }
        if (Schema::hasColumn('invoices', 'issued_date')) {
            if (array_key_exists('issued_date', $validated)) $updateFields['issued_date'] = $validated['issued_date'];
            if (array_key_exists('due_date', $validated)) $updateFields['due_date'] = $validated['due_date'];
        }
        if (!empty($updateFields)) {
            $invoice->update($updateFields);
        }

        // Auto-mark paid if amount_paid >= total
        $fresh = $invoice->fresh();
        if ($fresh->amount_paid >= $fresh->total && $fresh->total > 0) {
            $fresh->update(['status' => 'paid']);
        }

        return response()->json($fresh->load(['items', 'customer']));
    }

    public function destroy($id)
    {
        Invoice::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted']);
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
        $subtotal = $taxTotal = $discountTotal = 0;
        foreach ($items as $item) {
            $sub = (float) $item['qty'] * (float) $item['unit_price'];
            $subtotal += $sub;
            $taxTotal += $sub * ((float) ($item['tax_rate'] ?? 0) / 100);
            $discountTotal += (float) ($item['discount'] ?? 0);
        }
        return [
            'subtotal'       => round($subtotal, 2),
            'tax_total'      => round($taxTotal, 2),
            'discount_total' => round($discountTotal, 2),
            'total'          => round($subtotal + $taxTotal - $discountTotal, 2),
        ];
    }

    private function createLedgerEntry(string $customerId, string $type, string $refType, string $refId, float $amount, string $notes): void
    {
        if (!Schema::hasTable('customer_ledger_entries')) return;

        // Calculate running balance for this customer
        $lastEntry = DB::table('customer_ledger_entries')
            ->where('customer_id', $customerId)
            ->orderBy('created_at', 'desc')
            ->first();
        $prevBalance = $lastEntry ? (float) $lastEntry->balance_after : 0;
        $newBalance = round($prevBalance + $amount, 2);

        DB::table('customer_ledger_entries')->insert([
            'id'             => (string) Str::uuid(),
            'customer_id'    => $customerId,
            'entry_type'     => $type,
            'reference_type' => $refType,
            'reference_id'   => $refId,
            'amount'         => $amount,
            'balance_after'  => $newBalance,
            'notes'          => $notes,
            'entry_date'     => now()->toDateString(),
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
    }
}
