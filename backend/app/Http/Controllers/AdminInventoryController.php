<?php
/**
 * Role: Builder
 * Rationale: Handle Inventory management — stock levels, adjustments, movements, receiving, reorder.
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

    /**
     * Stock movement history — paginated, filterable, with product + staff.
     */
    public function movements(Request $request)
    {
        $query = InventoryAdjustment::with(['product:id,name,sku,barcode', 'staff:id,name'])
            ->orderBy('created_at', 'desc');

        // Filter by product
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Filter by adjustment type
        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('adjustment_type', $request->type);
        }

        // Search by product name, SKU, barcode, or batch ID in notes
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($outer) use ($search) {
                $outer->whereHas('product', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                })->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $limit = min((int) $request->query('limit', 100), 500);
        $movements = $query->limit($limit)->get()->map(function ($adj) {
            return [
                'id' => $adj->id,
                'product_name' => $adj->product->name ?? 'Unknown',
                'sku' => $adj->product->sku ?? '',
                'barcode' => $adj->product->barcode ?? '',
                'adjustment_type' => $adj->adjustment_type,
                'qty_change' => $adj->qty_change,
                'old_qty' => $adj->old_qty,
                'new_qty' => $adj->new_qty,
                'notes' => $adj->notes,
                'staff_name' => $adj->staff->name ?? null,
                'created_at' => $adj->created_at->toISOString(),
            ];
        });

        return response()->json($movements);
    }

    /**
     * Reorder list — items at or below reorder level, sorted by urgency.
     */
    public function reorder(Request $request)
    {
        $query = Inventory::with(['product', 'product.category', 'product.vendor'])
            ->where(function ($q) {
                $q->where('qty_on_hand', '<=', 0)
                    ->orWhereColumn('qty_on_hand', '<=', 'reorder_level');
            })
            ->orderBy('qty_on_hand');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        $items = $query->get()->map(function ($inv) {
            $deficit = max(0, $inv->reorder_level - $inv->qty_on_hand);
            return [
                'id' => $inv->id,
                'product_id' => $inv->product_id,
                'product_name' => $inv->product->name ?? 'Unknown',
                'sku' => $inv->product->sku ?? '',
                'barcode' => $inv->product->barcode ?? '',
                'category' => $inv->product->category->name ?? 'Uncategorized',
                'vendor' => $inv->product->vendor->name ?? null,
                'qty_on_hand' => $inv->qty_on_hand,
                'reorder_level' => $inv->reorder_level,
                'deficit' => $deficit,
                'is_out' => $inv->qty_on_hand <= 0,
            ];
        });

        return response()->json($items);
    }

    /**
     * Batch receive — receive multiple products at once.
     */
    public function batchReceive(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.inventory_id' => 'required|exists:inventory,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string',
            'batch_notes' => 'nullable|string',
        ]);

        $staffId = Staff::where('user_id', auth()->id())->value('id');
        $batchNote = $validated['batch_notes'] ?? null;
        $batchId = 'RCV-' . now()->format('Ymd-His') . '-' . strtoupper(substr(md5(uniqid()), 0, 4));
        $results = [];

        DB::transaction(function () use ($validated, $staffId, $batchNote, $batchId, &$results) {
            foreach ($validated['items'] as $entry) {
                $inventory = Inventory::lockForUpdate()->findOrFail($entry['inventory_id']);
                $oldQty = $inventory->qty_on_hand;
                $inventory->qty_on_hand += $entry['qty'];
                $inventory->save();

                $note = "[{$batchId}]";
                if ($batchNote) {
                    $note .= " {$batchNote}";
                }
                if (!empty($entry['notes'])) {
                    $note .= " — {$entry['notes']}";
                }

                InventoryAdjustment::create([
                    'product_id' => $inventory->product_id,
                    'adjustment_type' => 'receive',
                    'qty_change' => $entry['qty'],
                    'old_qty' => $oldQty,
                    'new_qty' => $inventory->qty_on_hand,
                    'notes' => $note,
                    'staff_id' => $staffId,
                ]);

                $results[] = [
                    'inventory_id' => $inventory->id,
                    'product_id' => $inventory->product_id,
                    'old_qty' => $oldQty,
                    'new_qty' => $inventory->qty_on_hand,
                    'received' => $entry['qty'],
                ];
            }
        });

        return response()->json([
            'message' => count($results) . ' item(s) received',
            'batch_id' => $batchId,
            'results' => $results,
        ]);
    }

    public function adjust(Request $request, Inventory $inventory)
    {
        $validated = $request->validate([
            'adjustment_type' => 'required|in:receive,damage,shrink,count,sale,refund,reserve,unreserve',
            'qty_change' => 'required|integer',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $inventory) {
            // Reload with a SELECT … FOR UPDATE lock to prevent concurrent adjustment races
            $inventory = Inventory::lockForUpdate()->findOrFail($inventory->id);

            $oldQty = $inventory->qty_on_hand;

            // Update inventory
            if (in_array($validated['adjustment_type'], ['reserve', 'unreserve'])) {
                $inventory->qty_reserved += $validated['qty_change'];
                $newQty = $inventory->qty_on_hand;
            } else {
                $inventory->qty_on_hand += $validated['qty_change'];
                // Prevent negative stock
                if ($inventory->qty_on_hand < 0) {
                    $inventory->qty_on_hand = 0;
                }
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
                    'staff_id'        => Staff::where('user_id', auth()->id())->value('id'),
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
