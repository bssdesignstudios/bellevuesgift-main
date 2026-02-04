<?php
/**
 * Role: Builder
 * Rationale: Gift Card model for tracking balances.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GiftCard extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'code',
        'initial_balance',
        'balance',
        'is_active',
        'customer_id',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'initial_balance' => 'decimal:2',
        'balance' => 'decimal:2',
    ];
}
