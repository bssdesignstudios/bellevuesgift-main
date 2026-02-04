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
        $query = Product::with(['category', 'inventory']);

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%")
                    ->orWhere('barcode', 'ilike', "%{$search}%");
            });
        }

        if ($request->has('filter')) {
            $filter = $request->input('filter');

            if ($filter === 'low_stock') {
                $query->whereHas('inventory', function ($q) {
                    $q->whereColumn('qty_on_hand', '<=', 'reorder_level');
                });
            } elseif ($filter === 'out_of_stock') {
                $query->whereHas('inventory', function ($q) {
                    $q->where('qty_on_hand', '<=', 0);
                });
            }
        }

        $products = $query->orderBy('name')->get();

        return response()->json($products);
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
