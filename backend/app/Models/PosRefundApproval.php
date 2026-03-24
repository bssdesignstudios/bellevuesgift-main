<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PosRefundApproval extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'register_session_id',
        'cashier_user_id',
        'admin_user_id',
        'order_id',
        'refund_amount',
        'reason',
        'approved_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'refund_amount' => 'decimal:2',
    ];

    public function session()
    {
        return $this->belongsTo(RegisterSession::class, 'register_session_id');
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_user_id');
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
