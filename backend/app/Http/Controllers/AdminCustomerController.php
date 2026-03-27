<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class AdminCustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::withCount('orders')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('tier') && $request->tier !== 'all') {
            $query->where('customer_tier', $request->tier);
        }

        $customers = $query->limit(500)->get();

        return response()->json($customers);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'email'        => 'nullable|email|max:255|unique:customers,email',
            'phone'        => 'nullable|string|max:50',
            'account_type' => 'nullable|in:personal,business',
            'address'      => 'nullable|string|max:500',
            'island'       => 'nullable|string|max:100',
        ]);

        $customer = Customer::create([
            'name'         => $validated['name'],
            'email'        => $validated['email'] ?? null,
            'phone'        => $validated['phone'] ?? null,
            'account_type' => $validated['account_type'] ?? 'personal',
            'customer_tier'=> 'retail',
            'address'      => $validated['address'] ?? null,
            'island'       => $validated['island'] ?? null,
        ]);

        return response()->json($customer, 201);
    }

    public function show(Customer $customer)
    {
        $customer->loadCount('orders');
        $customer->load(['orders' => function ($q) {
            $q->orderBy('created_at', 'desc')->limit(10)->select(
                'id', 'order_number', 'customer_id', 'channel', 'status',
                'payment_status', 'total', 'created_at'
            );
        }]);

        return response()->json($customer);
    }

    public function sendPasswordReset(string $id)
    {
        $customer = Customer::findOrFail($id);

        // Customer must have a linked user account with an email
        if (!$customer->user_id || !$customer->email) {
            return response()->json([
                'message' => 'This customer does not have an account with a registered email address.'
            ], 422);
        }

        $status = Password::sendResetLink(['email' => $customer->email]);

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'Password reset email sent to ' . $customer->email]);
        }

        return response()->json([
            'message' => 'Could not send reset email. The customer may not have a linked account.'
        ], 422);
    }
}
