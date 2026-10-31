<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HubTransfer extends Model
{
    protected $fillable = ['delivery_id','return_shipment_id','from_hub_id','to_hub_id','courier_profile_id','assigned_by','status','departed_at','arrived_at','note'];
    protected function casts(): array { return ['departed_at' => 'datetime', 'arrived_at' => 'datetime']; }
    public function fromHub() { return $this->belongsTo(LogisticsHub::class, 'from_hub_id'); }
    public function toHub() { return $this->belongsTo(LogisticsHub::class, 'to_hub_id'); }
    public function courier() { return $this->belongsTo(CourierProfile::class, 'courier_profile_id'); }
    public function delivery() { return $this->belongsTo(Delivery::class); }
    public function returnShipment() { return $this->belongsTo(ReturnShipment::class); }
}
