<?php

namespace App\Support;

use App\Models\Delivery;
use App\Models\Order;

class OrderDeliveryProjection
{
    public static function apply(Order $order): Order
    {
        $delivery = $order->delivery;
        $pickup = $delivery?->pickupAssignment;
        $order->unsetRelation('delivery');
        $order->setAttribute('delivery_progress', $delivery ? [
            'status' => $delivery->status,
            'assigned_at' => $delivery->assigned_at,
            'picked_up_at' => $delivery->picked_up_at,
            'sorted_at' => $delivery->sorted_at,
            'delivery_picked_up_at' => $delivery->delivery_picked_up_at,
            'delivered_at' => $delivery->delivered_at,
            'buyer_confirmed_at' => $delivery->buyer_confirmed_at,
            'delivery_area' => $delivery->deliveryArea ? ['name' => $delivery->deliveryArea->name] : null,
            'current_hub' => $delivery->currentHub ? ['name' => $delivery->currentHub->name, 'code' => $delivery->currentHub->code] : null,
            'pickup' => $pickup ? [
                'status' => $pickup->status,
                'pickup_address' => $pickup->pickup_address,
                'requested_at' => $pickup->requested_at,
                'scheduled_at' => $pickup->scheduled_at,
                'assigned_at' => $pickup->assigned_at,
                'picked_up_at' => $pickup->picked_up_at,
                'received_at' => $pickup->received_at,
                'courier' => $pickup->courierProfile?->user ? [
                    'name' => trim($pickup->courierProfile->user->first_name.' '.$pickup->courierProfile->user->last_name),
                    'phone' => $pickup->courierProfile->user->phone,
                ] : null,
            ] : null,
            'events' => $delivery->events->map(fn ($event) => [
                'event_type' => $event->event_type,
                'previous_status' => $event->previous_status,
                'new_status' => $event->new_status,
                'created_at' => $event->created_at,
                'reason' => $event->reason,
            ])->values(),
        ] : null);

        return $order;
    }

    public static function event(Delivery $delivery, array $values): void
    {
        $delivery->events()->create($values + ['created_at' => now()]);
    }
}
