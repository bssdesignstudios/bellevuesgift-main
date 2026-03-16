<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        // First, ensure every product has an inventory record (auto-seed missing ones)
        $allProducts = Product::all();
        foreach ($allProducts as $product) {
            $product->inventory()->firstOrCreate(
                ['product_id' => $product->id],
                ['qty_on_hand' => 0, 'qty_reserved' => 0, 'reorder_level' => 10]
            );
        }

        // The frontend expects: inventory records with nested product+category
        // Use the Inventory model joined to product
        $query = \App\Models\Inventory::with(['product.category']);

        if ($request->has('search') && $request->input('search')) {
            $search = $request->input('search');
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if ($request->has('filter')) {
            $filter = $request->input('filter');

            if ($filter === 'low_stock') {
                $query->whereColumn('qty_on_hand', '<=', 'reorder_level');
            } elseif ($filter === 'out_of_stock') {
                $query->where('qty_on_hand', '<=', 0);
            }
        }

        $inventory = $query->get()->sortBy('product.name')->values();

        return response()->json($inventory);
    }

    public function adjust(Request $request, string $productId): JsonResponse
    {
        $request->validate([
            'adjustment_type' => 'required|in:receive,damage,shrink,count,sale,refund,reserve,unreserve',
            'qty_change' => 'required|integer',
            'notes' => 'nullable|string',
        ]);

        $product = Product::findOrFail($productId);
        $inventory = $product->inventory;
        $inventory = $inventory ?? $product->inventory()->create([
            'qty_on_hand' => 0,
            'qty_reserved' => 0,
            'reorder_level' => 10,
        ]);

        $currentQty = $inventory->qty_on_hand;
        $reservedQty = $inventory->qty_reserved;
        $change = $request->integer('qty_change');

        $available = $currentQty - $reservedQty;

        $adjustmentType = $request->input('adjustment_type');

        if (in_array($adjustmentType, ['sale', 'refund', 'reserve'])) {
            if ($change > $available) {
                return response()->json(['message' => 'Insufficient inventory'], 422);
            }
        }

        $newQtyOnHand = $currentQty;
        $newReserved = $reservedQty;

        switch ($adjustmentType) {
            case 'receive':
            case 'damage':
            case 'shrink':
            case 'count':
                $newQtyOnHand = $currentQty + $change;
                break;
            case 'sale':
                $newQtyOnHand = $currentQty - $change;
                break;
            case 'reserve':
                $newReserved = $reservedQty + $change;
                break;
            case 'unreserve':
                $newReserved = $reservedQty - $change;
                break;
        }

        $inventory->update([
            'qty_on_hand' => max(0, $newQtyOnHand),
            'qty_reserved' => max(0, $newReserved),
        ]);

        $inventory->adjustments()->create([
            'adjustment_type' => $adjustmentType,
            'qty_change' => $change,
            'notes' => $request->input('notes'),
            'staff_id' => auth()->id(),
        ]);

        return response()->json($inventory);
    }

    public function bulkAdjust(Request $request): JsonResponse
    {
        $request->validate([
            'adjustments' => 'required|array',
            'adjustments.*.product_id' => 'required|exists:products,id',
            'adjustments.*.adjustment_type' => 'required|in:receive,damage,shrink,count',
            'adjustments.*.qty_change' => 'required|integer',
            'adjustments.*.notes' => 'nullable|string',
        ]);

        foreach ($request->input('adjustments') as $adj) {
            $this->adjust(new Request($adj), $adj['product_id']);
        }

        return response()->json(['message' => 'Bulk adjustment complete']);
    }
}
