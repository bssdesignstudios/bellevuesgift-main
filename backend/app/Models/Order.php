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
        'client_txn_id',
        'pickup_code',
        'picked_up_at',
        'picked_up_by',
    ];

    protected $casts = [
        'picked_up_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
