<?php
/**
 * Role: Builder
 * Rationale: Gift Card model with ledger-based balance tracking.
 * Balance is now computed from transactions, not stored/mutated directly.
 * Implements concurrency-safe debit with row locking.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GiftCard extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'code',
        'initial_balance',
        'balance', // Legacy field, kept for backward compatibility
        'is_active',
        'customer_id',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'initial_balance' => 'decimal:2',
        'balance' => 'decimal:2',
    ];

    protected $appends = ['computed_balance'];

    /**
     * Get all transactions for this gift card.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(GiftCardTransaction::class);
    }

    /**
     * Compute balance from transaction ledger.
     * Falls back to 'balance' column if no transactions exist (legacy support).
     */
    public function getComputedBalanceAttribute(): float
    {
        $sum = $this->transactions()->sum('amount');

        // If no transactions exist, use the stored balance (legacy)
        if ($this->transactions()->count() === 0) {
            return (float) $this->balance;
        }

        return (float) $sum;
    }

    /**
     * Credit the gift card (add balance).
     */
    public function credit(float $amount, ?string $orderId = null, ?string $staffId = null, ?string $description = null, ?string $reference = null): GiftCardTransaction
    {
        return DB::transaction(function () use ($amount, $orderId, $staffId, $description, $reference) {
            $transaction = $this->transactions()->create([
                'amount' => abs($amount),
                'type' => 'credit',
                'order_id' => $orderId,
                'staff_id' => $staffId,
                'description' => $description ?? 'Gift card credit',
                'reference' => $reference,
            ]);

            // Update cached balance for backward compatibility
            $this->update(['balance' => $this->computed_balance]);

            return $transaction;
        });
    }

    /**
     * Debit the gift card (subtract balance) with row locking.
     * Prevents double-redemption under concurrency.
     */
    public function debit(float $amount, ?string $orderId = null, ?string $staffId = null, ?string $description = null, ?string $reference = null): GiftCardTransaction
    {
        return DB::transaction(function () use ($amount, $orderId, $staffId, $description, $reference) {
            // Lock row to prevent concurrent debit
            $lockedCard = GiftCard::where('id', $this->id)->lockForUpdate()->firstOrFail();

            // Compute balance from ledger with lock held
            $currentBalance = (float) $lockedCard->transactions()->sum('amount');

            // Fallback to legacy balance if no transactions
            if ($lockedCard->transactions()->count() === 0) {
                $currentBalance = (float) $lockedCard->balance;
            }

            if ($amount > $currentBalance) {
                throw ValidationException::withMessages([
                    'amount' => "Insufficient gift card balance. Available: {$currentBalance}, Requested: {$amount}"
                ]);
            }

            $transaction = $lockedCard->transactions()->create([
                'amount' => -abs($amount),
                'type' => 'debit',
                'order_id' => $orderId,
                'staff_id' => $staffId,
                'description' => $description ?? 'Gift card redemption',
                'reference' => $reference,
            ]);

            // Update cached balance for backward compatibility
            $newBalance = (float) $lockedCard->transactions()->sum('amount');
            $lockedCard->update(['balance' => $newBalance]);

            return $transaction;
        });
    }

    /**
     * Redeem gift card by code — static method for POS with full row locking.
     * @throws ValidationException
     */
    public static function redeem(string $code, float $amount, ?string $orderId = null, ?string $staffId = null, array $meta = []): GiftCardTransaction
    {
        return DB::transaction(function () use ($code, $amount, $orderId, $staffId, $meta) {
            $card = GiftCard::where('code', strtoupper($code))
                ->lockForUpdate()
                ->first();

            if (!$card) {
                throw ValidationException::withMessages(['code' => 'Gift card not found']);
            }

            if (!$card->is_active) {
                throw ValidationException::withMessages(['code' => 'Gift card is inactive']);
            }

            // Compute balance from ledger
            $balance = (float) $card->transactions()->sum('amount');
            if ($card->transactions()->count() === 0) {
                $balance = (float) $card->balance;
            }

            if ($balance < $amount) {
                throw ValidationException::withMessages([
                    'amount' => "Insufficient balance. Available: {$balance}, Requested: {$amount}"
                ]);
            }

            $transaction = $card->transactions()->create([
                'amount' => -abs($amount),
                'type' => 'debit',
                'order_id' => $orderId,
                'staff_id' => $staffId,
                'description' => 'POS redemption',
                'reference' => $meta['reference'] ?? null,
            ]);

            // Update cached balance
            $newBalance = (float) $card->transactions()->sum('amount');
            $card->update(['balance' => $newBalance]);

            return $transaction;
        });
    }

    /**
     * Check if gift card has sufficient balance.
     */
    public function hasSufficientBalance(float $amount): bool
    {
        return $this->computed_balance >= $amount;
    }
}

