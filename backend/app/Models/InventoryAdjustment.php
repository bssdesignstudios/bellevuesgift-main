<?php
/**
 * Role: Builder
 * Rationale: InventoryAdjustment model for tracking inventory changes.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryAdjustment extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'product_id',
        'adjustment_type',
        'qty_change',
        'notes',
        'staff_id',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
