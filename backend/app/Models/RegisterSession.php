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
        'variance',
        'notes',
        'status',
        'closed_by_user_id',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'opening_balance' => 'decimal:2',
        'closing_balance' => 'decimal:2',
        'expected_balance' => 'decimal:2',
        'variance' => 'decimal:2',
    ];

    public function register()
    {
        return $this->belongsTo(Register::class);
    }

    public function staff()
    {
        return $this->belongsTo(Staff::class);
    }

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    public function cashierLogs()
    {
        return $this->hasMany(PosCashierLog::class, 'register_session_id');
    }

    public function isOpen(): bool
    {
        return $this->status === 'open' && is_null($this->closed_at);
    }
}
