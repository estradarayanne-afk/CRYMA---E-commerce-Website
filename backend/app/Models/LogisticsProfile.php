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
