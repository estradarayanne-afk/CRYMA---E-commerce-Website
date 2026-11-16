<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class CourierParcelAssignedNotification extends Notification
{
    public function __construct(
        private readonly string $taskType,
        private readonly int $taskId,
        private readonly int $orderId,
        private readonly ?string $scheduledAt = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $isPickup = $this->taskType === 'pickup';

        return [
            'notification_type' => 'parcel_assigned',
            'title' => $isPickup ? 'Pickup assigned' : 'Delivery assigned',
            'message' => $isPickup
                ? "Pickup for order #{$this->orderId} has been assigned to you."
                : "Order #{$this->orderId} has been assigned to you for delivery.",
            'task_type' => $this->taskType,
            'task_id' => $this->taskId,
            'order_id' => $this->orderId,
            'scheduled_at' => $this->scheduledAt,
        ];
    }
}
