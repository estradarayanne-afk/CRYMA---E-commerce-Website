<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LogisticsReturnInitiatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly int $orderId,
        private readonly int $deliveryId,
        private readonly int $returnShipmentId,
        private readonly string $reason,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'delivery_return_initiated',
            'title' => 'Parcel returning to sender',
            'body' => "Order #{$this->orderId} was marked for return to sender.",
            'order_id' => $this->orderId,
            'delivery_id' => $this->deliveryId,
            'return_shipment_id' => $this->returnShipmentId,
            'reason' => $this->reason,
            'link' => '/logistics/parcel-flow',
        ];
    }
}
