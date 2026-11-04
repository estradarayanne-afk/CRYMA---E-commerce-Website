<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\DeliveryEvent;
use App\Models\Order;
use App\Models\User;
use App\Support\OrderDeliveryProjection;

class ParcelSortingService
{
    public function transitionToSorted(Delivery $delivery, User $actor, ?int $deliveryAreaId = null, bool $requireHubScan = false): void
    {
        if ($requireHubScan) {
            abort_unless(
                DeliveryEvent::query()->where('delivery_id', $delivery->id)
                    ->where('event_type', 'parcel_scanned')
                    ->where('hub_id', $delivery->current_hub_id)
                    ->exists(),
                422,
                'Scan the parcel at your hub before sorting it.',
            );

            if ($delivery->delivery_area_id !== null) {
                $area = DeliveryArea::query()->whereKey($delivery->delivery_area_id)->lockForUpdate()->first();
                abort_unless($area && $area->is_active && (int) $area->hub_id === (int) $delivery->current_hub_id, 409, 'The assigned delivery area does not map to this hub.');
            }
        }

        if ($delivery->status === Delivery::AT_SORTING_CENTER) {
            $order = Order::query()->whereKey($delivery->order_id)->lockForUpdate()->firstOrFail();
            abort_unless($order->status === Delivery::AT_SORTING_CENTER, 409, 'Order and parcel status are inconsistent.');
            $attributes = ['status' => Delivery::SORTED, 'sorted_at' => now()];
            if ($deliveryAreaId !== null) $attributes['delivery_area_id'] = $deliveryAreaId;
            $delivery->update($attributes);
            $order->update(['status' => Delivery::SORTED]);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $actor->id,
                'hub_id' => $delivery->current_hub_id,
                'event_type' => 'sorted',
                'previous_status' => Delivery::AT_SORTING_CENTER,
                'new_status' => Delivery::SORTED,
            ]);
        } elseif ($delivery->status === Delivery::SORTED && $deliveryAreaId !== null) {
            $delivery->update(['delivery_area_id' => $deliveryAreaId]);
        }
    }
}
