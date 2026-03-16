<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\GiftCard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerAccountController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Get customer ID from customers table linked by email
        $customer = DB::table('customers')->where('email', $user->email)->first();
        $customerId = $customer ? $customer->id : null;

        $stats = [
            'orders' => $customerId ? Order::where('customer_id', $customerId)->count() : 0,
            'wishlist' => 0, // Wishlist table not fully implemented yet in MySQL
            'addresses' => 0, // Customer addresses not fully implemented yet in MySQL
            'gift_cards' => $customerId ? GiftCard::where('customer_id', $customerId)->where('is_active', true)->count() : 0,
            'gift_card_balance' => $customerId ? GiftCard::where('customer_id', $customerId)->where('is_active', true)->sum('balance') : 0,
        ];

        $latestOrder = $customerId ? Order::where('customer_id', $customerId)
            ->orderBy('created_at', 'desc')
            ->first() : null;

        return response()->json([
            'stats' => $stats,
            'latest_order' => $latestOrder,
            'customer_id' => $customerId
        ]);
    }

    public function orders(Request $request)
    {
        $user = $request->user();
        $customer = DB::table('customers')->where('email', $user->email)->first();
        
        if (!$customer) {
            return response()->json([]);
        }

        $orders = Order::where('customer_id', $customer->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($orders);
    }

    public function giftCards(Request $request)
    {
        $user = $request->user();
        $customer = DB::table('customers')->where('email', $user->email)->first();
        
        if (!$customer) {
            return response()->json([]);
        }

        $giftCards = GiftCard::where('customer_id', $customer->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($giftCards);
    }

    public function orderDetail(Request $request, $orderNumber)
    {
        $user = $request->user();
        $customer = DB::table('customers')->where('email', $user->email)->first();
        
        if (!$customer) {
            return response()->json(['message' => 'Customer not found'], 404);
        }

        $order = Order::with(['orderItems'])
            ->where('order_number', $orderNumber)
            ->where('customer_id', $customer->id)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        return response()->json($order);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password'      => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!\Illuminate\Support\Facades\Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->update(['password' => \Illuminate\Support\Facades\Hash::make($request->password)]);

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function trackOrder(Request $request)
    {
        $q = trim($request->input('q', ''));
        if (!$q) {
            return response()->json(null);
        }

        $order = \App\Models\Order::where('order_number', strtoupper($q))
            ->orWhere('pickup_code', strtoupper($q))
            ->first();

        return response()->json($order);
    }
}
