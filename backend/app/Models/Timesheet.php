<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Timesheet extends Model
{
    use HasFactory, \App\Traits\HasUuid;

    protected $fillable = [
        'user_id',
        'date',
        'clock_in',
        'clock_out',
        'hours',
        'task',
        'notes',
    ];

    protected $casts = [
        'date'  => 'date',
        'hours' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Auto-compute hours from clock_in / clock_out if not manually set.
     */
    public function computeHours(): ?float
    {
        if (!$this->clock_in || !$this->clock_out) {
            return null;
        }
        $in  = \Carbon\Carbon::parse($this->date->format('Y-m-d') . ' ' . $this->clock_in);
        $out = \Carbon\Carbon::parse($this->date->format('Y-m-d') . ' ' . $this->clock_out);
        return round($out->diffInMinutes($in) / 60, 2);
    }
}
