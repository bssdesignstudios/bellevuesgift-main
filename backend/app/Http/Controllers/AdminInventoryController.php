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

        if ($request->filled('search')) {
            $s = $request->query('search');
            $query->whereHas('product', function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('sku', 'like', "%{$s}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->whereHas('product', fn($q) => $q->where('category_id', $request->query('category_id')));
        }

        switch ($request->query('filter')) {
            case 'low':
                $query->whereRaw('qty_on_hand > 0 AND qty_on_hand <= reorder_level');
                break;
            case 'out_of_stock':
                $query->where('qty_on_hand', '<=', 0);
                break;
        }

        $sortColumn = in_array($request->query('sort'), ['qty_on_hand', 'reorder_level']) ? $request->query('sort') : 'qty_on_hand';
        $sortDir = $request->query('sort_dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortColumn, $sortDir);

        $perPage = min((int) $request->query('per_page', 25), 100);

        $paginated = $query->paginate($perPage);

        $summary = [
            'total'        => Inventory::count(),
            'low_stock'    => Inventory::whereRaw('qty_on_hand > 0 AND qty_on_hand <= reorder_level')->count(),
            'out_of_stock' => Inventory::where('qty_on_hand', '<=', 0)->count(),
        ];

        return response()->json(array_merge($paginated->toArray(), ['summary' => $summary]));
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
                'staff_id' => auth()->id(),
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
