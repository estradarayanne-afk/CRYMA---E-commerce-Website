<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShippingZone extends Model
{
    protected $fillable = ['name', 'slug', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function regions(): HasMany
    {
        return $this->hasMany(ShippingZoneRegion::class);
    }

    public function outgoingRates(): HasMany
    {
        return $this->hasMany(ShippingZoneRate::class, 'origin_zone_id');
    }
}
