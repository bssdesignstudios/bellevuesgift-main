<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuoteItem extends Model
{
    use \App\Traits\HasUuid;

    protected $table = 'quote_items';

    protected $fillable = [
        'quote_id',
        'product_id',
        'sku',
        'description',
        'qty',
        'unit_price',
        'line_total',
        'tax_amount',
        'discount_amount',
    ];

    protected $casts = [
        'qty' => 'integer',
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
    ];

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
