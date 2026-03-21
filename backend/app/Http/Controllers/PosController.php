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
use App\Models\Product;
use App\Models\Register;
use App\Models\RegisterSession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosController extends Controller
{
    public function getRegisters(Request $request)
    {
        $user = $request->user();
        $query = Register::where('is_active', true);

        // Admins see all registers; other roles only see assigned ones
        if ($user && $user->role !== 'admin') {
            $query->whereHas('assignedStaff', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            });
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function getCurrentSession(Request $request)
    {
        $validated = $request->validate([
            'register_id' => 'required|uuid|exists:registers,id',
            'staff_id' => 'required|uuid|exists:staff,id',
        ]);

        $session = RegisterSession::where('register_id', $validated['register_id'])
            ->where('staff_id', $validated['staff_id'])
            ->whereNull('closed_at')
            ->orderBy('opened_at', 'desc')
            ->first();

        return response()->json($session);
    }

    public function openSession(Request $request)
    {
        $validated = $request->validate([
            'register_id' => 'required|uuid|exists:registers,id',
            'staff_id' => 'required|uuid|exists:staff,id',
            'opening_balance' => 'required|numeric|min:0',
        ]);

        $session = RegisterSession::create([
            'register_id' => $validated['register_id'],
            'staff_id' => $validated['staff_id'],
            'opening_balance' => $validated['opening_balance'],
            'opened_at' => Carbon::now(),
        ]);

        PosActivityLog::create([
            'register_id' => $validated['register_id'],
            'staff_id' => $validated['staff_id'],
            'action' => 'session_open',
            'details' => ['opening_balance' => $validated['opening_balance']],
        ]);

        return response()->json($session, 201);
    }

    public function closeSession(Request $request, RegisterSession $session)
    {
        $validated = $request->validate([
            'closing_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $notes = $validated['notes'] ?? null;

        // Calculate expected balance
        $cashSales = Order::where('register_id', $session->register_id)
            ->where('payment_status', 'paid')
            ->where('payment_method', 'cash')
            ->where('created_at', '>=', $session->opened_at)
            ->sum('total');

        $expectedBalance = (float) $session->opening_balance + $cashSales;

        $session->update([
            'closed_at' => Carbon::now(),
            'closing_balance' => $validated['closing_balance'],
            'expected_balance' => $expectedBalance,
            'notes' => $notes,
        ]);

        PosActivityLog::create([
            'register_id' => $session->register_id,
            'staff_id' => $session->staff_id,
            'action' => 'session_close',
            'details' => [
                'closing_balance' => $validated['closing_balance'],
                'expected_balance' => $expectedBalance,
                'variance' => $validated['closing_balance'] - $expectedBalance,
                'notes' => $notes,
            ],
        ]);

        return response()->json($session);
    }

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
}
