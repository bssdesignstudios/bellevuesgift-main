<?php
/**
 * Role: Builder
 * Rationale: Handle Gift Card operations and admin CRUD.
 */

namespace App\Http\Controllers;

use App\Models\GiftCard;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class GiftCardController extends Controller
{
    /**
     * List all gift cards (admin).
     */
    public function index()
    {
        $giftCards = GiftCard::orderBy('code')->get();
        return response()->json($giftCards);
    }

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
            'balance' => (float) $giftCard->computed_balance,
            'initial_balance' => (float) $giftCard->initial_balance,
            'is_active' => $giftCard->is_active,
        ]);
    }

    /**
     * Create a new gift card (admin).
     * Uses the ledger model for initial credit.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'nullable|string|unique:gift_cards,code',
            'initial_balance' => 'required|numeric|min:0.01',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated) {
            $code = isset($validated['code'])
                ? strtoupper($validated['code'])
                : 'BEL-' . strtoupper(Str::random(6)) . '-' . strtoupper(Str::random(3));

            $giftCard = GiftCard::create([
                'code' => $code,
                'initial_balance' => $validated['initial_balance'],
                'balance' => $validated['initial_balance'],
                'is_active' => $validated['is_active'] ?? true,
                'notes' => $validated['notes'] ?? 'Created by admin',
            ]);

            // Create initial credit transaction via ledger
            $giftCard->credit(
                $validated['initial_balance'],
                null, // no order_id
                null, // no staff_id
                'Initial balance loaded'
            );

            return response()->json($giftCard, 201);
        });
    }

    /**
     * Update a gift card (admin).
     */
    public function update(Request $request, string $id)
    {
        $giftCard = GiftCard::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|unique:gift_cards,code,' . $giftCard->id,
            'is_active' => 'sometimes|boolean',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $giftCard->update($validated);
        return response()->json($giftCard);
    }

    /**
     * Toggle gift card active status (admin).
     */
    public function toggleActive(string $id)
    {
        $giftCard = GiftCard::findOrFail($id);
        $giftCard->is_active = !$giftCard->is_active;
        $giftCard->save();

        return response()->json($giftCard);
    }
}

