<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Quote extends Model
{
    use \App\Traits\HasUuid;

    protected $table = 'quotes';

    protected $fillable = [
        'quote_number',
        'customer_id',
        'staff_id',
        'status',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total',
        'issued_at',
        'valid_until',
        'converted_invoice_id',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'issued_at' => 'datetime',
        'valid_until' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(QuoteItem::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
