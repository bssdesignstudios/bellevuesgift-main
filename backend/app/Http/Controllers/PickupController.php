<?php
/**
 * Role: Builder
 * Rationale: Handle order pickup verification and collection with row locking.
 */

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PickupController extends Controller
{
    /**
     * Verify or collect payment for a pickup order.
     * 
     * POST /api/pickup/verify
     * Input: { pickup_code, action: 'verify' | 'collect_payment_and_verify' }
     */
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'pickup_code' => 'required|string',
            'action' => 'required|in:verify,collect_payment_and_verify',
            'payment_method' => 'required_if:action,collect_payment_and_verify|string|nullable',
            'staff_id' => 'nullable|uuid',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            // Lock order row to prevent concurrent pickup
            $order = Order::where('pickup_code', strtoupper($validated['pickup_code']))
                ->lockForUpdate()
                ->first();

            if (!$order) {
                throw ValidationException::withMessages([
                    'pickup_code' => 'Order not found with this pickup code'
                ]);
            }

            // Check if already picked up
            if ($order->status === 'completed' && $order->picked_up_at) {
                throw ValidationException::withMessages([
                    'pickup_code' => 'This order has already been picked up'
                ]);
            }

            // Check if order is in valid state for pickup
            if (!in_array($order->status, ['ready_for_pickup', 'pending', 'processing'])) {
                throw ValidationException::withMessages([
                    'pickup_code' => "Order is not ready for pickup. Current status: {$order->status}"
                ]);
            }

            // If action is collect_payment_and_verify, handle pay_later orders
            if ($validated['action'] === 'collect_payment_and_verify') {
                if ($order->payment_status === 'paid') {
                    throw ValidationException::withMessages([
                        'action' => 'This order is already paid. Use action=verify instead.'
                    ]);
                }

                if ($order->payment_status !== 'pending') {
                    throw ValidationException::withMessages([
                        'action' => "Cannot collect payment for order with status: {$order->payment_status}"
                    ]);
                }

                // Create payment record
                Payment::create([
                    'order_id' => $order->id,
                    'method' => $validated['payment_method'] ?? 'cash',
                    'amount' => $order->total,
                    'reference' => 'PICKUP-' . time(),
                ]);

                // Update payment status
                $order->payment_status = 'paid';
                $order->payment_method = $validated['payment_method'] ?? 'cash';
            } elseif ($validated['action'] === 'verify') {
                // For regular verify, order must be paid already
                if ($order->payment_status !== 'paid') {
                    throw ValidationException::withMessages([
                        'action' => 'Order is not paid. Use action=collect_payment_and_verify to collect payment.'
                    ]);
                }
            }

            // Mark as picked up
            $order->status = 'completed';
            $order->picked_up_at = now();
            $order->picked_up_by = $validated['staff_id'] ?? $request->user()?->id;
            $order->save();

            return response()->json([
                'success' => true,
                'message' => $validated['action'] === 'collect_payment_and_verify'
                    ? 'Payment collected and order marked as picked up'
                    : 'Order marked as picked up',
                'order' => $order->load('items', 'payments'),
            ]);
        });
    }

    /**
     * Search for an order by pickup code (read-only, no lock).
     * 
     * GET /api/pickup/search?code=XXX
     */
    public function search(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $order = Order::where('pickup_code', strtoupper($validated['code']))
            ->with('items', 'payments')
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        return response()->json([
            'order' => $order,
            'is_paid' => $order->payment_status === 'paid',
            'is_picked_up' => $order->picked_up_at !== null,
            'can_pickup' => in_array($order->status, ['ready_for_pickup', 'pending', 'processing']) && !$order->picked_up_at,
            'needs_payment' => $order->payment_status === 'pending',
        ]);
    }
}
