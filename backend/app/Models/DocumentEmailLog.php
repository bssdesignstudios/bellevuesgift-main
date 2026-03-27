<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentEmailLog extends Model
{
    use \App\Traits\HasUuid;

    protected $table = 'document_email_logs';

    protected $fillable = [
        'document_type',
        'document_id',
        'recipient_email',
        'sent_by_user_id',
        'subject',
        'metadata',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];
}
