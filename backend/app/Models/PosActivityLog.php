<?php
/**
 * Role: Builder
 * Rationale: PosActivityLog model for auditing POS actions.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosActivityLog extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'register_id',
        'staff_id',
        'action',
        'details',
    ];

    protected $casts = [
        'details' => 'array',
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
