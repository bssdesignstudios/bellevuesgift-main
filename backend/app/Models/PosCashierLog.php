<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosCashierLog extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'register_session_id',
        'user_id',
        'action',
        'acted_at',
        'notes',
    ];

    protected $casts = [
        'acted_at' => 'datetime',
    ];

    public function session()
    {
        return $this->belongsTo(RegisterSession::class, 'register_session_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
