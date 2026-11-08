<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryRequest;
use App\Models\Order;
use App\Models\User;
use App\Services\CourierEligibility;
use App\Support\OrderDeliveryProjection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class DeliveryController extends Controller
{
    private function profile(User $user, CourierEligibility $eligibility)
    {
        abort_unless($user->role === 'rider' && $user->status === 'active' && $user->email_verified_at, 403, 'Courier account is not eligible to operate.');
        $profile = $user->courierProfile;
        abort_unless($profile && $eligibility->isEligible($profile), 403, 'Courier account or required documents are not approved.');

        return $profile;
    }

    private function detailQuery(): Builder
    {
        return Delivery::with([
            'order.items.product:id,name,image,weight_kg',
            'order.items.seller:id,first_name,last_name',
            'deliveryArea:id,name',
            'proof',
            'events',
            'order.codCollection',
        ]);
    }

    private function parcelData(Delivery $delivery): array
    {
        $order = $delivery->order;
        return [
            'id' => $delivery->id,
            'order_id' => $delivery->order_id,
            'parcel_code' => $delivery->parcel_code,
            'status' => $delivery->status,
            'delivery_type' => $delivery->delivery_type ?? 'via_sorting_center',
            'assigned_at' => $delivery->assigned_at,
            'delivery_picked_up_at' => $delivery->delivery_picked_up_at,
            'delivered_at' => $delivery->delivered_at,
            'failure_reason' => $delivery->failure_reason,
            'proof' => $delivery->proof ? [
                'recipient_full_name' => $delivery->proof->recipient_full_name,
                'captured_at' => $delivery->proof->captured_at,
            ] : null,
            'delivery_area' => $delivery->deliveryArea ? ['id' => $delivery->deliveryArea->id, 'name' => $delivery->deliveryArea->name] : null,
            'order' => $order ? [
                'id' => $order->id,
                'status' => $order->status,
                'payment_method' => $order->payment_method,
                'total_amount' => $order->total_amount,
                'cod_collection_status' => $order->codCollection?->status,
                'delivery_address' => $order->delivery_address,
                'items' => $order->items->map(fn ($item) => [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'unit_weight_kg' => $item->unit_weight_kg ?? $item->product?->weight_kg,
                    'product' => $item->product ? ['id' => $item->product->id, 'name' => $item->product->name, 'image' => $item->product->image, 'weight_kg' => $item->product->weight_kg] : null,
                ])->values(),
            ] : null,
            'events' => $delivery->events->map(fn ($event) => [
                'id' => $event->id, 'event_type' => $event->event_type,
                'previous_status' => $event->previous_status, 'new_status' => $event->new_status,
                'created_at' => $event->created_at,
            ])->values(),
        ];
    }

    public function index(Request $request, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request->user(), $eligibility);
        $deliveries = $this->detailQuery()
            ->where('courier_profile_id', $profile->id)
            ->whereIn('status', [Delivery::ASSIGNED, Delivery::OUT_FOR_DELIVERY])
            ->latest('updated_at')->get();

        return response()->json(['success' => true, 'data' => $deliveries->map(fn (Delivery $row) => $this->parcelData($row))->values()]);
    }

    public function history(Request $request, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request->user(), $eligibility);
        $deliveries = $this->detailQuery()
            ->where('courier_profile_id', $profile->id)
            ->whereIn('status', [Delivery::DELIVERED, Delivery::COMPLETED, Delivery::FAILED, 'RETURNED'])
            ->latest('updated_at')->get();

        return response()->json(['success' => true, 'data' => $deliveries->map(fn (Delivery $row) => $this->parcelData($row))->values()]);
    }

    public function show(Request $request, int $id, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request->user(), $eligibility);
        $delivery = $this->detailQuery()->where('courier_profile_id', $profile->id)->find($id);

        return $delivery
            ? response()->json(['success' => true, 'data' => $this->parcelData($delivery)])
            : response()->json(['success' => false, 'message' => 'Assigned delivery not found.'], 404);
    }

    public function updateStatus(Request $request, int $id, CourierEligibility $eligibility)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:OUT_FOR_DELIVERY,DELIVERY_FAILED'],
            'expected_status' => ['required', 'in:ASSIGNED_TO_RIDER,OUT_FOR_DELIVERY'],
            'reason' => ['nullable', 'string', 'max:1000'],
            'parcel_code' => ['required_if:status,'.Delivery::OUT_FOR_DELIVERY, 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
        ]);
        $reason = isset($validated['reason']) ? trim($validated['reason']) : null;
        if ($validated['status'] === Delivery::FAILED && !$reason) {
            return response()->json(['success' => false, 'message' => 'A reason is required for a failed delivery.', 'errors' => ['reason' => ['A reason is required.']]], 422);
        }

        $profile = $this->profile($request->user(), $eligibility);
        $initial = Delivery::where('courier_profile_id', $profile->id)->find($id);
        abort_unless($initial, 404, 'Assigned delivery not found.');
        $result = DB::transaction(function () use ($request, $id, $profile, $validated, $reason, $initial, $eligibility) {
            $order = Order::whereKey($initial->order_id)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('courier_profile_id', $profile->id)->whereKey($id)->lockForUpdate()->first();
            if (!$delivery) abort(404, 'Assigned delivery not found.');
            abort_unless($eligibility->isEligible($profile), 403, 'Courier eligibility changed. Contact an administrator.');
            if (isset($validated['parcel_code'])) {
                abort_unless(hash_equals((string) $delivery->parcel_code, $validated['parcel_code']), 422, 'The scanned parcel does not match this delivery assignment.');
            }

            $next = $validated['status'];
            if ($delivery->status === $next) {
                return $delivery->load(['order.items.product:id,name,image,weight_kg', 'events']);
            }
            if ($delivery->status !== $validated['expected_status']) {
                abort(409, 'The delivery status changed. Refresh before updating it again.');
            }
            $allowed = [
                Delivery::ASSIGNED => [Delivery::OUT_FOR_DELIVERY],
                Delivery::OUT_FOR_DELIVERY => [Delivery::DELIVERED, Delivery::FAILED],
            ];
            if (!in_array($next, $allowed[$validated['expected_status']] ?? [], true)) {
                abort(422, "Invalid delivery transition from {$validated['expected_status']} to {$next}.");
            }

            if ($order->status !== $delivery->status) {
                abort(409, 'Order and delivery status are out of sync. Contact an administrator.');
            }

            $previousStatus = $delivery->status;
            $changes = ['status' => $next, 'failure_reason' => $next === Delivery::FAILED ? $reason : null];
            if ($next === Delivery::OUT_FOR_DELIVERY) $changes['delivery_picked_up_at'] = now();
            if ($next === Delivery::DELIVERED) $changes['delivered_at'] = now();
            $delivery->update($changes);
            $order->update(['status' => $next]);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'event_type' => $next === Delivery::FAILED ? 'failed' : ($next === Delivery::OUT_FOR_DELIVERY ? 'delivery_collected_from_sorting_center' : 'status_changed'),
                'previous_status' => $previousStatus,
                'new_status' => $next,
                'previous_courier_profile_id' => $profile->id,
                'courier_profile_id' => $profile->id,
                'reason' => $reason,
            ]);

            return $delivery->load(['order.items.product:id,name,image,weight_kg', 'events']);
        });

        $result->load(['order.items.product:id,name,image,weight_kg', 'deliveryArea:id,name', 'events']);
        return response()->json(['success' => true, 'message' => 'Delivery status updated.', 'data' => $this->parcelData($result)]);
    }

    public function acceptDelivery(Request $request, int $id, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request->user(), $eligibility);
        $result = DB::transaction(function () use ($request, $id, $profile, $eligibility) {
            // Accept delivery_id parameter and find the pending DeliveryRequest for that delivery
            $deliveryRequest = DeliveryRequest::where('delivery_id', $id)
                ->where('rider_id', $request->user()->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();
            
            abort_unless($deliveryRequest, 404, 'Delivery request not found or already processed.');
            
            $delivery = Delivery::lockForUpdate()->find($deliveryRequest->delivery_id);
            abort_unless($delivery, 404, 'Delivery not found.');
            
            // Update delivery request status
            $deliveryRequest->update(['status' => 'accepted']);
            
            // Update delivery with rider and change status to assigned (if not already assigned)
            if ($delivery->status !== Delivery::ASSIGNED) {
                $delivery->update([
                    'status' => Delivery::ASSIGNED,
                    'courier_profile_id' => $profile->id,
                    'assigned_at' => now(),
                ]);
                
                // Update order status to match delivery
                Order::where('id', $delivery->order_id)->update(['status' => Delivery::ASSIGNED]);
                
                // Log event
                OrderDeliveryProjection::event($delivery, [
                    'actor_id' => $request->user()->id,
                    'event_type' => 'assigned_to_rider',
                    'previous_status' => $delivery->getOriginal('status'),
                    'new_status' => Delivery::ASSIGNED,
                    'courier_profile_id' => $profile->id,
                ]);
            }
            
            return $delivery->load(['order.items.product:id,name,image,weight_kg', 'deliveryArea:id,name', 'events']);
        });
        
        return response()->json(['success' => true, 'delivery' => $this->parcelData($result)]);
    }

    public function rejectDelivery(Request $request, int $id, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request->user(), $eligibility);
        $result = DB::transaction(function () use ($request, $id, $profile, $eligibility) {
            // Accept delivery_id parameter and find the pending DeliveryRequest for that delivery
            $deliveryRequest = DeliveryRequest::where('delivery_id', $id)
                ->where('rider_id', $request->user()->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();
            
            abort_unless($deliveryRequest, 404, 'Delivery request not found or already processed.');
            
            $delivery = Delivery::lockForUpdate()->find($deliveryRequest->delivery_id);
            abort_unless($delivery, 404, 'Delivery not found.');
            
            // Mark this delivery request as rejected
            $deliveryRequest->update(['status' => 'rejected']);
            
            // Find next online rider in queue (ordered by is_online DESC, last_activity_at DESC)
            $nextRider = User::where('role', 'rider')
                ->where('status', 'active')
                ->where('email_verified_at', '!=', null)
                ->where('id', '!=', $request->user()->id)
                ->where('is_online', 1)
                ->orderBy('last_activity_at', 'desc')
                ->first();
            
            $reassignedToRiderId = null;
            
            if ($nextRider) {
                // Create new delivery request with 1.5 hour expiry
                $newRequest = DeliveryRequest::create([
                    'delivery_id' => $delivery->id,
                    'rider_id' => $nextRider->id,
                    'status' => 'pending',
                    'expires_at' => now()->addSeconds(5400), // 1.5 hours
                ]);
                $reassignedToRiderId = $nextRider->id;
                
                // Send push notification to new rider
                $this->sendDeliveryNotification($nextRider, $delivery, $newRequest->id);
            } else {
                // No riders available - mark delivery as failed
                $delivery->update([
                    'status' => Delivery::FAILED,
                    'failure_reason' => 'No available riders',
                ]);
                Order::where('id', $delivery->order_id)->update(['status' => Delivery::FAILED]);
                
                // Log event
                OrderDeliveryProjection::event($delivery, [
                    'actor_id' => $request->user()->id,
                    'event_type' => 'failed',
                    'previous_status' => $delivery->status,
                    'new_status' => Delivery::FAILED,
                    'reason' => 'No available riders for delivery request',
                ]);
            }
            
            return [
                'reassigned_to_rider_id' => $reassignedToRiderId,
                'delivery' => $delivery,
            ];
        });
        
        return response()->json([
            'success' => true,
            'reassigned_to_rider_id' => $result['reassigned_to_rider_id'],
            'delivery' => $result['delivery'] ? $this->parcelData($result['delivery']) : null,
        ]);
    }

    private function sendDeliveryNotification(User $rider, Delivery $delivery, int $requestId)
    {
        // Send via push notification using Notification facade
        // This uses the existing PushToken system
        $notification = new \App\Notifications\DeliveryRequestNotification($delivery, $requestId);
        $rider->notify($notification);
    }

    public function setAvailability(Request $request)
    {
        $validated = $request->validate([
            'is_online' => ['required', 'in:0,1'],
        ]);

        $isOnline = (int) $validated['is_online'];
        
        $request->user()->update([
            'is_online' => $isOnline,
            'last_activity_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'is_online' => (bool) $isOnline,
        ]);
    }
}
