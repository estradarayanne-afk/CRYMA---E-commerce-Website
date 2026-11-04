<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogisticsProfile extends Model
{
    protected $fillable = [
        'user_id',
        'sex',
        'birthday',
        'business_name',
        'can_manage_hub_staff',
        'hub_staff_capability_granted_by',
        'hub_staff_capability_granted_at',
        'hub_staff_capability_revoked_by',
        'hub_staff_capability_revoked_at',
    ];

    protected $casts = [
        'can_manage_hub_staff' => 'boolean',
        'hub_staff_capability_granted_at' => 'datetime',
        'hub_staff_capability_revoked_at' => 'datetime',
    ];

    protected function casts(): array
    {
        return ['birthday' => 'date'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
