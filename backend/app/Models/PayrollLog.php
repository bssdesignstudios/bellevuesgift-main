<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollLog extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'user_id',
        'amount',
        'pay_period_start',
        'pay_period_end',
        'status',
        'approved_by',
    ];

    protected $casts = [
        'pay_period_start' => 'date',
        'pay_period_end' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
