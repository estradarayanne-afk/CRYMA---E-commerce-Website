<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\ReturnShipment;
use App\Models\User;
use App\Services\CourierEligibility;
use App\Services\DeliveryAreaResolver;
use App\Support\OrderDeliveryProjection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $lastFailedAttempt = $delivery->events
            ->whereIn('event_type', ['failed', 'returned_after_max_delivery_attempts', 'returned_to_sender'])
            ->last();
        return [
            'id' => $delivery->id,
            'order_id' => $delivery->order_id,
            'parcel_code' => $delivery->parcel_code,
            'status' => $delivery->status,
            'delivery_attempts' => $delivery->events
                ->whereIn('event_type', ['failed', 'returned_after_max_delivery_attempts', 'returned_to_sender'])
                ->count(),
            'max_delivery_attempts' => Delivery::MAX_DELIVERY_ATTEMPTS,
            'next_delivery_attempt_at' => $delivery->next_delivery_attempt_at,
            'last_failure_resolution' => match ($lastFailedAttempt?->event_type) {
                'returned_to_sender', 'returned_after_max_delivery_attempts' => 'return_to_sender',
                'failed' => 'redeliver_tomorrow',
                default => null,
            },
            'delivery_attempt_history' => $delivery->events
                ->whereIn('event_type', ['failed', 'returned_after_max_delivery_attempts', 'returned_to_sender'])
                ->values()
                ->map(fn ($event, int $index) => [
                    'attempt' => $index + 1,
                    'resolution' => in_array($event->event_type, ['returned_to_sender', 'returned_after_max_delivery_attempts'], true)
                        ? 'return_to_sender'
                        : 'redeliver_tomorrow',
                    'reason' => $event->reason,
                    'occurred_at' => $event->created_at,
                ]),
            'return_shipment' => $delivery->returnShipment ? [
                'id' => $delivery->returnShipment->id,
                'status' => $delivery->returnShipment->status,
                'return_type' => $delivery->returnShipment->return_type,
            ] : null,
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

    public function scanForProof(Request $request, int $id, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'expected_status' => ['required', 'in:OUT_FOR_DELIVERY'],
            'parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
        ]);
        $profile = $this->profile($request->user(), $eligibility);

        DB::transaction(function () use ($request, $id, $profile, $values, $eligibility) {
            $initial = Delivery::where('courier_profile_id', $profile->id)->find($id);
            abort_unless($initial, 404, 'Assigned delivery not found.');

            $order = Order::whereKey($initial->order_id)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('courier_profile_id', $profile->id)->whereKey($id)->lockForUpdate()->first();
            abort_unless($delivery, 404, 'Assigned delivery not found.');
            abort_unless($eligibility->isEligible($profile), 403, 'Courier eligibility changed. Contact an administrator.');
            abort_unless(
                $delivery->status === Delivery::OUT_FOR_DELIVERY && $order->status === Delivery::OUT_FOR_DELIVERY,
                409,
                'Only an active delivery can be scanned for proof.',
            );
            abort_unless(
                hash_equals((string) $delivery->parcel_code, $values['parcel_code']),
                422,
                'The scanned parcel does not match this delivery assignment.',
            );

            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'event_type' => 'delivery_item_scanned_for_proof',
                'previous_status' => Delivery::OUT_FOR_DELIVERY,
                'new_status' => Delivery::OUT_FOR_DELIVERY,
                'courier_profile_id' => $profile->id,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Parcel scan confirmed. Capture the delivery photo next.',
        ]);
    }

    public function updateStatus(Request $request, int $id, CourierEligibility $eligibility, DeliveryAreaResolver $areaResolver)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:OUT_FOR_DELIVERY,DELIVERY_FAILED'],
            'expected_status' => ['required', 'in:ASSIGNED_TO_RIDER,OUT_FOR_DELIVERY'],
            'reason' => ['nullable', 'string', 'max:1000'],
            'parcel_code' => ['required_if:status,'.Delivery::OUT_FOR_DELIVERY, 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
            'failure_resolution' => ['sometimes', 'required', 'in:redeliver_tomorrow,return_to_sender'],
        ]);
        $reason = isset($validated['reason']) ? trim($validated['reason']) : null;
        if ($validated['status'] === Delivery::FAILED && !$reason) {
            return response()->json(['success' => false, 'message' => 'A reason is required for a failed delivery.', 'errors' => ['reason' => ['A reason is required.']]], 422);
        }

        $profile = $this->profile($request->user(), $eligibility);
        $initial = Delivery::where('courier_profile_id', $profile->id)->find($id);
        abort_unless($initial, 404, 'Assigned delivery not found.');
        $result = DB::transaction(function () use ($request, $id, $profile, $validated, $reason, $initial, $eligibility, $areaResolver) {
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

            $isDirectDelivery = $delivery->events()
                ->whereIn('event_type', ['direct_delivery_assigned', 'direct_delivery_reassigned'])
                ->exists();
            if ($next === Delivery::OUT_FOR_DELIVERY) {
                abort_unless(
                    !$delivery->next_delivery_attempt_at || !$delivery->next_delivery_attempt_at->isFuture(),
                    422,
                    'This redelivery is scheduled for a later date.',
                );
                if ($isDirectDelivery) {
                    abort_unless($delivery->current_hub_id, 409, 'The direct-delivery parcel is not assigned to a source hub.');
                    abort_unless(
                        $delivery->events()
                            ->whereIn('event_type', ['parcel_scanned', 'hub_transfer_arrived'])
                            ->where('hub_id', $delivery->current_hub_id)
                            ->exists(),
                        422,
                        'Scan this parcel at its current hub before accepting direct delivery.',
                    );
                } else {
                    $area = $delivery->deliveryArea()->with('hub')->first();
                    if (!$area) {
                        $route = $areaResolver->resolve($order->delivery_psgc_code);
                        $area = $route['status'] === 'mapped' ? $route['area'] : null;
                    }
                    abort_unless($area && $area->is_active && $area->hub?->is_active, 409, 'The parcel has no active final delivery hub.');
                    abort_unless(
                        $delivery->current_hub_id && (int) $delivery->current_hub_id === (int) $area->hub_id,
                        409,
                        'The parcel has not arrived at its final delivery hub.',
                    );
                    abort_unless(
                        $delivery->events()->where('event_type', 'parcel_scanned')
                            ->where('hub_id', $area->hub_id)->whereNotNull('actor_id')->exists(),
                        422,
                        'Scan this parcel at its final delivery hub before starting delivery.',
                    );
                }
            }

            $previousStatus = $delivery->status;
            $failedAttempts = $delivery->events()
                ->whereIn('event_type', ['failed', 'returned_after_max_delivery_attempts', 'returned_to_sender'])
                ->count();
            $failureResolution = $validated['failure_resolution'] ?? 'redeliver_tomorrow';
            $returnToSeller = $next === Delivery::FAILED && (
                $failureResolution === 'return_to_sender'
                || $failedAttempts + 1 >= Delivery::MAX_DELIVERY_ATTEMPTS
            );
            $resultingStatus = $returnToSeller ? Delivery::RETURNED : $next;
            $changes = ['status' => $resultingStatus, 'failure_reason' => $next === Delivery::FAILED ? $reason : null];
            if ($next === Delivery::OUT_FOR_DELIVERY) {
                $changes['delivery_picked_up_at'] = now();
                $changes['next_delivery_attempt_at'] = null;
            }
            if ($next === Delivery::DELIVERED) $changes['delivered_at'] = now();
            if ($next === Delivery::FAILED) {
                $changes['next_delivery_attempt_at'] = $returnToSeller ? null : now()->addDay()->startOfDay();
            }
            $delivery->update($changes);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'event_type' => $returnToSeller
                    ? ($failureResolution === 'return_to_sender' ? 'returned_to_sender' : 'returned_after_max_delivery_attempts')
                    : ($next === Delivery::FAILED ? 'failed' : ($next === Delivery::OUT_FOR_DELIVERY
                        ? ($isDirectDelivery ? 'direct_delivery_accepted' : 'delivery_collected_from_sorting_center')
                        : 'status_changed')),
                'previous_status' => $previousStatus,
                'new_status' => $resultingStatus,
                'previous_courier_profile_id' => $profile->id,
                'courier_profile_id' => $profile->id,
                'reason' => $reason,
            ]);
            if ($returnToSeller) {
                $sellerId = $order->items()->whereNotNull('seller_id')->value('seller_id');
                abort_unless($sellerId, 409, 'The seller for this order could not be determined; contact logistics support.');
                ReturnShipment::firstOrCreate(
                    ['delivery_id' => $delivery->id],
                    [
                        'refund_request_id' => null,
                        'return_type' => 'undeliverable',
                        'return_reason' => $reason,
                        'order_id' => $order->id,
                        'buyer_id' => $order->buyer_id,
                        'seller_id' => $sellerId,
                        'pickup_courier_profile_id' => $profile->id,
                        'status' => 'picked_up',
                        'picked_up_at' => now(),
                        'note' => $failureResolution === 'return_to_sender'
                            ? 'Parcel remains in the final-mile courier custody after a return-to-sender decision.'
                            : 'Parcel remains in the final-mile courier custody after three unsuccessful delivery attempts.',
                    ],
                );
                $returnShipment = $delivery->returnShipment()->firstOrFail();
                User::query()->where('role', 'logistics')->where('status', 'active')->get()->each(
                    fn (User $logistics) => $logistics->notify(new \App\Notifications\LogisticsReturnInitiatedNotification(
                        (int) $order->id,
                        (int) $delivery->id,
                        (int) $returnShipment->id,
                        (string) $reason,
                    )),
                );
            }
            $order->update(['status' => $resultingStatus]);

            return $delivery->load(['order.items.product:id,name,image,weight_kg', 'events']);
        });

        $result->load(['order.items.product:id,name,image,weight_kg', 'deliveryArea:id,name', 'events']);
        $directDeliveryAccepted = $result->status === Delivery::OUT_FOR_DELIVERY
            && $result->events->contains(fn ($event) => $event->event_type === 'direct_delivery_accepted');
        $message = $directDeliveryAccepted
            ? 'Direct delivery accepted. The parcel is now out for delivery.'
            : ($result->status === Delivery::RETURNED
            ? (($validated['failure_resolution'] ?? null) === 'return_to_sender'
                ? 'The parcel is being returned to the sender.'
                : 'Three delivery attempts were unsuccessful. The parcel is being returned to the seller.')
            : 'Delivery status updated.');

        return response()->json(['success' => true, 'message' => $message, 'data' => $this->parcelData($result)]);
    }
}
