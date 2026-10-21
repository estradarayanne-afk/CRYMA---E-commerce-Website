<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CourierProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'sex',
        'birthday',
    ];

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
        ];
    }

    /**
     * Get the user associated with this courier profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the courier's vehicles.
     */
    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }

    public function pickupAssignments(): HasMany
    {
        return $this->hasMany(PickupAssignment::class);
    }

    public function deliveryAreas(): BelongsToMany
    {
        return $this->belongsToMany(DeliveryArea::class, 'courier_delivery_areas')
            ->withPivot(['assigned_by'])
            ->withTimestamps();
    }
}
