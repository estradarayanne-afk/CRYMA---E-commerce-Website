<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HubStaffProfile extends Model
{
    protected $fillable = ['user_id', 'hub_id', 'assigned_by', 'assigned_at'];

    protected function casts(): array
    {
        return ['assigned_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function hub(): BelongsTo
    {
        return $this->belongsTo(LogisticsHub::class, 'hub_id');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
