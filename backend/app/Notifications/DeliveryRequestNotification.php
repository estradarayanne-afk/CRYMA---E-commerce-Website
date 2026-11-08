<?php

namespace App\Notifications;

use App\Models\Delivery;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Delivery request notification sent to courier when a delivery request is assigned.
 */
class DeliveryRequestNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Delivery $delivery,
        public readonly int $deliveryRequestId,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => 'New Delivery Request',
            'body' => 'You have a new delivery request to address ' . ($this->delivery->order?->delivery_address ?? 'Unknown'),
            'delivery_id' => $this->delivery->id,
            'delivery_request_id' => $this->deliveryRequestId,
            'parcel_code' => $this->delivery->parcel_code,
        ];
    }
}
