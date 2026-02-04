<?php
/**
 * Role: Builder
 * Rationale: RegisterSession model for tracking POS cashier sessions.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RegisterSession extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'register_id',
        'staff_id',
        'opened_at',
        'closed_at',
        'opening_balance',
        'closing_balance',
        'expected_balance',
        'notes',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'opening_balance' => 'decimal:2',
        'closing_balance' => 'decimal:2',
        'expected_balance' => 'decimal:2',
    ];

    public function register()
    {
        return $this->belongsTo(Register::class);
    }

    public function staff()
    {
        return $this->belongsTo(Staff::class);
    }
}
