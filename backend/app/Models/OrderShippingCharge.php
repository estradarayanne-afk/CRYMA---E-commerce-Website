<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderShippingCharge extends Model
{
    protected $fillable = [
        'order_id',
        'seller_id',
        'rate_id',
        'provider',
        'origin_zone',
        'destination_zone',
        'actual_weight_kg',
        'volumetric_weight_kg',
        'billable_weight_kg',
        'fee',
        'is_provisional',
    ];

    protected function casts(): array
    {
        return [
            'actual_weight_kg' => 'decimal:3',
            'volumetric_weight_kg' => 'decimal:3',
            'billable_weight_kg' => 'decimal:3',
            'fee' => 'decimal:2',
            'is_provisional' => 'boolean',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function rate(): BelongsTo
    {
        return $this->belongsTo(ShippingZoneRate::class, 'rate_id');
    }
}
