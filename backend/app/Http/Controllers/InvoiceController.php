<?php

namespace App\Http\Controllers;

use App\Models\CustomerLedgerEntry;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Quote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with('items', 'customer', 'quote')->latest();

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->input('customer_id'));
        }

        return $query->get();
    }

    public function show(string $id)
    {
        return Invoice::with('items', 'customer', 'quote')->findOrFail($id);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_number' => ['required', 'string', 'max:50', 'unique:invoices,invoice_number'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'quote_id' => ['nullable', 'exists:quotes,id'],
            'status' => ['nullable', 'in:draft,sent,partial,paid,void'],
            'issued_at' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.sku' => ['nullable', 'string', 'max:50'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.tax_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $items = $validated['items'];
            unset($validated['items']);

            $totals = $this->calculateTotals($items);
            $invoice = Invoice::create(array_merge($validated, $totals, [
                'staff_id' => $request->user()?->id,
                'balance_due' => $totals['total'],
            ]));

            $this->syncItems($invoice, $items);

            return Invoice::with('items', 'customer', 'quote')->findOrFail($invoice->id);
        });
    }

    public function update(Request $request, string $id)
    {
        $invoice = Invoice::findOrFail($id);

        $validated = $request->validate([
            'invoice_number' => ['required', 'string', 'max:50', 'unique:invoices,invoice_number,' . $invoice->id],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'quote_id' => ['nullable', 'exists:quotes,id'],
            'status' => ['nullable', 'in:draft,sent,partial,paid,void'],
            'issued_at' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.sku' => ['nullable', 'string', 'max:50'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.tax_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        return DB::transaction(function () use ($validated, $invoice) {
            $items = $validated['items'];
            unset($validated['items']);

            $totals = $this->calculateTotals($items);
            $invoice->update(array_merge($validated, $totals, [
                'balance_due' => $invoice->balance_due,
            ]));

            $this->syncItems($invoice, $items, true);

            return Invoice::with('items', 'customer', 'quote')->findOrFail($invoice->id);
        });
    }

    public function recordPayment(Request $request, string $id)
    {
        $invoice = Invoice::findOrFail($id);

        if ($invoice->status === 'void') {
            return response()->json(['message' => 'Cannot record payment for void invoice.'], 409);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'notes' => ['nullable', 'string'],
            'entry_date' => ['nullable', 'date'],
        ]);

        return DB::transaction(function () use ($invoice, $validated) {
            $amount = (float) $validated['amount'];
            $balance = max(0, (float) $invoice->balance_due - $amount);
            $status = $balance <= 0 ? 'paid' : 'partial';

            $invoice->update([
                'balance_due' => $balance,
                'status' => $status,
            ]);

            if (class_exists(CustomerLedgerEntry::class) && $invoice->customer_id) {
                CustomerLedgerEntry::create([
                    'customer_id' => $invoice->customer_id,
                    'entry_type' => 'payment',
                    'reference_type' => 'invoice',
                    'reference_id' => $invoice->id,
                    'amount' => $amount,
                    'balance_after' => $balance,
                    'notes' => $validated['notes'] ?? null,
                    'entry_date' => $validated['entry_date'] ?? now(),
                ]);
            }

            return Invoice::with('items', 'customer', 'quote')->findOrFail($invoice->id);
        });
    }

    public function convertFromQuote(Request $request, string $quoteId)
    {
        $quote = Quote::with('items')->findOrFail($quoteId);

        if ($quote->status === 'converted') {
            return response()->json(['message' => 'Quote already converted.'], 409);
        }

        $validated = $request->validate([
            'invoice_number' => ['nullable', 'string', 'max:50'],
            'issued_at' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        return DB::transaction(function () use ($quote, $validated, $request) {
            $invoiceNumber = $validated['invoice_number'] ?? $this->generateInvoiceNumber($quote->quote_number);

            $invoice = Invoice::create([
                'invoice_number' => $invoiceNumber,
                'customer_id' => $quote->customer_id,
                'staff_id' => $request->user()?->id,
                'quote_id' => $quote->id,
                'status' => 'draft',
                'subtotal' => $quote->subtotal,
                'tax_amount' => $quote->tax_amount,
                'discount_amount' => $quote->discount_amount,
                'total' => $quote->total,
                'balance_due' => $quote->total,
                'issued_at' => $validated['issued_at'] ?? now(),
                'due_date' => $validated['due_date'] ?? null,
                'notes' => $validated['notes'] ?? $quote->notes,
            ]);

            foreach ($quote->items as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $item->product_id,
                    'sku' => $item->sku,
                    'description' => $item->description,
                    'qty' => $item->qty,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                    'tax_amount' => $item->tax_amount,
                    'discount_amount' => $item->discount_amount,
                ]);
            }

            $quote->update([
                'status' => 'converted',
                'converted_invoice_id' => $invoice->id,
            ]);

            return Invoice::with('items', 'customer', 'quote')->findOrFail($invoice->id);
        });
    }

    private function syncItems(Invoice $invoice, array $items, bool $replace = false): void
    {
        if ($replace) {
            $invoice->items()->delete();
        }

        foreach ($items as $item) {
            $tax = (float) ($item['tax_amount'] ?? 0);
            $discount = (float) ($item['discount_amount'] ?? 0);
            $lineTotal = ($item['qty'] * $item['unit_price']) + $tax - $discount;

            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'product_id' => $item['product_id'] ?? null,
                'sku' => $item['sku'] ?? null,
                'description' => $item['description'],
                'qty' => $item['qty'],
                'unit_price' => $item['unit_price'],
                'line_total' => $lineTotal,
                'tax_amount' => $tax,
                'discount_amount' => $discount,
            ]);
        }
    }

    private function calculateTotals(array $items): array
    {
        $subtotal = 0;
        $tax = 0;
        $discount = 0;

        foreach ($items as $item) {
            $subtotal += $item['qty'] * $item['unit_price'];
            $tax += (float) ($item['tax_amount'] ?? 0);
            $discount += (float) ($item['discount_amount'] ?? 0);
        }

        $total = $subtotal + $tax - $discount;

        return [
            'subtotal' => $subtotal,
            'tax_amount' => $tax,
            'discount_amount' => $discount,
            'total' => $total,
        ];
    }

    private function generateInvoiceNumber(string $quoteNumber): string
    {
        $base = 'INV-' . $quoteNumber;
        $number = $base;
        $suffix = 1;

        while (Invoice::where('invoice_number', $number)->exists()) {
            $number = $base . '-' . $suffix;
            $suffix++;
        }

        return $number;
    }
}
