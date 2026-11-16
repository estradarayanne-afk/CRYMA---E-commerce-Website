<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PickupAssignmentDecision extends Model
{
    protected $fillable = [
        'pickup_assignment_id',
        'decided_by',
        'decision',
        'reason',
        'decided_at',
    ];

    protected function casts(): array
    {
        return ['decided_at' => 'datetime'];
    }

    public function pickupAssignment(): BelongsTo
    {
        return $this->belongsTo(PickupAssignment::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
