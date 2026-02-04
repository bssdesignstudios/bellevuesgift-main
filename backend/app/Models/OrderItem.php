<?php
/**
 * Role: Builder
 * Rationale: OrderItem model for individual line items.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'order_id',
        'product_id',
        'sku',
        'name',
        'qty',
        'unit_price',
        'line_total',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
