<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReturnShipment extends Model
{
    protected $fillable = ['refund_request_id','order_id','buyer_id','seller_id','pickup_courier_profile_id','delivery_courier_profile_id','current_hub_id','status','buyer_handover_name','seller_received_name','pickup_photo_path','delivery_photo_path','picked_up_at','received_at','note'];
    protected function casts(): array { return ['picked_up_at' => 'datetime', 'received_at' => 'datetime']; }
    public function refundRequest(): BelongsTo { return $this->belongsTo(RefundRequest::class); }
    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
    public function buyer(): BelongsTo { return $this->belongsTo(User::class, 'buyer_id'); }
    public function seller(): BelongsTo { return $this->belongsTo(User::class, 'seller_id'); }
    public function pickupCourier(): BelongsTo { return $this->belongsTo(CourierProfile::class, 'pickup_courier_profile_id'); }
    public function deliveryCourier(): BelongsTo { return $this->belongsTo(CourierProfile::class, 'delivery_courier_profile_id'); }
    public function currentHub(): BelongsTo { return $this->belongsTo(LogisticsHub::class, 'current_hub_id'); }
    public function transfers(): HasMany { return $this->hasMany(HubTransfer::class); }
}
