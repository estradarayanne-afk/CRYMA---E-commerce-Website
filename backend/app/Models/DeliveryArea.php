<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryArea extends Model
{
    protected $fillable = ['name', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function couriers(): BelongsToMany
    {
        return $this->belongsToMany(CourierProfile::class, 'courier_delivery_areas')
            ->withPivot(['assigned_by'])
            ->withTimestamps();
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }
}
