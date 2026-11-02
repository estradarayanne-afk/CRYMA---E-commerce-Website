<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountEmailRelease extends Model
{
    protected $fillable = [
        'user_id',
        'released_by',
        'original_email',
        'email_fingerprint',
        'reason_code',
        'released_at',
    ];

    protected function casts(): array
    {
        return ['released_at' => 'immutable_datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function releasedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }
}
