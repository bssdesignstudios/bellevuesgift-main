<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Invoice extends Model
{
    use HasUuids;

    protected $fillable = [
        'invoice_number', 'customer_id', 'quote_id', 'status',
        'issued_date', 'due_date', 'notes',
        'subtotal', 'tax_total', 'discount_total', 'total', 'amount_paid', 'created_by',
    ];

    protected $casts = [
        'issued_date'    => 'date',
        'due_date'       => 'date',
        'subtotal'       => 'decimal:2',
        'tax_total'      => 'decimal:2',
        'discount_total' => 'decimal:2',
        'total'          => 'decimal:2',
        'amount_paid'    => 'decimal:2',
    ];

    public function customer() { return $this->belongsTo(Customer::class); }
    public function quote()    { return $this->belongsTo(Quote::class); }
    public function items()    { return $this->hasMany(InvoiceItem::class); }

    public function getBalanceAttribute(): float
    {
        return max(0, (float) $this->total - (float) $this->amount_paid);
    }
}
