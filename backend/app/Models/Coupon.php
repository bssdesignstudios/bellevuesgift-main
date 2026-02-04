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
        'type',
        'value',
        'is_active',
        'expires_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
        'value' => 'decimal:2',
    ];
}
