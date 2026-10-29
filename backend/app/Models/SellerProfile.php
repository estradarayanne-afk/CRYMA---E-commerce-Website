<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'sex',
        'birthday',
        'business_name',
        'requested_business_name',
        'business_name_request_status',
        'business_name_requested_at',
        'business_name_reviewed_at',
        'business_name_reviewed_by',
        'business_name_request_reason',
        'store_slug',
        'store_tagline',
        'store_description',
        'store_accent_color',
        'store_logo_url',
        'store_banner_url',
        'storefront_settings',
        'line_of_business',
        'tin',
    ];

    protected $hidden = ['tin'];

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
            'storefront_settings' => 'array',
            'tin' => 'encrypted',
        ];
    }

    /**
     * Get the user associated with this seller profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
