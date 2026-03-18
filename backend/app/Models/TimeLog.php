<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TimeLog extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'staff_id',
        'staff_name',
        'clock_in',
        'clock_out',
        'hours',
        'task',
        'notes',
        'status',
    ];

    protected $casts = [
        'clock_in'  => 'datetime',
        'clock_out' => 'datetime',
        'hours'     => 'decimal:2',
    ];

    public function staff()
    {
        return $this->belongsTo(\App\Models\User::class, 'staff_id');
    }
}
