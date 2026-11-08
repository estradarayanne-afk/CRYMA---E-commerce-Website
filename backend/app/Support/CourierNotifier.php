<?php

namespace App\Support;

use App\Models\CourierProfile;
use App\Models\PushToken;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

/**
 * Sends a database notification to a courier and queues FCM push if tokens
 * are registered. Designed as a thin helper so all courier notification
 * dispatches go through one place.
 */
class CourierNotifier
{
    /**
     * Notify via database (visible in GET /courier/notifications) and,
     * when FCM is configured, via push notification.
     *
     * @param  User|int  $user  The courier's User record or user_id.
     * @param  string    $title
     * @param  string    $body
     * @param  array<string, mixed>  $extra  Extra data merged into the notification payload.
     */
    public static function notify(User|int $user, string $title, string $body, array $extra = []): void
    {
        if (is_int($user)) {
            $user = User::find($user);
        }

        if (!$user) {
            return;
        }

        try {
            $user->notify(new \App\Notifications\CourierEventNotification($title, $body, $extra));
        } catch (\Throwable $exception) {
            Log::warning('CourierNotifier: database notification failed.', [
                'user_id'   => $user->id,
                'exception' => $exception->getMessage(),
            ]);
        }

        // FCM push — only attempt if a server key is configured.
        $fcmKey = config('services.fcm.server_key');
        if (!$fcmKey) {
            return;
        }

        $tokens = PushToken::where('user_id', $user->id)->pluck('token')->all();
        if (empty($tokens)) {
            return;
        }

        static::sendFcm($fcmKey, $tokens, $title, $body, $extra);
    }

    /** @param string[] $tokens */
    private static function sendFcm(string $serverKey, array $tokens, string $title, string $body, array $extra): void
    {
        try {
            $client = new \GuzzleHttp\Client(['timeout' => 10]);
            $client->post('https://fcm.googleapis.com/fcm/send', [
                'headers' => [
                    'Authorization' => 'key=' . $serverKey,
                    'Content-Type'  => 'application/json',
                ],
                'json' => [
                    'registration_ids' => $tokens,
                    'notification'     => ['title' => $title, 'body' => $body],
                    'data'             => array_merge($extra, ['title' => $title, 'body' => $body]),
                ],
            ]);
        } catch (\Throwable $exception) {
            Log::warning('CourierNotifier: FCM push failed.', [
                'exception' => $exception->getMessage(),
            ]);
        }
    }
}
