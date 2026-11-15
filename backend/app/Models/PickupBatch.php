<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PickupBatch extends Model
{
    public const REQUESTED = 'PICKUP_REQUESTED';
    public const ASSIGNED = 'ASSIGNED_TO_PICKUP_RIDER';
    public const IN_PROGRESS = 'PICKUP_IN_PROGRESS';
    public const PICKED_UP = 'PICKED_UP';
    public const RECEIVED = 'AT_SORTING_CENTER';

    protected $fillable = [
        'seller_id', 'pickup_address', 'status', 'courier_profile_id',
        'assigned_by', 'requested_at', 'preferred_scheduled_at', 'scheduled_at', 'assigned_at',
    ];

    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'preferred_scheduled_at' => 'datetime',
            'scheduled_at' => 'datetime',
            'assigned_at' => 'datetime',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function courierProfile(): BelongsTo
    {
        return $this->belongsTo(CourierProfile::class);
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(PickupAssignment::class);
    }
}
