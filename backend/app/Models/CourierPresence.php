<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourierPresence extends Model
{
    protected $primaryKey = 'courier_profile_id';

    public $incrementing = false;

    protected $fillable = [
        'courier_profile_id',
        'is_available',
        'latitude',
        'longitude',
        'accuracy_meters',
        'location_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'is_available' => 'boolean',
            'latitude' => 'float',
            'longitude' => 'float',
            'accuracy_meters' => 'float',
            'location_updated_at' => 'datetime',
        ];
    }

    public function courierProfile(): BelongsTo
    {
        return $this->belongsTo(CourierProfile::class);
    }
}
