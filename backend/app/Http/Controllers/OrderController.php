<?php
/**
 * Role: Builder
 * Rationale: Handle Orders and POS transactions in the Laravel backend.
 * Idempotency: Uses client_txn_id unique constraint + pre-check + catch on race.
 */

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Inventory;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Database\UniqueConstraintViolationException;

class OrderController extends Controller
{
    /**
     * List orders (admin/finance).
     */
    public function index(Request $request)
    {
        $orders = Order::with('items')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($orders);
    }

    /**
     * POS Checkout — create order with full idempotency.
     *
     * If client_txn_id is provided:
     *   1. Pre-check: return existing order immediately if found
     *   2. Race guard: catch UniqueConstraintViolation and return existing
     * This guarantees exactly-once semantics for offline sync replays.
     */
    public function checkout(Request $request)
    {
        $validated = $request->validate([
            'channel' => 'required|in:pos,online',
            'payment_method' => 'required|string',
            'fulfillment_method' => 'required|string',
            'customer_id' => 'nullable|string',
            'staff_id' => 'required|string|exists:staff,id',
            'register_id' => 'nullable|string',
            'subtotal' => 'required|numeric',
            'discount_amount' => 'nullable|numeric',
            'vat_amount' => 'required|numeric',
            'total' => 'required|numeric',
            'notes' => 'nullable|string',
            'client_txn_id' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|string|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric',
            'items.*.line_total' => 'required|numeric',
        ]);

        // ── Idempotency pre-check ──────────────────────────────────
        if (!empty($validated['client_txn_id'])) {
            $existing = Order::where('client_txn_id', $validated['client_txn_id'])->first();
            if ($existing) {
                return response()->json([
                    'order' => $existing->load('items'),
                    'idempotent' => true,
                ], 200);
            }
        }

        // ── Create order inside transaction ────────────────────────
        try {
            $order = DB::transaction(function () use ($validated, $request) {
                $orderNumber = 'ORD-' . strtoupper(Str::random(8));

                $pickupCode = $validated['fulfillment_method'] === 'pickup'
                    ? strtoupper(Str::random(6))
                    : null;

                $order = Order::create([
                    'order_number' => $orderNumber,
                    'channel' => $validated['channel'],
                    'status' => $validated['fulfillment_method'] === 'pickup' ? 'ready_for_pickup' : 'completed',
                    'payment_status' => $validated['payment_method'] === 'pay_later' ? 'pending' : 'paid',
                    'payment_method' => $validated['payment_method'],
                    'fulfillment_method' => $validated['fulfillment_method'],
                    'customer_id' => $validated['customer_id'] ?? null,
                    'staff_id' => $validated['staff_id'],
                    'register_id' => $validated['register_id'] ?? null,
                    'subtotal' => $validated['subtotal'],
                    'discount_amount' => $validated['discount_amount'] ?? 0,
                    'vat_amount' => $validated['vat_amount'],
                    'total' => $validated['total'],
                    'notes' => $validated['notes'] ?? null,
                    'client_txn_id' => $validated['client_txn_id'] ?? null,
                    'pickup_code' => $pickupCode,
                ]);

                foreach ($validated['items'] as $itemData) {
                    $product = \App\Models\Product::find($itemData['product_id']);

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $itemData['product_id'],
                        'sku' => $product->sku ?? 'UNKNOWN',
                        'name' => $product->name ?? 'Unknown Product',
                        'qty' => $itemData['qty'],
                        'unit_price' => $itemData['unit_price'],
                        'line_total' => $itemData['line_total'],
                    ]);

                    // Update inventory
                    $inventory = Inventory::where('product_id', $itemData['product_id'])
                        ->lockForUpdate()
                        ->first();
                    if ($inventory) {
                        $inventory->decrement('qty_on_hand', $itemData['qty']);
                    }

                    // Special handling for Gift Card products
                    if ($product && str_starts_with($product->sku, 'GC-BEL-')) {
                        $value = (float) substr($product->sku, strrpos($product->sku, '-') + 1);
                        if ($value > 0) {
                            for ($i = 0; $i < $itemData['qty']; $i++) {
                                $code = 'BEL-' . strtoupper(Str::random(6)) . '-' . strtoupper(Str::random(3));
                                \App\Models\GiftCard::create([
                                    'code' => $code,
                                    'initial_balance' => $value,
                                    'balance' => $value,
                                    'is_active' => true,
                                ]);
                            }
                        }
                    }
                }

                if ($validated['payment_method'] !== 'pay_later') {
                    Payment::create([
                        'order_id' => $order->id,
                        'method' => $validated['payment_method'],
                        'amount' => $validated['total'],
                        'reference' => 'POS-' . time(),
                    ]);

                    // Deduct gift card if used (ledger-based with row locking)
                    if ($validated['payment_method'] === 'gift_card' && $request->has('gift_card_code')) {
                        \App\Models\GiftCard::redeem(
                            $request->gift_card_code,
                            $validated['total'],
                            $order->id,
                            $validated['staff_id'],
                            ['reference' => $order->order_number]
                        );
                    }
                }

                return $order;
            });

            return response()->json([
                'order' => $order->load('items'),
                'idempotent' => false,
            ], 201);

        } catch (UniqueConstraintViolationException $e) {
            // ── Race condition guard ───────────────────────────────
            // Two concurrent requests with the same client_txn_id:
            // the DB unique constraint caught the duplicate. Return existing.
            if (!empty($validated['client_txn_id'])) {
                $existing = Order::where('client_txn_id', $validated['client_txn_id'])->first();
                if ($existing) {
                    return response()->json([
                        'order' => $existing->load('items'),
                        'idempotent' => true,
                    ], 200);
                }
            }
            // If we get here, the unique violation was on something else
            throw $e;
        }
    }
}
