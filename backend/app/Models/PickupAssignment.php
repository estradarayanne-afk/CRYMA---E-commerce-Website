<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PickupAssignment extends Model
{
    public const ASSIGNED = 'ASSIGNED_TO_PICKUP_RIDER';
    public const ACCEPTED = 'ACCEPTED_BY_PICKUP_RIDER';
    public const PICKED_UP = 'PICKED_UP';
    public const RECEIVED = 'AT_SORTING_CENTER';

    protected $fillable = [
        'order_id', 'delivery_id', 'courier_profile_id', 'assigned_by', 'status',
        'assigned_at', 'picked_up_at', 'received_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'picked_up_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
    public function delivery(): BelongsTo { return $this->belongsTo(Delivery::class); }
    public function courierProfile(): BelongsTo { return $this->belongsTo(CourierProfile::class); }
    public function assignedBy(): BelongsTo { return $this->belongsTo(User::class, 'assigned_by'); }
}
