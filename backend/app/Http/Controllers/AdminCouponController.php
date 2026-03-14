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
            $query->where('code', 'ilike', "%{$search}%");
        }

        return response()->json($query->limit(500)->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:coupons,code',
            'type' => 'required|in:percent,fixed',
            'value' => 'required|numeric|min:0',
            'min_purchase' => 'nullable|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        $coupon = Coupon::create([
            ...$validated,
            'code' => strtoupper($validated['code']),
            'is_active' => $validated['is_active'] ?? true,
            'used_count' => 0,
        ]);

        return response()->json($coupon, 201);
    }

    public function update(Request $request, $id)
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->update($request->only(['code', 'type', 'value', 'min_purchase', 'max_uses', 'expires_at', 'is_active']));

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
