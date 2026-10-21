<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'delivery_id', 'actor_id', 'event_type', 'previous_status', 'new_status',
        'previous_courier_profile_id', 'courier_profile_id', 'reason', 'created_at',
    ];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function delivery(): BelongsTo { return $this->belongsTo(Delivery::class); }
    public function actor(): BelongsTo { return $this->belongsTo(User::class, 'actor_id'); }
    public function previousCourierProfile(): BelongsTo { return $this->belongsTo(CourierProfile::class, 'previous_courier_profile_id'); }
    public function courierProfile(): BelongsTo { return $this->belongsTo(CourierProfile::class); }
}
