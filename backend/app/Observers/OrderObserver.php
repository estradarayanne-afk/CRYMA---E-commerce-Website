<?php

namespace App\Observers;

use App\Models\Delivery;
use App\Models\Order;
use App\Models\User;
use App\Notifications\SellerActivityNotification;

class OrderObserver
{
    public function updated(Order $order): void
    {
        if (!$order->wasChanged('status')) return;

        $status = strtoupper((string) $order->status);
        if ($status === 'READY_FOR_PICKUP') return;

        // These transitions are performed by the seller, who already initiated the action.
        if (in_array($status, ['CONFIRMED', 'PREPARING'], true)) return;

        $sellerIds = $order->items()->whereNotNull('seller_id')->distinct()->pluck('seller_id');
        $sellers = User::query()->whereIn('id', $sellerIds)->where('role', 'seller')->get();
        $delivery = $status === 'RETURNED'
            ? Delivery::query()->where('order_id', $order->id)->first()
            : null;
        $returnEvent = $delivery
            ? $delivery->events()->whereIn('event_type', ['returned_after_max_delivery_attempts', 'returned_to_sender', 'resolved_return'])
                ->latest('created_at')->first()
            : null;
        foreach ($sellers as $seller) {
            if ($returnEvent) {
                $automaticReturn = $returnEvent->event_type === 'returned_after_max_delivery_attempts';
                $administratorReturn = $returnEvent->event_type === 'resolved_return';
                $attempts = $delivery->events()
                        ->whereIn('event_type', ['failed', 'returned_after_max_delivery_attempts', 'returned_to_sender'])
                        ->count();
                $seller->notify(new SellerActivityNotification(
                    'Parcel returning to your store',
                        $automaticReturn
                            ? "Order #{$order->id} had three unsuccessful delivery attempts. The parcel is with CRYMA Logistics and is being routed back to your store."
                            : ($administratorReturn
                                ? "Order #{$order->id} was returned by an administrator decision. The parcel is with CRYMA Logistics and is being routed back to your store."
                                : "Order #{$order->id} was marked for return to sender. The parcel is with CRYMA Logistics and is being routed back to your store."),
                    'parcel_returning_to_seller',
                    '/seller/returns',
                    [
                        'order_id' => $order->id,
                        'order_status' => $status,
                            'delivery_attempts' => $attempts,
                    ],
                ));
                continue;
            }

            $delivered = $status === 'DELIVERED';
            $seller->notify(new SellerActivityNotification(
                $delivered ? 'Successful delivery confirmed' : 'Order status updated',
                $delivered
                    ? "Order #{$order->id} was successfully delivered. View the delivery photo in Parcel messages."
                    : "Order #{$order->id} status changed to ".str_replace('_', ' ', strtolower($status)).'.',
                $delivered ? 'delivery_completed' : 'order_status_updated',
                $delivered ? '/seller/delivery-chats' : '/seller/orders',
                ['order_id' => $order->id, 'order_status' => $status],
            ));
        }
    }
}
