<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogisticsHub extends Model
{
    protected $fillable = ['name', 'code', 'address', 'is_active'];
    protected function casts(): array { return ['is_active' => 'boolean']; }
}
