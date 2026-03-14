<?php
/**
 * Role: Builder
 * Rationale: Order model for sales tracking.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'order_number',
        'channel',
        'status',
        'payment_status',
        'payment_method',
        'fulfillment_method',
        'customer_id',
        'staff_id',
        'register_id',
        'subtotal',
        'discount_amount',
        'vat_amount',
        'total',
        'notes',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function customer()
    {
        return $this->belongsTo(\App\Models\User::class, 'customer_id');
    }
}
