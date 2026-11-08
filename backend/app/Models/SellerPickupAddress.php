<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerPickupAddress extends Model
{
    protected $fillable = [
        'user_id',
        'recipient_name',
        'phone',
        'region',
        'province',
        'municipality',
        'barangay',
        'street',
        'house_number',
        'building_name',
        'unit_number',
        'postal_code',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
