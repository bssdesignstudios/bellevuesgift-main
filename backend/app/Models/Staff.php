<?php
/**
 * Role: Builder
 * Rationale: Staff model for managing team members.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Staff extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $table = 'staff';

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'role',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
