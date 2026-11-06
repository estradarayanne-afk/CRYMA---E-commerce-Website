<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformConfig extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Retrieve a config value by key, returning $default when the key does not exist.
     */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        return static::find($key)?->value ?? $default;
    }

    /**
     * Set (upsert) a config value.
     */
    public static function setValue(string $key, mixed $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => (string) $value],
        );
    }
}
