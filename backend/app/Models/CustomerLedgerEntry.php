<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerLedgerEntry extends Model
{
    use \App\Traits\HasUuid;

    protected $table = 'customer_ledger_entries';

    protected $fillable = [
        'customer_id',
        'entry_type',
        'reference_type',
        'reference_id',
        'amount',
        'balance_after',
        'notes',
        'entry_date',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'entry_date' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
