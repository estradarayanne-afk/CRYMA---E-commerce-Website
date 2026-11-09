<?php

namespace App\Support;

use App\Models\Delivery;
use App\Models\Order;
use Illuminate\Support\Carbon;

class OrderDeliveryProjection
{
    public static function apply(Order $order): Order
    {
        $order->loadMissing('shippingCharge');
        $delivery = $order->delivery;
        $pickup = $delivery?->pickupAssignment;
        $deliveryAttempts = $delivery
            ? $delivery->events->whereIn('event_type', ['failed', 'returned_after_max_delivery_attempts'])->count()
            : 0;
        $shippingCharge = $order->shippingCharge;
        $estimate = null;
        $status = strtoupper((string) $order->status);

        if (
            $shippingCharge
            && $order->created_at
            && $shippingCharge->min_delivery_days !== null
            && $shippingCharge->max_delivery_days !== null
            && ! in_array($status, ['CANCELLED', 'CANCELED', 'DELIVERED', 'COMPLETED', 'RETURNED'], true)
        ) {
            $estimate = [
                'from' => self::addBusinessDays($order->created_at, (int) $shippingCharge->min_delivery_days)->toDateString(),
                'to' => self::addBusinessDays($order->created_at, (int) $shippingCharge->max_delivery_days)->toDateString(),
                'min_days' => (int) $shippingCharge->min_delivery_days,
                'max_days' => (int) $shippingCharge->max_delivery_days,
            ];
        }

        $order->setAttribute('delivery_estimate', $estimate);
        $order->unsetRelation('delivery');
        $order->setAttribute('delivery_progress', $delivery ? [
            'parcel_code' => $delivery->parcel_code,
            'status' => $delivery->status,
            'delivery_attempts' => $deliveryAttempts,
            'max_delivery_attempts' => Delivery::MAX_DELIVERY_ATTEMPTS,
            'assigned_at' => $delivery->assigned_at,
            'picked_up_at' => $delivery->picked_up_at,
            'sorted_at' => $delivery->sorted_at,
            'delivery_picked_up_at' => $delivery->delivery_picked_up_at,
            'delivered_at' => $delivery->delivered_at,
            'buyer_confirmed_at' => $delivery->buyer_confirmed_at,
            'delivery_area' => $delivery->deliveryArea ? ['name' => $delivery->deliveryArea->name] : null,
            'current_hub' => $delivery->currentHub ? ['name' => $delivery->currentHub->name, 'code' => $delivery->currentHub->code] : null,
            'return_shipment' => $delivery->returnShipment ? [
                'id' => $delivery->returnShipment->id,
                'return_type' => $delivery->returnShipment->return_type,
                'status' => $delivery->returnShipment->status,
                'current_hub' => $delivery->returnShipment->currentHub ? [
                    'name' => $delivery->returnShipment->currentHub->name,
                    'code' => $delivery->returnShipment->currentHub->code,
                ] : null,
                'picked_up_at' => $delivery->returnShipment->picked_up_at,
                'received_at' => $delivery->returnShipment->received_at,
                'updated_at' => $delivery->returnShipment->updated_at,
            ] : null,
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
            ])->values(),
        ] : null);

        return $order;
    }

    private static function addBusinessDays(Carbon $date, int $days): Carbon
    {
        $result = $date->copy()->timezone('Asia/Manila')->startOfDay();

        while ($days > 0) {
            $result->addDay();
            if (! $result->isWeekend()) {
                $days--;
            }
        }

        return $result;
    }

    public static function event(Delivery $delivery, array $values): void
    {
        $delivery->events()->create($values + ['created_at' => now()]);
    }
}
