<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryLocation;
use App\Models\DeliveryRequest;
use App\Models\Order;
use Illuminate\Http\Request;

/**
 * Exposes parcel tracking information to the buyer through the existing API.
 * The buyer must own the order; no delivery/courier details are leaked.
 */
class TrackingController extends Controller
{
    public function show(Request $request, int $orderId)
    {
        $buyer = $request->user();
        abort_unless($buyer->role === 'buyer', 403, 'Only buyers can access parcel tracking.');

        $order = Order::where('user_id', $buyer->id)
            ->with(['delivery.events'])
            ->findOrFail($orderId);

        $delivery = $order->delivery;

        $location = null;
        $history  = [];
        if ($delivery) {
            $location = $delivery->last_lat !== null ? [
                'latitude'    => (float) $delivery->last_lat,
                'longitude'   => (float) $delivery->last_lng,
                'captured_at' => $delivery->last_location_at,
            ] : null;

            $history = DeliveryLocation::where('delivery_id', $delivery->id)
                ->orderBy('captured_at')
                ->get(['latitude', 'longitude', 'accuracy_meters', 'captured_at'])
                ->map(fn ($loc) => [
                    'latitude'       => (float) $loc->latitude,
                    'longitude'      => (float) $loc->longitude,
                    'accuracy_meters'=> $loc->accuracy_meters,
                    'captured_at'    => $loc->captured_at,
                ])->values();
        }

        $events = $delivery?->events->map(fn ($e) => [
            'event_type'      => $e->event_type,
            'previous_status' => $e->previous_status,
            'new_status'      => $e->new_status,
            'created_at'      => $e->created_at,
        ])->values() ?? collect();

        // Include delivery type and request history in timeline
        $timeline = [];
        
        if ($delivery) {
            // Add delivery type information
            $timeline[] = [
                'type' => 'delivery_method',
                'delivery_type' => $delivery->delivery_type ?? 'sorting_center',
                'timestamp' => $delivery->created_at,
                'description' => $delivery->delivery_type === 'direct' 
                    ? 'Direct delivery selected'
                    : 'Scheduled for sorting center',
            ];
            
            // Add delivery requests history
            $requests = DeliveryRequest::where('delivery_id', $delivery->id)
                ->orderBy('created_at')
                ->get();
            
            foreach ($requests as $request_item) {
                $timeline[] = [
                    'type' => 'delivery_request',
                    'status' => $request_item->status,
                    'sent_at' => $request_item->created_at,
                    'expires_at' => $request_item->expires_at,
                    'time_remaining' => $request_item->expires_at && now() < $request_item->expires_at
                        ? $request_item->expires_at->diffForHumans(now(), true)
                        : null,
                ];
            }
            
            // Sort timeline by timestamp
            usort($timeline, function ($a, $b) {
                $timeA = $a['timestamp'] ?? $a['sent_at'] ?? now();
                $timeB = $b['timestamp'] ?? $b['sent_at'] ?? now();
                return $timeA <=> $timeB;
            });
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'order_id'        => $order->id,
                'order_status'    => $order->status,
                'delivery_status' => $delivery?->status,
                'parcel_code'     => $delivery?->parcel_code,
                'delivery_type'   => $delivery?->delivery_type,
                'latest_location' => $location,
                'history'         => $history,
                'events'          => $events,
                'timeline'        => $timeline,
            ],
        ]);
    }
}
