<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryLocation extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'delivery_id',
        'courier_profile_id',
        'latitude',
        'longitude',
        'accuracy_meters',
        'captured_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'accuracy_meters' => 'float',
            'captured_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }

    public function courierProfile(): BelongsTo
    {
        return $this->belongsTo(CourierProfile::class);
    }
}
