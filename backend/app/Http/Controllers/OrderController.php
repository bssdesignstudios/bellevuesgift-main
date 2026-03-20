<?php
/**
 * Role: Builder
 * Rationale: Handle Orders and POS transactions in the Laravel backend.
 */

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Inventory;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function checkout(Request $request)
    {
        $validated = $request->validate([
            'channel' => 'required|in:pos,online',
            'payment_method' => 'required|string',
            'fulfillment_method' => 'required|string',
            'customer_id' => 'nullable',
            'staff_id' => 'required',
            'register_id' => 'nullable',
            'subtotal' => 'required|numeric',
            'discount_amount' => 'nullable|numeric',
            'vat_amount' => 'required|numeric',
            'total' => 'required|numeric',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric',
            'items.*.line_total' => 'required|numeric',
        ]);

        try {
        return DB::transaction(function () use ($validated, $request) {
            // Generate order number (simple version for now)
            $orderNumber = 'ORD-' . strtoupper(Str::random(8));

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
                $inventory = Inventory::where('product_id', $itemData['product_id'])->first();
                if ($inventory) {
                    $inventory->decrement('qty_on_hand', $itemData['qty']);
                    if ($validated['fulfillment_method'] === 'pickup') {
                        $inventory->increment('qty_reserved', $itemData['qty']);
                    }
                }

                // Special handling for Gift Card products: Create the actual gift card
                $product = \App\Models\Product::find($itemData['product_id']);
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
                                'notes' => "Purchased via Order {$orderNumber}"
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

                // Deduct gift card if used
                if ($validated['payment_method'] === 'gift_card' && $request->has('gift_card_code')) {
                    $gc = \App\Models\GiftCard::where('code', strtoupper($request->gift_card_code))->first();
                    if ($gc) {
                        $gc->decrement('balance', $validated['total']);
                    }
                }
            }

            return response()->json($order->load('items'), 201);
        });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Checkout error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'validated' => $validated,
            ]);
            return response()->json([
                'message' => 'Checkout failed',
                'error' => $e->getMessage(),
                'line' => $e->getFile() . ':' . $e->getLine(),
            ], 500);
        }
    }

    public function lookup(Request $request)
    {
        $search = strtoupper(trim($request->input('q', '')));
        if (!$search) {
            return response()->json(['order' => null]);
        }

        $order = Order::with(['items', 'customer'])
            ->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('pickup_code', $search);
            })
            ->orderByDesc('created_at')
            ->first();

        return response()->json(['order' => $order]);
    }

    public function markPickedUp($id)
    {
        return DB::transaction(function () use ($id) {
            $order = Order::with('items')->findOrFail($id);
            $order->update(['status' => 'picked_up']);

            foreach ($order->items as $item) {
                if ($item->product_id) {
                    $inv = Inventory::where('product_id', $item->product_id)->first();
                    if ($inv) {
                        // Stock was already deducted from qty_on_hand during checkout
                        // Just clear it from reserved now
                        $inv->update(['qty_reserved' => max(0, $inv->qty_reserved - $item->qty)]);
                    }
                }
            }

            return response()->json(['message' => 'Order marked as picked up']);
        });
    }

    public function collectPayment(Request $request, $id)
    {
        $validated = $request->validate([
            'method' => 'required|in:cash,card',
            'amount' => 'required|numeric|min:0',
        ]);

        $order = Order::findOrFail($id);

        Payment::create([
            'order_id' => $order->id,
            'amount' => $validated['amount'],
            'method' => $validated['method'],
            'reference' => 'PICKUP-' . time(),
        ]);

        $order->update([
            'payment_status' => 'paid',
            'payment_method' => $validated['method'],
        ]);

        return response()->json(['message' => 'Payment collected']);
    }

    public function refund($id)
    {
        return DB::transaction(function () use ($id) {
            $order = Order::with('items')->findOrFail($id);

            $order->update([
                'status' => 'refunded',
                'payment_status' => 'refunded',
            ]);

            Payment::create([
                'order_id' => $order->id,
                'amount' => -$order->total,
                'method' => $order->payment_method ?? 'cash',
                'reference' => 'REFUND-' . time(),
            ]);

            foreach ($order->items as $item) {
                if ($item->product_id) {
                    $inv = Inventory::where('product_id', $item->product_id)->first();
                    if ($inv) {
                        $inv->increment('qty_on_hand', $item->qty);
                        // If it was a pickup that hadn't been picked up yet, decrement reserved
                        if ($order->fulfillment_method === 'pickup' && $order->status !== 'picked_up') {
                            $inv->update(['qty_reserved' => max(0, $inv->qty_reserved - $item->qty)]);
                        }
                    }
                }
            }

            return response()->json(['message' => 'Refund processed']);
        });
    }
}
