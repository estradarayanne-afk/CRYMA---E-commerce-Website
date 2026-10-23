<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'phone',
        'password',
        'profile_image_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'email_otp_hash',
        'email_otp_expires_at',
        'email_otp_attempts',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the user's addresses.
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    /**
     * Get the user's uploaded documents.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(UserDocument::class);
    }

    public function policyAcceptances(): HasMany
    {
        return $this->hasMany(PolicyAcceptance::class);
    }

    /**
     * Get the buyer profile.
     */
    public function buyerProfile(): HasOne
    {
        return $this->hasOne(BuyerProfile::class);
    }

    /**
     * Get the seller profile.
     */
    public function sellerProfile(): HasOne
    {
        return $this->hasOne(SellerProfile::class);
    }

    /**
     * Get the courier profile.
     */
    public function courierProfile(): HasOne
    {
        return $this->hasOne(CourierProfile::class);
    }

    public function logisticsProfile(): HasOne
    {
        return $this->hasOne(LogisticsProfile::class);
    }

    /**
     * Get the products owned by this seller.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'seller_id');
    }

    public function sellerComplianceActions(): HasMany
    {
        return $this->hasMany(SellerComplianceAction::class, 'seller_id');
    }
}
