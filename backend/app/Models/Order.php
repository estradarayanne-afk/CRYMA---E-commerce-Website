<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'buyer_id',
        'delivery_address',
        'payment_method',
        'subtotal',
        'shipping_fee',
        'total_amount',
        'status',
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
}