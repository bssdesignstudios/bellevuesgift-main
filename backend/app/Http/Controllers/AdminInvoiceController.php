<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

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
            'customer'       => $inv->customer ? ['id' => $inv->customer->id, 'name' => $inv->customer->name] : null,
            'total'          => $inv->total,
            'amount_paid'    => $inv->amount_paid,
            'balance'        => $inv->balance,
            'issued_date'    => $inv->issued_date,
            'due_date'       => $inv->due_date,
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

        $invoiceNumber = 'INV-' . date('Y') . '-' . strtoupper(Str::random(5));
        $totals = $this->calcTotals($validated['items']);

        $invoice = Invoice::create([
            'invoice_number' => $invoiceNumber,
            'customer_id'    => $validated['customer_id'] ?? null,
            'quote_id'       => $validated['quote_id'] ?? null,
            'status'         => $validated['status'] ?? 'draft',
            'issued_date'    => $validated['issued_date'] ?? now()->toDateString(),
            'due_date'       => $validated['due_date'] ?? null,
            'notes'          => $validated['notes'] ?? null,
            'subtotal'       => $totals['subtotal'],
            'tax_total'      => $totals['tax_total'],
            'discount_total' => $totals['discount_total'],
            'total'          => $totals['total'],
            'amount_paid'    => 0,
            'created_by'     => $request->user()?->id,
        ]);

        foreach ($validated['items'] as $item) {
            InvoiceItem::create([
                'invoice_id'  => $invoice->id,
                'product_id'  => $item['product_id'] ?? null,
                'description' => $item['description'],
                'qty'         => $item['qty'],
                'unit_price'  => $item['unit_price'],
                'tax_rate'    => $item['tax_rate'] ?? 0,
                'discount'    => $item['discount'] ?? 0,
                'line_total'  => $this->lineTotal($item),
            ]);
        }

        return response()->json($invoice->load(['items.product', 'customer']), 201);
    }

    public function show($id)
    {
        return response()->json(Invoice::with(['items.product', 'customer', 'quote'])->findOrFail($id));
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

        if (!empty($validated['items'])) {
            $totals = $this->calcTotals($validated['items']);
            $invoice->items()->delete();
            foreach ($validated['items'] as $item) {
                InvoiceItem::create([
                    'invoice_id'  => $invoice->id,
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
        $invoice->update(array_filter($validated, fn($v) => $v !== null));

        // Auto-mark paid if amount_paid >= total
        if ($invoice->fresh()->amount_paid >= $invoice->fresh()->total && $invoice->fresh()->total > 0) {
            $invoice->update(['status' => 'paid']);
        }

        return response()->json($invoice->fresh()->load(['items.product', 'customer']));
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
}
