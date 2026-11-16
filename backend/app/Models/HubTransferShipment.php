<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HubTransferShipment extends Model
{
    protected $fillable = [
        'shipment_reference',
        'carrier_code',
        'carrier_name',
        'tracking_reference',
        'from_hub_id',
        'to_hub_id',
        'created_by',
    ];

    public function fromHub(): BelongsTo
    {
        return $this->belongsTo(LogisticsHub::class, 'from_hub_id');
    }

    public function toHub(): BelongsTo
    {
        return $this->belongsTo(LogisticsHub::class, 'to_hub_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(HubTransfer::class, 'shipment_reference', 'shipment_reference');
    }
}
