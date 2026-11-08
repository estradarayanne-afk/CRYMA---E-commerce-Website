<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Generic courier event notification stored in the `notifications` table.
 * The mobile app reads these via GET /courier/notifications.
 */
class CourierEventNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $title,
        public readonly string $body,
        public readonly array  $extra = [],
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return array_merge($this->extra, [
            'title' => $this->title,
            'body'  => $this->body,
        ]);
    }
}
