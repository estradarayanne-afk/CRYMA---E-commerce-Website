<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HubStaffAuditEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'subject_user_id', 'actor_id', 'event_type', 'from_hub_id', 'to_hub_id', 'created_at',
    ];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subject_user_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function fromHub(): BelongsTo
    {
        return $this->belongsTo(LogisticsHub::class, 'from_hub_id');
    }

    public function toHub(): BelongsTo
    {
        return $this->belongsTo(LogisticsHub::class, 'to_hub_id');
    }
}
