<?php
/**
 * Role: Builder
 * Rationale: Handle Gift Card operations.
 */

namespace App\Http\Controllers;

use App\Models\GiftCard;
use Illuminate\Http\Request;

class GiftCardController extends Controller
{
    /**
     * Check gift card balance.
     */
    public function check(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $giftCard = GiftCard::where('code', strtoupper($validated['code']))->first();

        if (!$giftCard) {
            return response()->json(['message' => 'Gift card not found'], 404);
        }

        if (!$giftCard->is_active) {
            return response()->json(['message' => 'Gift card is inactive'], 400);
        }

        return response()->json([
            'code' => $giftCard->code,
            'balance' => (float) $giftCard->balance,
            'initial_balance' => (float) $giftCard->initial_balance,
            'is_active' => $giftCard->is_active,
        ]);
    }
}
