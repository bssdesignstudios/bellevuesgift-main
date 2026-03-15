<?php
/**
 * Role: Builder
 * Rationale: Register model for POS terminals.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Register extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'name',
        'location',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function assignedStaff()
    {
        return $this->belongsToMany(User::class, 'register_staff', 'register_id', 'user_id');
    }

    public function sessions()
    {
        return $this->hasMany(RegisterSession::class);
    }

    public function activeSession()
    {
        return $this->hasOne(RegisterSession::class)->whereNull('closed_at')->latest('opened_at');
    }
}
