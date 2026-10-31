<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefundRequest extends Model
{
    protected $fillable = [
        'order_id', 'buyer_id', 'conversation_id', 'reviewed_by',
        'requested_amount', 'approved_amount', 'reason', 'status',
        'review_note', 'refund_method', 'refund_reference', 'refunded_at',
    ];

    protected function casts(): array
    {
        return [
            'requested_amount' => 'decimal:2',
            'approved_amount' => 'decimal:2',
            'refunded_at' => 'datetime',
        ];
    }

    public function returnShipment() { return $this->hasOne(ReturnShipment::class); }

    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
    public function buyer(): BelongsTo { return $this->belongsTo(User::class, 'buyer_id'); }
    public function conversation(): BelongsTo { return $this->belongsTo(Conversation::class); }
    public function reviewer(): BelongsTo { return $this->belongsTo(User::class, 'reviewed_by'); }
}
