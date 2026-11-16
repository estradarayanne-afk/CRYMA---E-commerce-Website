<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LogisticsPickupRequestedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly int $orderId) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'New pickup request',
            'message' => "The seller requested courier pickup for order #{$this->orderId}. Review it and assign a courier.",
            'type' => 'seller_pickup_requested',
            'link' => '/logistics/pickups',
            'order_id' => $this->orderId,
        ];
    }
}
