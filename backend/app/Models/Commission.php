<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Commission extends Model
{
    protected $fillable = [
        'order_id',
        'seller_id',
        'order_amount',
        'commission_rate',
        'commission_amount',
        'seller_earnings',
        'status',
        'payout_method', 'payout_reference', 'paid_by', 'paid_at', 'payout_amount',
    ];

    public function seller()
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function paidBy() { return $this->belongsTo(User::class, 'paid_by'); }
}
