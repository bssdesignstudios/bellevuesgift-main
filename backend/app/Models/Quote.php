<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Quote extends Model
{
    use HasUuids;

    protected $fillable = [
        'quote_number', 'customer_id', 'status',
        'issued_date', 'valid_until', 'notes',
        'subtotal', 'tax_total', 'discount_total', 'total', 'created_by',
    ];

    protected $casts = [
        'issued_date'  => 'date',
        'valid_until'  => 'date',
        'subtotal'     => 'decimal:2',
        'tax_total'    => 'decimal:2',
        'discount_total' => 'decimal:2',
        'total'        => 'decimal:2',
    ];

    public function customer() { return $this->belongsTo(Customer::class); }
    public function items()    { return $this->hasMany(QuoteItem::class); }
    public function invoices() { return $this->hasMany(Invoice::class); }
}
