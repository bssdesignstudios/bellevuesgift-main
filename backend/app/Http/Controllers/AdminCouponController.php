<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use Illuminate\Http\Request;

class AdminCouponController extends Controller
{
    public function index(Request $request)
    {
        $query = Coupon::orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('code', 'like', "%{$search}%");
        }

        return response()->json($query->limit(500)->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:coupons,code',
            'discount_type' => 'required|in:percent,fixed',
            'value' => 'required|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'start_at' => 'nullable|date',
            'end_at' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        $coupon = Coupon::create([
            ...$validated,
            'code' => strtoupper($validated['code']),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($coupon, 201);
    }

    public function update(Request $request, $id)
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->update($request->only(['code', 'discount_type', 'value', 'min_order_amount', 'start_at', 'end_at', 'is_active']));

        return response()->json($coupon->fresh());
    }

    public function destroy($id)
    {
        Coupon::findOrFail($id)->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function toggleActive($id)
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->update(['is_active' => !$coupon->is_active]);

        return response()->json($coupon);
    }
}
