<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodCollection extends Model
{
    protected $fillable = [
        'order_id', 'courier_profile_id', 'remitted_by', 'expected_amount',
        'collected_amount', 'status', 'collected_at', 'remitted_at',
        'remittance_reference', 'remittance_note',
    ];

    protected function casts(): array
    {
        return [
            'expected_amount' => 'decimal:2',
            'collected_amount' => 'decimal:2',
            'collected_at' => 'datetime',
            'remitted_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
    public function courierProfile(): BelongsTo { return $this->belongsTo(CourierProfile::class); }
    public function remittedBy(): BelongsTo { return $this->belongsTo(User::class, 'remitted_by'); }
}
