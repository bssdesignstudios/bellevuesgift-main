<?php
/**
 * Role: Builder
 * Rationale: Handle POS refund operations server-side with transaction safety.
 */

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RefundController extends Controller
{
    /**
     * Search for an order by order number (for refund lookup).
     *
     * GET /api/pos/refund/search?order_number=XXX
     */
    public function search(Request $request)
    {
        $validated = $request->validate([
            'order_number' => 'required|string',
        ]);

        $order = Order::where('order_number', strtoupper($validated['order_number']))
            ->with('items', 'payments')
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        return response()->json([
            'order' => $order,
            'can_refund' => !in_array($order->status, ['refunded', 'cancelled']),
            'is_refunded' => $order->status === 'refunded',
        ]);
    }

    /**
     * Process a refund for an order.
     * Uses DB::transaction with lockForUpdate to prevent concurrent refunds.
     *
     * POST /api/pos/refund
     */
    public function process(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|uuid|exists:orders,id',
            'staff_id' => 'required|uuid',
            'reason' => 'nullable|string',
            'refund_items' => 'nullable|array',
            'refund_items.*.product_id' => 'uuid',
            'refund_items.*.qty' => 'integer|min:1',
        ]);

        return DB::transaction(function () use ($validated) {
            // Lock the order row
            $order = Order::where('id', $validated['order_id'])
                ->lockForUpdate()
                ->first();

            if (!$order) {
                throw ValidationException::withMessages([
                    'order_id' => 'Order not found'
                ]);
            }

            // Prevent double-refund
            if ($order->status === 'refunded') {
                throw ValidationException::withMessages([
                    'order_id' => 'This order has already been refunded'
                ]);
            }

            if ($order->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'order_id' => 'Cannot refund a cancelled order'
                ]);
            }

            // Mark order as refunded
            $order->status = 'refunded';
            $order->payment_status = 'refunded';
            $order->save();

            // Create negative payment record for the refund
            Payment::create([
                'order_id' => $order->id,
                'method' => $order->payment_method ?? 'cash',
                'amount' => -abs($order->total),
                'reference' => 'REFUND-' . time(),
            ]);

            // Return inventory for refunded items
            $itemsToRestore = $validated['refund_items'] ?? null;
            $restoredItems = [];

            if ($itemsToRestore) {
                // Partial refund: restore only specified items
                foreach ($itemsToRestore as $refundItem) {
                    $inventory = Inventory::where('product_id', $refundItem['product_id'])->first();
                    if ($inventory) {
                        $inventory->increment('qty_on_hand', $refundItem['qty']);
                        $restoredItems[] = [
                            'product_id' => $refundItem['product_id'],
                            'qty_restored' => $refundItem['qty'],
                        ];
                    }
                }
            } else {
                // Full refund: restore all order items
                foreach ($order->items as $item) {
                    $inventory = Inventory::where('product_id', $item->product_id)->first();
                    if ($inventory) {
                        $inventory->increment('qty_on_hand', $item->qty);
                        $restoredItems[] = [
                            'product_id' => $item->product_id,
                            'qty_restored' => $item->qty,
                        ];
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Order refunded successfully',
                'order' => $order->fresh()->load('items', 'payments'),
                'restored_items' => $restoredItems,
            ]);
        });
    }
}
