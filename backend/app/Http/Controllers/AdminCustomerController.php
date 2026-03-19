<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;

class AdminCustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query()->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        return response()->json($query->limit(500)->get());
    }

    public function show(Customer $customer)
    {
        $customer->load(['orders' => function ($q) {
            $q->with('items')->orderBy('created_at', 'desc')->limit(10);
        }]);

        $orderStats = [
            'total_orders'  => $customer->orders()->count(),
            'total_spent'   => (float) $customer->orders()->where('payment_status', 'paid')->sum('total'),
            'last_order_at' => $customer->orders()->latest()->value('created_at'),
        ];

        return response()->json(array_merge($customer->toArray(), ['order_stats' => $orderStats]));
    }
}
