<?php

namespace App\Jobs;

use App\Models\Delivery;
use App\Models\DeliveryRequest;
use App\Models\Order;
use App\Models\User;
use App\Support\OrderDeliveryProjection;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckExpiredDeliveryRequests implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $expiredRequests = DeliveryRequest::where('status', 'pending')
            ->where('expires_at', '<', now())
            ->with('delivery', 'rider')
            ->get();

        foreach ($expiredRequests as $request) {
            DB::transaction(function () use ($request) {
                // Lock and refresh to ensure it's still pending and expired
                $lockedRequest = DeliveryRequest::lockForUpdate()
                    ->where('id', $request->id)
                    ->where('status', 'pending')
                    ->first();

                if (!$lockedRequest || $lockedRequest->expires_at > now()) {
                    return; // Already processed or extended
                }

                // Update status to expired
                $lockedRequest->update(['status' => 'expired']);

                $delivery = Delivery::lockForUpdate()->find($request->delivery_id);
                if (!$delivery) {
                    return; // Delivery already handled
                }

                // Find next online rider in queue
                $nextRider = User::where('role', 'rider')
                    ->where('status', 'active')
                    ->where('email_verified_at', '!=', null)
                    ->where('id', '!=', $request->rider_id)
                    ->where('is_online', 1)
                    ->orderBy('last_activity_at', 'desc')
                    ->first();

                if ($nextRider) {
                    // Create new delivery request with 1.5 hour expiry
                    DeliveryRequest::create([
                        'delivery_id' => $delivery->id,
                        'rider_id' => $nextRider->id,
                        'status' => 'pending',
                        'expires_at' => now()->addSeconds(5400), // 1.5 hours
                    ]);

                    // Send push notification to new rider
                    $notification = new \App\Notifications\DeliveryRequestNotification($delivery, $delivery->id);
                    $nextRider->notify($notification);

                    Log::info('Delivery request reassigned after expiry', [
                        'delivery_id' => $delivery->id,
                        'expired_rider_id' => $request->rider_id,
                        'new_rider_id' => $nextRider->id,
                    ]);
                } else {
                    // No riders available - mark delivery as failed and set retry for tomorrow
                    $delivery->update([
                        'status' => Delivery::FAILED,
                        'failure_reason' => 'No available riders after multiple attempts',
                    ]);
                    Order::where('id', $delivery->order_id)->update(['status' => Delivery::FAILED]);

                    // Log event
                    OrderDeliveryProjection::event($delivery, [
                        'actor_id' => null, // System event
                        'event_type' => 'failed',
                        'previous_status' => 'pending',
                        'new_status' => Delivery::FAILED,
                        'reason' => 'No available riders for delivery',
                    ]);

                    Log::info('Delivery marked as failed after request expiry', [
                        'delivery_id' => $delivery->id,
                        'reason' => 'No available riders',
                    ]);
                }
            });
        }

        Log::info('Checked expired delivery requests', [
            'expired_count' => $expiredRequests->count(),
        ]);
    }
}
