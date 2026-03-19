<?php
/**
 * Role: Builder
 * Rationale: Handle Coupons in the Laravel backend.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'code',
        'discount_type',
        'value',
        'min_order_amount',
        'is_active',
        'start_at',
        'end_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'value' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
    ];
}
