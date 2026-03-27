<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuoteController extends Controller
{
    public function index(Request $request)
    {
        $query = Quote::with('items', 'customer')->latest();

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->input('customer_id'));
        }

        return $query->get();
    }

    public function show(string $id)
    {
        return Quote::with('items', 'customer')->findOrFail($id);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'quote_number' => ['required', 'string', 'max:50', 'unique:quotes,quote_number'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'status' => ['nullable', 'in:draft,sent,accepted,converted'],
            'issued_at' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
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
            $quote = Quote::create(array_merge($validated, $totals, [
                'staff_id' => $request->user()?->id,
            ]));

            $this->syncItems($quote, $items);

            return Quote::with('items', 'customer')->findOrFail($quote->id);
        });
    }

    public function update(Request $request, string $id)
    {
        $quote = Quote::findOrFail($id);

        $validated = $request->validate([
            'quote_number' => ['required', 'string', 'max:50', 'unique:quotes,quote_number,' . $quote->id],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'status' => ['nullable', 'in:draft,sent,accepted,converted'],
            'issued_at' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
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

        return DB::transaction(function () use ($validated, $quote) {
            $items = $validated['items'];
            unset($validated['items']);

            $totals = $this->calculateTotals($items);
            $quote->update(array_merge($validated, $totals));

            $this->syncItems($quote, $items, true);

            return Quote::with('items', 'customer')->findOrFail($quote->id);
        });
    }

    public function destroy(string $id)
    {
        $quote = Quote::findOrFail($id);

        if ($quote->status !== 'draft') {
            return response()->json(['message' => 'Only draft quotes can be deleted.'], 409);
        }

        $quote->items()->delete();
        $quote->delete();

        return response()->json(['message' => 'Quote deleted']);
    }

    private function syncItems(Quote $quote, array $items, bool $replace = false): void
    {
        if ($replace) {
            $quote->items()->delete();
        }

        foreach ($items as $item) {
            $tax = (float) ($item['tax_amount'] ?? 0);
            $discount = (float) ($item['discount_amount'] ?? 0);
            $lineTotal = ($item['qty'] * $item['unit_price']) + $tax - $discount;

            QuoteItem::create([
                'quote_id' => $quote->id,
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
}
