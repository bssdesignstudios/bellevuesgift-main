<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use \App\Traits\HasUuid;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'email',
        'island',
        'address',
        'loyalty_points',
        'customer_tier',
        'tier_discount',
        'is_favorite',
    ];

    protected $casts = [
        'loyalty_points' => 'integer',
        'tier_discount' => 'decimal:2',
        'is_favorite' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
