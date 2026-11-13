<?php

namespace App\Observers;

use App\Models\Order;
use App\Models\User;
use App\Notifications\SellerActivityNotification;

class OrderObserver
{
    public function updated(Order $order): void
    {
        if (!$order->wasChanged('status')) return;

        $status = strtoupper((string) $order->status);
        // These transitions are performed by the seller, who already initiated the action.
        if (in_array($status, ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'], true)) return;

        $sellerIds = $order->items()->whereNotNull('seller_id')->distinct()->pluck('seller_id');
        $sellers = User::query()->whereIn('id', $sellerIds)->where('role', 'seller')->get();
        foreach ($sellers as $seller) {
            $autoReturn = $status === 'RETURNED'
                && \App\Models\Delivery::query()
                    ->where('order_id', $order->id)
                    ->whereHas('events', fn ($query) => $query->where('event_type', 'returned_after_max_delivery_attempts'))
                    ->exists();
            if ($autoReturn) {
                $seller->notify(new SellerActivityNotification(
                    'Parcel returning to your store',
                    "Order #{$order->id} had three unsuccessful delivery attempts. The parcel is with CRYMA Logistics and is being routed back to your store.",
                    'parcel_returning_to_seller',
                    '/seller/returns',
                    [
                        'order_id' => $order->id,
                        'order_status' => $status,
                        'delivery_attempts' => \App\Models\Delivery::MAX_DELIVERY_ATTEMPTS,
                    ],
                ));
                continue;
            }

            $seller->notify(new SellerActivityNotification(
                'Order status updated',
                "Order #{$order->id} status changed to ".str_replace('_', ' ', strtolower($status)).'.',
                'order_status_updated',
                '/seller/orders',
                ['order_id' => $order->id, 'order_status' => $status],
            ));
        }
    }
}
