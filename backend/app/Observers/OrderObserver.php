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
