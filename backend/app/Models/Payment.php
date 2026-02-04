<?php
/**
 * Role: Builder
 * Rationale: Payment model for tracking transactions.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'order_id',
        'method',
        'amount',
        'reference',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
