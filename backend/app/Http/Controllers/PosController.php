<?php

/**
 * Role: Builder
 * Rationale: Handle POS-related logic in the Laravel backend.
 */

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\GiftCard;
use App\Models\Order;
use App\Models\PosActivityLog;
use App\Models\PosCashierLog;
use App\Models\PosRefundApproval;
use App\Models\Product;
use App\Models\Register;
use App\Models\RegisterSession;
use App\Models\Staff;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class PosController extends Controller
{
    public function getRegisters(Request $request)
    {
        $user = $request->user();
        $query = Register::where('is_active', true);

        // Admins see all registers; other roles only see assigned ones
        if ($user && !in_array($user->role, ['admin', 'super_admin'])) {
            $query->whereHas('assignedStaff', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            });
        }

        $registers = $query->orderBy('name')->get();

        $registers->each(function ($register) {
            $register->current_session = RegisterSession::where('register_id', $register->id)
                ->where(function ($q) {
                    $q->where('status', 'open')->orWhereNull('status');
                })
                ->whereNull('closed_at')
                ->with('staff')
                ->first();
        });

        return response()->json($registers);
    }

    public function getCurrentSession(Request $request)
    {
        $validated = $request->validate([
            'register_id' => 'required|uuid|exists:registers,id',
        ]);

        $session = RegisterSession::where('register_id', $validated['register_id'])
            ->where(function ($q) {
                // Handle cases where status column might not exist yet if migration is lagging
                // though it shouldn't in this new implementation.
                $q->where('status', 'open')->orWhereNull('status');
            })
            ->whereNull('closed_at')
            ->orderBy('opened_at', 'desc')
            ->first();

        if ($session) {
            $session->load('staff');
        }

        return response()->json($session);
    }

    /**
     * Start of Day: cashier opens register with float.
     */
    public function openSession(Request $request)
    {
        $validated = $request->validate([
            'register_id' => 'required|uuid|exists:registers,id',
            'staff_id' => 'required|uuid|exists:staff,id',
            'opening_balance' => 'required|numeric|min:0',
        ]);

        // Prevention: do not allow multiple open sessions for same register
        $existing = RegisterSession::where('register_id', $validated['register_id'])
            ->where(function ($q) {
                $q->where('status', 'open')->orWhereNull('status');
            })
            ->whereNull('closed_at')
            ->exists();

        if ($existing) {
            return response()->json(['message' => 'Register already has an open session.'], 400);
        }

        return DB::transaction(function () use ($validated, $request) {
            $session = RegisterSession::create([
                'register_id' => $validated['register_id'],
                'staff_id' => $validated['staff_id'],
                'opening_balance' => $validated['opening_balance'],
                'opened_at' => Carbon::now(),
                'status' => 'open',
            ]);

            PosCashierLog::create([
                'register_session_id' => $session->id,
                'user_id' => $request->user()->id,
                'action' => 'login', // Initial login
                'acted_at' => Carbon::now(),
            ]);

            PosActivityLog::create([
                'register_id' => $validated['register_id'],
                'staff_id' => $validated['staff_id'],
                'action' => 'session_open',
                'details' => ['opening_balance' => $validated['opening_balance']],
            ]);

            return response()->json($session, 201);
        });
    }

    /**
     * Mid-Day: Second cashier joins existing open session.
     */
    public function joinSession(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|uuid|exists:register_sessions,id',
            'staff_id' => 'required|uuid|exists:staff,id',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $session = RegisterSession::findOrFail($validated['session_id']);

            if ($session->closed_at || $session->status === 'closed') {
                return response()->json(['message' => 'This session is closed.'], 400);
            }

            // Update session current staff
            $session->update(['staff_id' => $validated['staff_id']]);

            PosCashierLog::create([
                'register_session_id' => $session->id,
                'user_id' => $request->user()->id,
                'action' => 'switch_in',
                'acted_at' => Carbon::now(),
            ]);

            return response()->json($session);
        });
    }

    /**
     * Break / Switch Cashier: Logout without closing register.
     */
    public function switchCashier(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|uuid|exists:register_sessions,id',
        ]);

        PosCashierLog::create([
            'register_session_id' => $validated['session_id'],
            'user_id' => $request->user()->id,
            'action' => 'switch_out',
            'acted_at' => Carbon::now(),
        ]);

        return response()->json(['message' => 'Cashier successfully switched out. Session remains open.']);
    }

    /**
     * End-of-Day Closeout: Only Admin PIN allowed.
     */
    public function closeRegister(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|uuid|exists:register_sessions,id',
            'admin_pin' => 'required|string',
            'closing_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        // Verify Admin PIN
        $admin = User::where('role', 'admin')->get()->first(function ($user) use ($validated) {
            // Assuming we use standard PIN verification or password fallback
            return $user->pos_pin === $validated['admin_pin'];
        });

        if (!$admin) {
             // Second attempt: check if PIN belongs to any user with admin role
             // (Some users might be managers with admin-level POS rights)
             $admin = User::where('pos_pin', $validated['admin_pin'])
                ->whereIn('role', ['admin', 'manager', 'super_admin'])
                ->first();
        }

        if (!$admin) {
            return response()->json(['message' => 'Invalid Admin PIN.'], 403);
        }

        return DB::transaction(function () use ($validated, $admin) {
            $session = RegisterSession::findOrFail($validated['session_id']);

            // Calculate expected balance
            $cashSales = Order::where('register_id', $session->register_id)
                ->where('payment_status', 'paid')
                ->where('payment_method', 'cash')
                ->where('created_at', '>=', $session->opened_at)
                ->sum('total');

            $expectedBalance = (float) $session->opening_balance + $cashSales;
            $variance = $validated['closing_balance'] - $expectedBalance;

            $session->update([
                'closed_at' => Carbon::now(),
                'closing_balance' => $validated['closing_balance'],
                'expected_balance' => $expectedBalance,
                'variance' => $variance,
                'status' => 'closed',
                'closed_by_user_id' => $admin->id,
                'notes' => $validated['notes'] ?? null,
            ]);

            PosActivityLog::create([
                'register_id' => $session->register_id,
                'staff_id' => $session->staff_id,
                'action' => 'session_close',
                'details' => [
                    'closing_balance' => $validated['closing_balance'],
                    'expected_balance' => $expectedBalance,
                    'variance' => $variance,
                    'admin_id' => $admin->id,
                ],
            ]);

            return response()->json($session);
        });
    }

    /**
     * Shift Summary: Get stats for a specific session.
     */
    public function shiftSummary(RegisterSession $session)
    {
        $orders = Order::where('register_id', $session->register_id)
            ->where('payment_status', 'paid')
            ->where('created_at', '>=', $session->opened_at)
            ->when($session->closed_at, fn ($q) => $q->where('created_at', '<=', $session->closed_at))
            ->get();

        $totalSales = $orders->sum('total');
        $orderCount = $orders->count();

        $cashSales = $orders->where('payment_method', 'cash')->sum('total');
        $cardSales = $orders->where('payment_method', 'card')->sum('total');
        $giftCardSales = $orders->where('payment_method', 'gift_card')->sum('total');

        $expectedCash = (float) $session->opening_balance + $cashSales;

        return response()->json([
            'session_id' => $session->id,
            'opened_at' => $session->opened_at,
            'opening_balance' => (float) $session->opening_balance,
            'total_sales' => (float) $totalSales,
            'order_count' => $orderCount,
            'cash_sales' => (float) $cashSales,
            'card_sales' => (float) $cardSales,
            'gift_card_sales' => (float) $giftCardSales,
            'expected_cash' => $expectedCash,
        ]);
    }

    public function logActivity(Request $request)
    {
        $validated = $request->validate([
            'register_id' => 'required|uuid|exists:registers,id',
            'staff_id' => 'required|uuid|exists:staff,id',
            'action' => 'required|string',
            'details' => 'nullable|array',
        ]);

        $log = PosActivityLog::create($validated);

        return response()->json($log, 201);
    }

    public function getCategories(Request $request): JsonResponse
    {
        $categories = Category::where('is_active', true)->orderBy('sort_order')->get();

        return response()->json($categories);
    }

    public function getProducts(Request $request): JsonResponse
    {
        $query = Product::with('inventory')->where('is_active', true);

        if ($request->has('category_id') && $request->input('category_id') !== 'all') {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', '=', $search);
            });
        }

        $products = $query->orderBy('name')->limit(50)->get();

        return response()->json($products);
    }

    public function checkGiftCard(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $giftCard = GiftCard::where('code', strtoupper($request->input('code')))
            ->where('is_active', true)
            ->first();

        if (! $giftCard) {
            return response()->json(['message' => 'Invalid gift card'], 404);
        }

        return response()->json([
            'balance' => $giftCard->balance,
            'code' => $giftCard->code,
        ]);
    }

    /**
     * Secures and processes a POS refund via Admin PIN authorization.
     */
    public function approveRefund(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'admin_pin' => 'required|string',
            'session_id' => 'required|exists:register_sessions,id',
            'cashier_id' => 'required|exists:users,id',
            'amount' => 'required|numeric',
            'reason' => 'nullable|string',
        ]);

        $admin = User::where('pos_pin', $validated['admin_pin'])
            ->whereIn('role', ['admin', 'manager', 'owner'])
            ->first();

        if (!$admin) {
            return response()->json(['message' => 'Invalid or unauthorized Admin PIN'], 403);
        }

        return DB::transaction(function () use ($validated, $admin) {
            $order = \App\Models\Order::with('items')->findOrFail($validated['order_id']);

            if ($order->status === 'refunded') {
                return response()->json(['message' => 'Order already refunded'], 422);
            }

            // 1. Log the approval for audit
            PosRefundApproval::create([
                'order_id' => $validated['order_id'],
                'admin_user_id' => $admin->id,
                'cashier_user_id' => $validated['cashier_id'],
                'register_session_id' => $validated['session_id'],
                'amount' => $validated['amount'],
                'reason' => $validated['reason'] ?? 'POS Refund',
            ]);

            // 2. Process the refund on the order
            $order->update([
                'status' => 'refunded',
                'payment_status' => 'refunded',
            ]);

            // 3. Create negative payment recording
            \App\Models\Payment::create([
                'order_id' => $order->id,
                'amount' => -$order->total,
                'method' => $order->payment_method ?? 'cash',
                'reference' => 'POS-REFUND-' . time() . '-AUTH-' . $admin->id,
            ]);

            // 4. Restore Inventory
            foreach ($order->items as $item) {
                if ($item->product_id) {
                    $inv = \App\Models\Inventory::where('product_id', $item->product_id)->first();
                    if ($inv) {
                        $inv->increment('qty_on_hand', $item->qty);
                        if ($order->fulfillment_method === 'pickup' && $order->status !== 'picked_up') {
                            $inv->update(['qty_reserved' => max(0, $inv->qty_reserved - $item->qty)]);
                        }
                    }
                }
            }

            return response()->json([
                'message' => 'Refund successfully approved and processed',
                'refund_id' => $order->id
            ]);
        });
    }
}
