<?php
/**
 * Role: Builder
 * Rationale: Handle Inventory management in the Laravel backend.
 */

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryAdjustment;
use App\Models\Staff;
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
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
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
            $oldQty = $inventory->qty_on_hand;

            // Update inventory
            if (in_array($validated['adjustment_type'], ['reserve', 'unreserve'])) {
                $inventory->qty_reserved += $validated['qty_change'];
                $newQty = $inventory->qty_on_hand; // Unchanged for reservation usually, but good for log consistency
            } else {
                $inventory->qty_on_hand += $validated['qty_change'];
                $newQty = $inventory->qty_on_hand;
            }

            // Log the adjustment
            InventoryAdjustment::create([
                'product_id' => $inventory->product_id,
                'adjustment_type' => $validated['adjustment_type'],
                'qty_change' => $validated['qty_change'],
                'notes' => $validated['notes'],
                'staff_id' => Staff::where('user_id', auth()->id())->value('id'),
                'old_qty' => $oldQty,
                'new_qty' => $newQty,
            ]);

            $inventory->save();

            return response()->json($inventory->load('product'));
        });
    }

    /**
     * Directly update qty_on_hand (cycle count) or reorder_level.
     */
    public function update(Request $request, Inventory $inventory)
    {
        $validated = $request->validate([
            'qty_on_hand'   => 'sometimes|integer|min:0',
            'reorder_level' => 'sometimes|integer|min:0',
            'notes'         => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $inventory) {
            // Log a cycle-count adjustment if qty changed
            if (isset($validated['qty_on_hand']) && $validated['qty_on_hand'] !== $inventory->qty_on_hand) {
                $oldQty = $inventory->qty_on_hand;
                $change = $validated['qty_on_hand'] - $inventory->qty_on_hand;
                InventoryAdjustment::create([
                    'product_id'      => $inventory->product_id,
                    'adjustment_type' => 'count',
                    'qty_change'      => $change,
                    'notes'           => $validated['notes'] ?? 'Direct count edit via admin',
                    'staff_id'        => auth()->id(),
                    'old_qty'         => $oldQty,
                    'new_qty'         => $validated['qty_on_hand'],
                ]);
            }

            $inventory->update(array_filter([
                'qty_on_hand'   => $validated['qty_on_hand'] ?? null,
                'reorder_level' => $validated['reorder_level'] ?? null,
            ], fn($v) => $v !== null));

            return response()->json($inventory->load('product.category'));
        });
    }
}
