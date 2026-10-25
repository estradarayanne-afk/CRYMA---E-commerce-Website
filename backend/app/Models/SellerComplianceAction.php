<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerComplianceAction extends Model
{
    protected $fillable = [
        'seller_id',
        'admin_id',
        'action',
        'reason',
        'findings',
    ];

    protected function casts(): array
    {
        return ['findings' => 'array'];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
