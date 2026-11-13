<?php

namespace App\Jobs;

use App\Models\BuyerPushToken;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class SendBuyerDeliveryPush implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly int $buyerId,
        private readonly array $payload,
    ) {}

    public function handle(): void
    {
        $projectId = (string) config('firebase.project_id');
        $credentialsPath = (string) config('firebase.credentials');
        if ($projectId === '' || $credentialsPath === '') {
            Log::warning('Delivery push skipped because Firebase is not configured.', [
                'buyer_id' => $this->buyerId,
                'order_id' => $this->payload['order_id'] ?? null,
            ]);

            return;
        }

        $tokens = BuyerPushToken::query()
            ->where('user_id', $this->buyerId)
            ->get();
        if ($tokens->isEmpty()) {
            return;
        }

        $credentials = new ServiceAccountCredentials(
            'https://www.googleapis.com/auth/firebase.messaging',
            $credentialsPath
        );
        $accessToken = $credentials->fetchAuthToken()['access_token'] ?? null;
        if (!is_string($accessToken) || $accessToken === '') {
            throw new RuntimeException('Firebase did not return an access token for delivery push.');
        }

        $endpoint = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";
        foreach ($tokens as $deviceToken) {
            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->post($endpoint, [
                    'message' => [
                        'token' => $deviceToken->token,
                        'notification' => [
                            'title' => $this->payload['title'],
                            'body' => $this->payload['body'],
                        ],
                        'data' => [
                            'type' => 'delivery_update',
                            'order_id' => (string) $this->payload['order_id'],
                            'link' => (string) $this->payload['link'],
                        ],
                    ],
                ]);

            if ($response->successful()) {
                continue;
            }

            $errorCode = collect($response->json('error.details', []))
                ->firstWhere('errorCode', 'UNREGISTERED')['errorCode'] ?? null;
            if ($errorCode === 'UNREGISTERED') {
                $deviceToken->delete();
                continue;
            }

            Log::error('Firebase rejected a buyer delivery push.', [
                'buyer_id' => $this->buyerId,
                'order_id' => $this->payload['order_id'] ?? null,
                'http_status' => $response->status(),
                'error' => $response->json('error.message'),
            ]);
        }
    }
}
