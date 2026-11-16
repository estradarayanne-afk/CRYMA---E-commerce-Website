<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PickupAssignment extends Model
{
    public const REQUESTED = 'PICKUP_REQUESTED';
    public const ACCEPTED_BY_LOGISTICS = 'ACCEPTED_BY_LOGISTICS';
    public const REJECTED_BY_LOGISTICS = 'REJECTED_BY_LOGISTICS';
    public const ASSIGNED = 'ASSIGNED_TO_PICKUP_RIDER';
    public const ACCEPTED = 'ACCEPTED_BY_PICKUP_RIDER';
    public const PICKED_UP = 'PICKED_UP';
    public const RECEIVED = 'AT_SORTING_CENTER';

    protected $fillable = [
        'order_id', 'delivery_id', 'pickup_batch_id', 'target_hub_id', 'courier_profile_id', 'assigned_by', 'status',
        'pickup_address', 'requested_at', 'scheduled_at', 'assigned_at', 'picked_up_at', 'received_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'requested_at' => 'datetime',
            'scheduled_at' => 'datetime',
            'picked_up_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
    public function delivery(): BelongsTo { return $this->belongsTo(Delivery::class); }
    public function targetHub(): BelongsTo { return $this->belongsTo(LogisticsHub::class, 'target_hub_id'); }
    public function pickupBatch(): BelongsTo { return $this->belongsTo(PickupBatch::class); }
    public function courierProfile(): BelongsTo { return $this->belongsTo(CourierProfile::class); }
    public function assignedBy(): BelongsTo { return $this->belongsTo(User::class, 'assigned_by'); }
    public function decisionHistory(): HasMany { return $this->hasMany(PickupAssignmentDecision::class)->orderBy('decided_at')->orderBy('id'); }
}
