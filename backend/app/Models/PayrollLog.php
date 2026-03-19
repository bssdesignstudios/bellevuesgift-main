<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PayrollLog extends Model
{
    protected $table = 'payroll_logs';
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
        'user_id', 'pay_period_start', 'pay_period_end',
        'total_hours', 'pay_rate', 'gross_pay', 'amount',
        'status', 'notes', 'approved_by',
    ];

    protected $casts = [
        'pay_period_start' => 'date',
        'pay_period_end'   => 'date',
        'total_hours'      => 'float',
        'pay_rate'         => 'float',
        'gross_pay'        => 'float',
        'amount'           => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
