<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $table = 'customers';

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
        'is_favorite'   => 'boolean',
        'loyalty_points' => 'integer',
        'tier_discount'  => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'customer_id');
    }
}
