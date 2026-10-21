<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryProof extends Model
{
    protected $hidden = ['photo_path'];

    protected $fillable = [
        'delivery_id',
        'courier_profile_id',
        'recipient_full_name',
        'photo_path',
        'captured_at',
    ];

    protected function casts(): array
    {
        return ['captured_at' => 'datetime'];
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
