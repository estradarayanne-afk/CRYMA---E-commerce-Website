<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LogisticsPickupReadyNotification extends Notification
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
            'message' => "Order #{$this->orderId} is ready for pickup. Review it and assign a courier.",
            'type' => 'seller_pickup_ready',
            'link' => '/logistics/pickups',
            'order_id' => $this->orderId,
        ];
    }
}
