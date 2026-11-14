<?php

namespace App\Support;

use App\Models\Delivery;
use App\Models\DeliveryEvent;
use App\Models\Order;
use Illuminate\Support\Carbon;

class OrderDeliveryProjection
{
    public static function apply(Order $order): Order
    {
        $order->loadMissing(['shippingCharge', 'codCollection']);
        $delivery = $order->delivery;
        $delivery?->loadMissing(['events.hub', 'courierProfile.user']);
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
        $paymentStatus = $order->payment_method !== 'cash_on_delivery'
            ? 'unknown'
            : (in_array(strtoupper((string) $order->status), ['CANCELLED', 'CANCELED'], true)
                ? 'cancelled'
                : match ($order->codCollection?->status) {
                    'collected', 'remitted' => 'paid',
                    'cancelled' => 'cancelled',
                    default => 'due_on_delivery',
                });
        $order->setAttribute('payment_status', $paymentStatus);
        $order->setAttribute(
            'payment_status_label',
            match ($paymentStatus) {
                'paid' => 'Paid at delivery',
                'cancelled' => 'Payment cancelled',
                'due_on_delivery' => 'Pay on delivery',
                default => 'Payment status unavailable',
            }
        );
        $order->unsetRelation('codCollection');
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
            'delivery_rider' => $delivery->delivery_picked_up_at && $delivery->courierProfile?->user ? [
                'name' => trim($delivery->courierProfile->user->first_name.' '.$delivery->courierProfile->user->last_name),
            ] : null,
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
                'preferred_scheduled_at' => $pickup->pickupBatch?->preferred_scheduled_at,
                'scheduled_at' => $pickup->scheduled_at,
                'assigned_at' => $pickup->assigned_at,
                'picked_up_at' => $pickup->picked_up_at,
                'received_at' => $pickup->received_at,
                'courier' => $pickup->courierProfile?->user ? [
                    'name' => trim($pickup->courierProfile->user->first_name.' '.$pickup->courierProfile->user->last_name),
                    'phone' => $pickup->courierProfile->user->phone,
                ] : null,
            ] : null,
            'events' => $delivery->events->map(function (DeliveryEvent $event) {
                $publicEvent = self::buyerEvent($event);

                return [
                    'event_type' => $event->event_type,
                    'previous_status' => $event->previous_status,
                    'new_status' => $event->new_status,
                    'label' => $publicEvent[0],
                    'description' => $publicEvent[1],
                    'hub' => $event->hub ? [
                        'name' => $event->hub->name,
                        'code' => $event->hub->code,
                    ] : null,
                    'created_at' => $event->created_at,
                ];
            })->values(),
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
        $event = $delivery->events()->create($values + ['created_at' => now()]);
        $event->loadMissing('hub');
        $notification = self::buyerNotification($event);
        if ($notification === null) {
            return;
        }

        $order = $delivery->order()->first();
        if ($order === null || $order->buyer_id === null) {
            return;
        }

        $buyerId = $order->buyer_id;
        $data = [
            'delivery_event_id' => $event->id,
            'order_id' => $order->id,
            'title' => $notification[0],
            'body' => $notification[1],
            'link' => '/orders/'.$order->id,
        ];

        \Illuminate\Support\Facades\DB::afterCommit(function () use ($buyerId, $data): void {
            $buyer = \App\Models\User::query()->find($buyerId);
            if ($buyer === null || $buyer->notifications()
                ->where('type', \App\Notifications\BuyerDeliveryMilestoneNotification::class)
                ->whereJsonContains('data->delivery_event_id', $data['delivery_event_id'])
                ->exists()) {
                return;
            }

            $buyer->notify(new \App\Notifications\BuyerDeliveryMilestoneNotification($data));
            \App\Jobs\SendBuyerDeliveryPush::dispatch($buyerId, $data);
        });
    }

    private static function buyerEvent(DeliveryEvent $event): array
    {
        $hubName = $event->hub?->name;
        $messages = [
            'pickup_assigned' => ['Pickup arranged', 'A courier has been assigned to pick up your parcel.'],
            'pickup_collected' => ['Parcel picked up', 'Your parcel has been picked up and is on its way to a hub.'],
            'sorting_center_received' => ['Received at hub', $hubName ? "Your parcel was received at {$hubName}." : 'Your parcel was received at a sorting hub.'],
            'sorted' => ['Parcel sorted', $hubName ? "Your parcel was sorted at {$hubName}." : 'Your parcel was sorted and is moving through the delivery network.'],
            'hub_transfer_departed' => ['Left a hub', $hubName ? "Your parcel left {$hubName} and is on its way to the next hub." : 'Your parcel is on its way to the next hub.'],
            'hub_transfer_arrived' => ['Arrived at a hub', $hubName ? "Your parcel arrived at {$hubName}." : 'Your parcel arrived at the next hub.'],
            'delivery_collected_from_sorting_center' => ['Out for delivery', 'Your parcel is with the delivery rider and on its way to you.'],
            'failed' => ['Delivery attempt unsuccessful', 'The delivery could not be completed. We will update you when the next step is arranged.'],
            'returned_after_max_delivery_attempts' => ['Parcel returning to seller', 'We could not complete delivery, so your parcel is being returned to the seller.'],
            'delivered_with_proof' => ['Parcel delivered', 'Your parcel has been marked as delivered.'],
            'buyer_receipt_confirmed' => ['Delivery confirmed', 'You confirmed that you received your parcel.'],
        ];

        return $messages[$event->event_type] ?? [
            'Order updated',
            $event->new_status
                ? 'Your order status is now '.str_replace('_', ' ', strtolower($event->new_status)).'.'
                : 'There is a new update for your order.',
        ];
    }

    private static function buyerNotification(DeliveryEvent $event): ?array
    {
        $notifications = [
            'pickup_collected',
            'sorting_center_received',
            'sorted',
            'hub_transfer_departed',
            'hub_transfer_arrived',
            'delivery_collected_from_sorting_center',
            'failed',
            'returned_after_max_delivery_attempts',
            'delivered_with_proof',
            'buyer_receipt_confirmed',
        ];
        if (! in_array($event->event_type, $notifications, true)) {
            return null;
        }

        return self::buyerEvent($event);
    }
}
