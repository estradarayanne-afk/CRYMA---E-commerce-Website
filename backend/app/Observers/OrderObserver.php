<?php

namespace App\Observers;

use App\Models\Delivery;
use App\Models\Order;
use App\Models\User;
use App\Notifications\SellerActivityNotification;
use App\Support\CourierNotifier;

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

        // ── Courier notifications ──────────────────────────────────────────────
        // Only notify on transitions meaningful to the courier: assignment and
        // re-assignment. Status changes the courier initiates themselves (e.g.
        // OUT_FOR_DELIVERY, DELIVERED) are not echoed back as notifications.
        if (!in_array($status, ['ASSIGNED_TO_RIDER'], true)) return;

        $delivery = Delivery::where('order_id', $order->id)
            ->whereNotNull('courier_profile_id')
            ->latest('id')
            ->first();

        if (!$delivery || !$delivery->courier_profile_id) return;

        $courierUser = $delivery->courierProfile?->user;
        if (!$courierUser) return;

        CourierNotifier::notify(
            $courierUser,
            'New delivery assignment',
            "You have been assigned to deliver Order #{$order->id}.",
            ['type' => 'delivery_assigned', 'order_id' => $order->id, 'delivery_id' => $delivery->id],
        );
    }
}
