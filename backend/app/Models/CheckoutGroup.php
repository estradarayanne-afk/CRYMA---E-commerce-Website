<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CheckoutGroup extends Model
{
    protected $fillable = [
        'buyer_id',
        'address_id',
        'delivery_address',
        'payment_method',
        'subtotal',
        'shipping_fee',
        'voucher_discount',
        'shipping_voucher_discount',
        'total_amount',
        'voucher_code',
        'shipping_voucher_code',
        'idempotency_key',
        'request_hash',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
