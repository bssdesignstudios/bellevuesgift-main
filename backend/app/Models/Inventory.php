<?php
/**
 * Role: Builder
 * Rationale: Inventory model for tracking stock levels.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $table = 'inventory';

    protected $fillable = [
        'product_id',
        'location',
        'qty_on_hand',
        'qty_reserved',
        'reorder_level',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
