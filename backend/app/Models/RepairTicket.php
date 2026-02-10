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
        'item_make',
        'model_number',
        'serial_number',
        'problem_description',
        'dropoff_method',
        'requested_date',
        'deposit_required',
        'deposit_paid',
        'deposit_amount',
        'total_cost',
        'payment_status',
        'notes',
        'status',
        'eta_date'
    ];

    protected $casts = [
        'deposit_required' => 'boolean',
        'deposit_paid' => 'boolean',
    ];
}
