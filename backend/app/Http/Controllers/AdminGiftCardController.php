<?php

namespace App\Http\Controllers;

use App\Models\GiftCard;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminGiftCardController extends Controller
{
    public function index(Request $request)
    {
        $query = GiftCard::orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'ilike', "%{$search}%")
                  ->orWhere('notes', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->limit(500)->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'initial_balance' => 'required|numeric|min:1',
            'notes' => 'nullable|string',
        ]);

        $code = 'BEL-' . strtoupper(Str::random(6)) . '-' . strtoupper(Str::random(3));

        $giftCard = GiftCard::create([
            'code' => $code,
            'initial_balance' => $validated['initial_balance'],
            'balance' => $validated['initial_balance'],
            'is_active' => true,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json($giftCard, 201);
    }

    public function toggleActive($id)
    {
        $giftCard = GiftCard::findOrFail($id);
        $giftCard->update(['is_active' => !$giftCard->is_active]);

        return response()->json($giftCard);
    }
}
