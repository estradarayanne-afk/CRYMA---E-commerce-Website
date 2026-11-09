<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GeographicLocation extends Model
{
    public $timestamps = false;

    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['code', 'name', 'level', 'parent_code'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_code');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_code');
    }
}
