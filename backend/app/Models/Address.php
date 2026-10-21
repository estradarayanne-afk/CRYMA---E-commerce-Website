<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'label',
        'recipient_name',
        'phone',
        'is_default',
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

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    /**
     * Get the user who owns this address.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
