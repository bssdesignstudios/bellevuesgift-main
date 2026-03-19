<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class RecurringBill extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    protected $fillable = [
        'name', 'vendor_payee', 'amount', 'billing_cycle',
        'next_due_date', 'category', 'notes', 'is_active', 'created_by',
    ];

    protected $casts = [
        'next_due_date' => 'date',
        'is_active'     => 'boolean',
        'amount'        => 'float',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->is_active && $this->next_due_date->isPast();
    }
}
