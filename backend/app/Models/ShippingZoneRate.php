<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingZoneRate extends Model
{
    protected $fillable = [
        'origin_zone_id',
        'destination_zone_id',
        'provider',
        'rate_source',
        'min_weight_kg',
        'max_weight_kg',
        'fee',
        'min_delivery_days',
        'max_delivery_days',
        'volumetric_divisor_cm3_per_kg',
        'is_provisional',
        'is_active',
        'verification_note',
        'verified_by',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'min_weight_kg' => 'decimal:3',
            'max_weight_kg' => 'decimal:3',
            'fee' => 'decimal:2',
            'min_delivery_days' => 'integer',
            'max_delivery_days' => 'integer',
            'volumetric_divisor_cm3_per_kg' => 'decimal:2',
            'is_provisional' => 'boolean',
            'is_active' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    public function originZone(): BelongsTo
    {
        return $this->belongsTo(ShippingZone::class, 'origin_zone_id');
    }

    public function destinationZone(): BelongsTo
    {
        return $this->belongsTo(ShippingZone::class, 'destination_zone_id');
    }
}
