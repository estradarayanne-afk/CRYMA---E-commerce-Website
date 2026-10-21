<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PolicyAcceptance extends Model
{
    protected $fillable = ['user_id', 'policy_type', 'policy_version', 'accepted_at'];

    protected $casts = ['accepted_at' => 'immutable_datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
