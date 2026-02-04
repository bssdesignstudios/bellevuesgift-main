<?php
/**
 * Role: Builder
 * Rationale: Handle Inventory management in the Laravel backend.
 */

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryAdjustment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminInventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Inventory::with(['product', 'product.category']);

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($request->query('filter') === 'low') {
            $query->whereRaw('qty_on_hand < reorder_level');
        }

        return response()->json($query->orderBy('qty_on_hand')->get());
    }

    public function adjust(Request $request, Inventory $inventory)
    {
        $validated = $request->validate([
            'adjustment_type' => 'required|in:receive,damage,shrink,count,sale,refund,reserve,unreserve',
            'qty_change' => 'required|integer',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $inventory) {
            // Log the adjustment
            InventoryAdjustment::create([
                'product_id' => $inventory->product_id,
                'adjustment_type' => $validated['adjustment_type'],
                'qty_change' => $validated['qty_change'],
                'notes' => $validated['notes'],
                'staff_id' => auth()->id(),
            ]);

            // Update inventory
            if (in_array($validated['adjustment_type'], ['reserve', 'unreserve'])) {
                $inventory->qty_reserved += $validated['qty_change'];
            } else {
                $inventory->qty_on_hand += $validated['qty_change'];
            }

            $inventory->save();

            return response()->json($inventory->load('product'));
        });
    }
}
