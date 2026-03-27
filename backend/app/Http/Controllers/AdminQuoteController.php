<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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
            'customer'     => $q->customer ? ['id' => $q->customer->id, 'name' => $q->customer->name] : null,
            'total'        => $q->total,
            'issued_date'  => $q->issued_date,
            'valid_until'  => $q->valid_until,
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
        $last = Quote::where('quote_number', 'like', "Q-{$year}-%")
            ->orderByRaw("LENGTH(quote_number) DESC, quote_number DESC")
            ->value('quote_number');
        $seq = $last ? ((int) substr(strrchr($last, '-'), 1)) + 1 : 1;
        $quoteNumber = "Q-{$year}-" . str_pad($seq, 4, '0', STR_PAD_LEFT);

        $totals = $this->calcTotals($validated['items']);

        $quote = Quote::create([
            'quote_number'   => $quoteNumber,
            'customer_id'    => $validated['customer_id'] ?? null,
            'status'         => $validated['status'] ?? 'draft',
            'issued_date'    => $validated['issued_date'] ?? now()->toDateString(),
            'valid_until'    => $validated['valid_until'] ?? null,
            'notes'          => $validated['notes'] ?? null,
            'subtotal'       => $totals['subtotal'],
            'tax_total'      => $totals['tax_total'],
            'discount_total' => $totals['discount_total'],
            'total'          => $totals['total'],
            'created_by'     => $request->user()?->id,
        ]);

        foreach ($validated['items'] as $item) {
            $lineTotal = $this->lineTotal($item);
            QuoteItem::create([
                'quote_id'    => $quote->id,
                'product_id'  => $item['product_id'] ?? null,
                'description' => $item['description'],
                'qty'         => $item['qty'],
                'unit_price'  => $item['unit_price'],
                'tax_rate'    => $item['tax_rate'] ?? 0,
                'discount'    => $item['discount'] ?? 0,
                'line_total'  => $lineTotal,
            ]);
        }

        return response()->json($quote->load(['items.product', 'customer']), 201);
    }

    public function show($id)
    {
        return response()->json(Quote::with(['items.product', 'customer'])->findOrFail($id));
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

        if (!empty($validated['items'])) {
            $totals = $this->calcTotals($validated['items']);
            $quote->items()->delete();
            foreach ($validated['items'] as $item) {
                QuoteItem::create([
                    'quote_id'    => $quote->id,
                    'product_id'  => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'qty'         => $item['qty'],
                    'unit_price'  => $item['unit_price'],
                    'tax_rate'    => $item['tax_rate'] ?? 0,
                    'discount'    => $item['discount'] ?? 0,
                    'line_total'  => $this->lineTotal($item),
                ]);
            }
            $validated = array_merge($validated, $totals);
        }

        unset($validated['items']);
        $quote->update(array_filter($validated, fn($v) => $v !== null));

        return response()->json($quote->fresh()->load(['items.product', 'customer']));
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

        $invoice = Invoice::create([
            'invoice_number' => $invoiceNumber,
            'customer_id'    => $quote->customer_id,
            'quote_id'       => $quote->id,
            'status'         => 'draft',
            'issued_date'    => now()->toDateString(),
            'due_date'       => now()->addDays(30)->toDateString(),
            'notes'          => $quote->notes,
            'subtotal'       => $quote->subtotal,
            'tax_total'      => $quote->tax_total,
            'discount_total' => $quote->discount_total,
            'total'          => $quote->total,
            'amount_paid'    => 0,
            'created_by'     => $request->user()?->id,
        ]);

        foreach ($quote->items as $item) {
            InvoiceItem::create([
                'invoice_id'  => $invoice->id,
                'product_id'  => $item->product_id,
                'description' => $item->description,
                'qty'         => $item->qty,
                'unit_price'  => $item->unit_price,
                'tax_rate'    => $item->tax_rate,
                'discount'    => $item->discount,
                'line_total'  => $item->line_total,
            ]);
        }

        $quote->update(['status' => 'accepted']);

        return response()->json($invoice->load(['items.product', 'customer']), 201);
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
