<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\PickupAssignment;
use App\Models\User;
use App\Support\OrderDeliveryProjection;
use Illuminate\Support\Facades\DB;

class ParcelReceivingService
{
    public function __construct(private readonly HubStaffHubResolver $hubResolver) {}

    public function receivePickup(int $orderId, string $parcelCode, User $actor, ?int $globalHubId = null): PickupAssignment
    {
        return DB::transaction(function () use ($orderId, $parcelCode, $actor, $globalHubId): PickupAssignment {
            $hub = $globalHubId === null
                ? $this->hubResolver->resolveForUpdate($actor)
                : LogisticsHub::query()->whereKey($globalHubId)->lockForUpdate()->firstOrFail();
            abort_unless($hub->is_active, 422, 'Select an active hub.');

            $order = Order::query()->whereKey($orderId)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::query()->where('parcel_code', $parcelCode)->lockForUpdate()->firstOrFail();
            abort_unless((int) $delivery->order_id === (int) $order->id, 422, 'The scanned parcel does not match this order.');
            $assignment = PickupAssignment::query()->where('order_id', $order->id)->lockForUpdate()->firstOrFail();
            abort_unless(
                $order->status === Delivery::PICKED_UP
                    && $delivery->status === Delivery::PICKED_UP
                    && $assignment->status === PickupAssignment::PICKED_UP
                    && $assignment->picked_up_at !== null
                    && $assignment->received_at === null
                    && $delivery->current_hub_id === null,
                409,
                'Only a collected parcel awaiting hub receipt can be confirmed.',
            );

            $assignment->update(['status' => PickupAssignment::RECEIVED, 'received_at' => now()]);
            $delivery->update(['status' => Delivery::AT_SORTING_CENTER, 'current_hub_id' => $hub->id]);
            $order->update(['status' => Delivery::AT_SORTING_CENTER]);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $actor->id,
                'hub_id' => $hub->id,
                'event_type' => 'sorting_center_received',
                'previous_status' => Delivery::PICKED_UP,
                'new_status' => Delivery::AT_SORTING_CENTER,
                'previous_courier_profile_id' => $assignment->courier_profile_id,
                'courier_profile_id' => $assignment->courier_profile_id,
                'reason' => "QR verified at hub {$hub->code} (#{$hub->id}).",
            ]);

            return $assignment->load(['order', 'courierProfile.user', 'delivery.events']);
        });
    }
}
