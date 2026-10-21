<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $hidden = [
        'checkout_idempotency_key',
        'checkout_request_hash',
    ];

    protected $fillable = [
        'buyer_id',
        'delivery_address',
        'payment_method',
        'subtotal',
        'shipping_fee',
        'total_amount',
        'voucher_id',
        'voucher_code',
        'voucher_discount',
        'status',
        'checkout_idempotency_key',
        'checkout_request_hash',
    ];

    public function buyer()
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function commission()
    {
        return $this->hasOne(Commission::class);
    }

    public function voucherRedemption()
    {
        return $this->hasOne(VoucherRedemption::class);
    }

    public function delivery(): HasOne
    {
        return $this->hasOne(Delivery::class);
    }

    public function pickupAssignment(): HasOne
    {
        return $this->hasOne(PickupAssignment::class);
    }
}
