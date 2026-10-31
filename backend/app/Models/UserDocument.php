<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDocument extends Model
{
    use HasFactory;

    protected $hidden = ['file_path', 'correction_token_hash'];

    protected $fillable = [
        'user_id',
        'document_type',
        'file_path',
        'original_file_name',
        'mime_type',
        'file_size',
        'status',
        'rejection_reason',
        'correction_token_hash',
        'correction_token_expires_at',
        'replaces_document_id',
    ];

    protected function casts(): array
    {
        return ['correction_token_expires_at' => 'datetime'];
    }

    /**
     * Get the user who owns this document.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function replacesDocument(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaces_document_id');
    }
}
