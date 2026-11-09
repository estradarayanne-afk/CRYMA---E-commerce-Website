<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LogisticsHub extends Model
{
    protected $fillable = ['name', 'code', 'address', 'is_active', 'psgc_code', 'location_label'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class, 'current_hub_id');
    }

    public function incomingTransfers(): HasMany
    {
        return $this->hasMany(HubTransfer::class, 'to_hub_id');
    }

    public function outgoingTransfers(): HasMany
    {
        return $this->hasMany(HubTransfer::class, 'from_hub_id');
    }

    public function hubStaffProfiles(): HasMany
    {
        return $this->hasMany(HubStaffProfile::class, 'hub_id');
    }
}
