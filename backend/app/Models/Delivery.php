<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Delivery extends Model
{
    public const ASSIGNED = 'ASSIGNED_TO_RIDER';
    public const PICKED_UP = 'PICKED_UP';
    public const AT_SORTING_CENTER = 'AT_SORTING_CENTER';
    public const SORTED = 'SORTED';
    public const OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY';
    public const DELIVERED = 'DELIVERED';
    public const COMPLETED = 'COMPLETED';
    public const FAILED = 'DELIVERY_FAILED';
    public const RETURNED = 'RETURNED';
    public const MAX_DELIVERY_ATTEMPTS = 3;

    protected $fillable = [
        'order_id', 'parcel_code', 'courier_profile_id', 'assigned_by', 'status', 'legacy_imported',
        'assigned_at', 'picked_up_at', 'delivered_at', 'failure_reason', 'delivery_area_id',
        'current_hub_id', 'sorted_at', 'delivery_picked_up_at', 'buyer_confirmed_at', 'buyer_confirmed_by',
    ];

    protected static function booted(): void
    {
        static::creating(function (Delivery $delivery): void {
            if (!$delivery->parcel_code) {
                do {
                    $code = 'CRYMA-PCL-'.Str::upper(Str::random(20));
                } while (static::where('parcel_code', $code)->exists());

                $delivery->parcel_code = $code;
            }
        });
    }

    protected function casts(): array
    {
        return [
            'legacy_imported' => 'boolean',
            'assigned_at' => 'datetime',
            'picked_up_at' => 'datetime',
            'delivered_at' => 'datetime',
            'sorted_at' => 'datetime',
            'delivery_picked_up_at' => 'datetime',
            'buyer_confirmed_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
    public function courierProfile(): BelongsTo { return $this->belongsTo(CourierProfile::class); }
    public function assignedBy(): BelongsTo { return $this->belongsTo(User::class, 'assigned_by'); }
    public function deliveryArea(): BelongsTo { return $this->belongsTo(DeliveryArea::class); }
    public function buyerConfirmedBy(): BelongsTo { return $this->belongsTo(User::class, 'buyer_confirmed_by'); }
    public function pickupAssignment(): HasOne { return $this->hasOne(PickupAssignment::class); }
    public function proof(): HasOne { return $this->hasOne(DeliveryProof::class); }
    public function returnShipment(): HasOne { return $this->hasOne(ReturnShipment::class); }
    public function events(): HasMany { return $this->hasMany(DeliveryEvent::class)->orderBy('created_at')->orderBy('id'); }
    public function currentHub() { return $this->belongsTo(LogisticsHub::class, 'current_hub_id'); }
    public function hubTransfers(): HasMany { return $this->hasMany(HubTransfer::class); }
}
