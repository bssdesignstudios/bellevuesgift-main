<?php
/**
 * Role: Builder
 * Rationale: Handle Coupon validation in the Laravel backend.
 */

namespace App\Http\Controllers;

use App\Models\Coupon;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CouponController extends Controller
{
    public function validate(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $coupon = Coupon::where('code', strtoupper($validated['code']))
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', Carbon::now());
            })
            ->first();

        if (!$coupon) {
            return response()->json(['message' => 'Invalid or expired coupon code'], 404);
        }

        return response()->json($coupon);
    }
}
