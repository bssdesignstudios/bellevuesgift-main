<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RepairTicket extends Model
{
    use \Illuminate\Database\Eloquent\Concerns\HasUuids;

    protected $fillable = [
        'ticket_number',
        'customer_name',
        'phone',
        'email',
        'preferred_contact',
        'service_type',
        'device_type',
        'item_make',
        'model_number',
        'serial_number',
        'problem_description',
        'accessories',
        'condition_notes',
        'estimated_cost',
        'dropoff_method',
        'requested_date',
        'deposit_required',
        'deposit_amount',
        'deposit_paid',
        'notes',
        'internal_notes',
        'status',
        'eta_date',
        'labor_hours',
        'labor_rate',
        'parts_cost',
        'total_cost',
        'assigned_staff_id',
        'assigned_at',
        'intake_source',
        'priority',
        'created_by',
        'amount_paid',
        'payment_status',
    ];

    protected $casts = [
        'deposit_required' => 'boolean',
        'deposit_paid'     => 'boolean',
        'estimated_cost'   => 'decimal:2',
        'amount_paid'      => 'decimal:2',
        'labor_hours'      => 'decimal:2',
        'labor_rate'       => 'decimal:2',
        'parts_cost'       => 'decimal:2',
        'total_cost'       => 'decimal:2',
        'deposit_amount'   => 'decimal:2',
        'assigned_at'      => 'datetime',
    ];
}
