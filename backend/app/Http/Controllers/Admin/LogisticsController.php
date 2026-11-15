<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\PickupBatch;
use App\Models\PickupAssignment;
use App\Services\CourierEligibility;
use App\Services\DeliveryAreaResolver;
use App\Services\HubProximity;
use App\Support\OrderDeliveryProjection;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LogisticsController extends Controller
{
    public function queue(CourierEligibility $eligibility, HubProximity $proximity, DeliveryAreaResolver $areaResolver)
    {
        $orderDetails = ['buyer:id,first_name,last_name', 'items.product:id,name,weight_kg', 'items.seller:id,first_name,last_name', 'items.seller.addresses'];
        $pickupOrders = Order::with($orderDetails)->where('status', 'READY_FOR_PICKUP')
            ->whereDoesntHave('pickupAssignment')
            ->where(fn ($query) => $query->whereDoesntHave('delivery')
                ->orWhereHas('delivery', fn ($delivery) => $delivery->where('legacy_imported', true)->where('status', 'READY_FOR_PICKUP')))
            ->latest()->get();
        $pickups = PickupAssignment::with([
            'order.buyer:id,first_name,last_name', 'order.items.product:id,name',
            'order.items.seller.addresses', 'courierProfile.user:id,first_name,last_name',
            'pickupBatch' => fn ($query) => $query->withCount('assignments'),
            'delivery.events.actor:id,first_name,last_name',
        ])->latest()->get();
        /** @var \Illuminate\Database\Eloquent\Collection<int, Order> $sortingOrders */
        $sortingOrders = Order::with([
            ...$orderDetails, 'delivery.deliveryArea', 'delivery.proof', 'delivery.pickupAssignment.courierProfile.user:id,first_name,last_name',
            'delivery.events.actor:id,first_name,last_name', 'delivery.courierProfile.user:id,first_name,last_name', 'delivery.currentHub:id,name,code', 'delivery.deliveryArea.hub:id,name,code',
        ])->where(function ($query) {
            $query->whereIn('status', [Delivery::AT_SORTING_CENTER, Delivery::SORTED, Delivery::ASSIGNED, Delivery::FAILED])
                ->orWhere(fn ($legacy) => $legacy->where('status', Delivery::PICKED_UP)->whereHas('delivery', fn ($delivery) => $delivery->where('legacy_imported', true)))
                ->orWhere(fn ($legacy) => $legacy->where('status', Delivery::OUT_FOR_DELIVERY)->whereHas('delivery', fn ($delivery) => $delivery->where('legacy_imported', true)->whereNull('courier_profile_id')));
        })
            ->whereHas('delivery')->latest()->get();
        $routes = $areaResolver->resolveMany($sortingOrders->pluck('delivery_psgc_code'));
        foreach ($sortingOrders as $order) {
            $route = $routes[$order->delivery_psgc_code ?? ''] ?? [
                'status' => 'missing_address_code',
                'area' => null,
            ];
            $storedArea = $order->delivery?->deliveryArea;
            if ($route['status'] === 'mapped' && $storedArea && (int) $storedArea->id !== (int) $route['area']->id) {
                $route['status'] = 'mapping_conflict';
            } elseif (
                !in_array($route['status'], ['mapped', 'mapping_conflict'], true)
                && $storedArea?->is_active
                && $storedArea->hub?->is_active
            ) {
                $route = [
                    'status' => 'manual_route',
                    'area' => $storedArea,
                    'source_status' => $route['status'],
                ];
            }
            $order->setAttribute('destination_route', $route);
        }
        $areas = DeliveryArea::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $deliveries = Delivery::with(['order:id,status', 'order.items.product:id,weight_kg', 'deliveryArea:id,name', 'courierProfile.user:id,first_name,last_name', 'pickupAssignment.courierProfile.user:id,first_name,last_name', 'events.actor:id,first_name,last_name', 'proof'])
            ->latest()->get();
        /** @var \Illuminate\Database\Eloquent\Collection<int, CourierProfile> $couriers */
        $couriers = $eligibility->profiles()->with(['user:id,first_name,last_name', 'vehicles:id,courier_profile_id,vehicle_type', 'deliveryAreas:id,name,is_active', 'presence'])
            ->orderBy('id')->get();
        $activeDeliveryCounts = Delivery::query()
            ->whereNotNull('courier_profile_id')
            ->whereIn('status', [Delivery::ASSIGNED, Delivery::PICKED_UP, Delivery::OUT_FOR_DELIVERY])
            ->select('courier_profile_id', DB::raw('COUNT(*) as active_delivery_count'))
            ->groupBy('courier_profile_id')
            ->pluck('active_delivery_count', 'courier_profile_id');
        $hubIds = $deliveries->pluck('current_hub_id')
            ->merge($sortingOrders->map(fn (Order $order) => $order->delivery?->current_hub_id))
            ->filter()->unique()->values();
        $hubs = LogisticsHub::whereIn('id', $hubIds)->get(['id', 'latitude', 'longitude', 'proximity_radius_km']);
        foreach ($couriers as $courier) {
            $courier->setAttribute('hub_proximity', $proximity->forCourier($courier, $hubs));
            $courier->setAttribute('is_available', (bool) $courier->presence?->is_available);
            $courier->setAttribute('active_delivery_count', (int) $activeDeliveryCounts->get($courier->id, 0));
            $courier->unsetRelation('presence');
        }

        return response()->json(['success' => true, 'data' => [
            'pickup_orders' => $pickupOrders,
            'pickup_assignments' => $pickups,
            'sorting_orders' => $sortingOrders,
            'deliveries' => $deliveries,
            'areas' => $areas,
            'eligible_pickup_couriers' => $couriers,
            'eligible_delivery_couriers' => $couriers,
        ]]);
    }

    public function areas()
    {
        return response()->json(['success' => true, 'data' => DeliveryArea::with([
            'hub:id,name,code,is_active',
            'couriers.user:id,first_name,last_name', 'couriers.vehicles:id,courier_profile_id,vehicle_type',
        ])->orderBy('name')->get()]);
    }

    public function storeArea(Request $request)
    {
        if (is_string($request->input('name'))) $request->merge(['name' => trim($request->input('name'))]);
        $values = $request->validate([
            'name' => ['required', 'string', 'max:100', 'not_regex:/^\s*$/', 'unique:delivery_areas,name'],
            'hub_id' => ['required', 'integer', 'exists:logistics_hubs,id'],
        ]);
        $area = DB::transaction(function () use ($values) {
            $hub = LogisticsHub::whereKey($values['hub_id'])->lockForUpdate()->firstOrFail();
            abort_unless($hub->is_active, 422, 'Select an active hub.');
            return DeliveryArea::create([
                'name' => trim($values['name']),
                'is_active' => true,
                'hub_id' => $hub->id,
            ]);
        });
        return response()->json(['success' => true, 'data' => $area->load('hub')], 201);
    }

    public function updateArea(Request $request, int $areaId)
    {
        $area = DeliveryArea::findOrFail($areaId);
        if (is_string($request->input('name'))) $request->merge(['name' => trim($request->input('name'))]);
        $values = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100', 'not_regex:/^\s*$/', Rule::unique('delivery_areas', 'name')->ignore($area->id)],
            'is_active' => ['sometimes', 'required', 'boolean'],
            'hub_id' => ['sometimes', 'required', 'integer', 'exists:logistics_hubs,id'],
        ]);
        abort_if($values === [], 422, 'Provide at least one delivery-area field to update.');
        $area = DB::transaction(function () use ($areaId, $values) {
            if (array_key_exists('hub_id', $values)) {
                $hub = LogisticsHub::whereKey($values['hub_id'])->lockForUpdate()->firstOrFail();
                abort_unless($hub->is_active, 422, 'Select an active hub.');
            }
            $area = DeliveryArea::whereKey($areaId)->lockForUpdate()->firstOrFail();
            $area->update($values);
            return $area->fresh()->load('hub');
        });
        return response()->json(['success' => true, 'data' => $area]);
    }

    public function assignCourierToArea(Request $request, int $areaId, CourierEligibility $eligibility)
    {
        $values = $request->validate(['courier_profile_id' => ['required', 'integer', 'exists:courier_profiles,id']]);
        $courier = $eligibility->find((int) $values['courier_profile_id']);
        abort_unless($courier !== null, 422, 'The selected courier is not eligible.');

        DB::transaction(function () use ($request, $areaId, $courier) {
            $area = DeliveryArea::whereKey($areaId)->lockForUpdate()->firstOrFail();
            $eligibleCourier = app(CourierEligibility::class)->find($courier->id);
            abort_unless($area->is_active, 422, 'Activate the delivery area before assigning couriers.');
            abort_unless($eligibleCourier !== null, 422, 'The selected courier is no longer eligible.');
            $area->couriers()->syncWithoutDetaching([$eligibleCourier->id => ['assigned_by' => $request->user()->id]]);
        });

        return response()->json(['success' => true, 'message' => 'Courier added to the delivery area.']);
    }

    public function removeCourierFromArea(int $areaId, int $courierProfileId)
    {
        DB::transaction(function () use ($areaId, $courierProfileId) {
            $area = DeliveryArea::whereKey($areaId)->lockForUpdate()->firstOrFail();
            abort_unless($area->couriers()->whereKey($courierProfileId)->exists(), 404, 'Courier is not assigned to this delivery area.');
            $area->couriers()->detach($courierProfileId);
        });
        return response()->json(['success' => true, 'message' => 'Courier removed from future assignments in this area.']);
    }

    public function assignPickup(Request $request, int $orderId, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'courier_profile_id' => ['required', 'integer', 'exists:courier_profiles,id'],
            'expected_courier_profile_id' => ['nullable', 'integer'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $courier = $eligibility->find((int) $values['courier_profile_id']);
        abort_unless($courier !== null, 422, 'The selected pickup rider is not eligible.');
        $reason = isset($values['reason']) ? trim($values['reason']) : null;
        $requestedSchedule = \Illuminate\Support\Carbon::parse($values['scheduled_at']);

        try {
            $assignment = DB::transaction(function () use ($request, $orderId, $values, $courier, $reason, $eligibility, $requestedSchedule) {
                $order = Order::with(['items.seller.addresses'])->whereKey($orderId)->lockForUpdate()->firstOrFail();
                $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->first();
                $assignment = PickupAssignment::where('order_id', $order->id)->lockForUpdate()->first();
                abort_unless($eligibility->find($courier->id) !== null, 422, 'The pickup rider is no longer eligible.');
                abort_unless($order->status === 'READY_FOR_PICKUP', 422, 'Only seller-ready orders can be assigned for pickup.');
                $courierChanged = false;
                $scheduleChanged = true;

                if ($assignment) {
                    abort_unless(in_array($assignment->status, [PickupAssignment::REQUESTED, PickupAssignment::ASSIGNED, PickupAssignment::ACCEPTED], true) && !$assignment->picked_up_at, 422, 'Pickup rider cannot be changed after collection.');
                    if ($assignment->status === PickupAssignment::REQUESTED) {
                        $previousCourier = null;
                        $previousAssignmentStatus = PickupAssignment::REQUESTED;
                    } else {
                        $courierChanged = (int) $assignment->courier_profile_id !== (int) $courier->id;
                        $scheduleChanged = !$assignment->scheduled_at || !$assignment->scheduled_at->equalTo($requestedSchedule);
                        if (!$courierChanged && !$scheduleChanged) return $assignment;
                        if ($courierChanged) {
                            abort_unless($request->filled('expected_courier_profile_id') && (int) $values['expected_courier_profile_id'] === (int) $assignment->courier_profile_id, 409, 'Pickup assignment changed. Refresh and try again.');
                            abort_unless($reason !== null && $reason !== '', 422, 'A reason is required when changing a pickup rider.');
                        }
                    }
                } else {
                    abort_unless(!$delivery || ($delivery->legacy_imported && $delivery->status === 'READY_FOR_PICKUP'), 409, 'This order already has a delivery record and cannot enter pickup assignment automatically.');
                    $delivery ??= Delivery::create(['order_id' => $order->id, 'status' => 'READY_FOR_PICKUP', 'legacy_imported' => false]);
                    $assignment = new PickupAssignment(['order_id' => $order->id, 'delivery_id' => $delivery->id]);
                }

                if (!$assignment->pickup_address) {
                    $address = $order->items->first()?->seller?->addresses?->sortByDesc('is_default')->first();
                    abort_unless($address, 422, 'Add a seller pickup address in Account Settings before assigning a courier.');
                    $assignment->pickup_address = collect([
                        $address->recipient_name ? 'Contact: '.$address->recipient_name : null,
                        $address->phone ? 'Phone: '.$address->phone : null,
                        implode(', ', array_filter([$address->house_number, $address->building_name, $address->unit_number, $address->street])),
                        $address->barangay, $address->municipality, $address->province, $address->region, $address->postal_code,
                    ])->filter()->implode(', ');
                }

                $previousCourier ??= $assignment->courier_profile_id;
                $previousAssignmentStatus ??= $assignment->exists ? $assignment->status : $order->status;
                $assignment->fill([
                    'courier_profile_id' => $courier->id,
                    'assigned_by' => $request->user()->id,
                    'status' => PickupAssignment::ASSIGNED,
                    'assigned_at' => now(),
                    'scheduled_at' => $requestedSchedule,
                ])->save();
                OrderDeliveryProjection::event($delivery, [
                    'actor_id' => $request->user()->id,
                    'event_type' => $previousCourier
                        ? ($scheduleChanged && !$courierChanged ? 'pickup_rescheduled' : 'pickup_reassigned')
                        : 'pickup_assigned',
                    'previous_status' => $previousAssignmentStatus,
                    'new_status' => PickupAssignment::ASSIGNED,
                    'previous_courier_profile_id' => $previousCourier,
                    'courier_profile_id' => $courier->id,
                    'reason' => $reason,
                ]);
                return $assignment->load(['order', 'courierProfile.user', 'delivery.events']);
            });
        } catch (QueryException $exception) {
            if (PickupAssignment::where('order_id', $orderId)->exists()) return response()->json(['success' => false, 'message' => 'Pickup assignment changed concurrently. Refresh and retry.'], 409);
            throw $exception;
        }

        return response()->json(['success' => true, 'message' => 'Pickup rider assigned.', 'data' => $assignment]);
    }

    public function assignPickupBatch(Request $request, int $batchId, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'courier_profile_id' => ['required', 'integer', 'exists:courier_profiles,id'],
            'expected_courier_profile_id' => ['nullable', 'integer'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $courier = $eligibility->find((int) $values['courier_profile_id']);
        abort_unless($courier !== null, 422, 'The selected pickup rider is not eligible.');
        $reason = isset($values['reason']) ? trim($values['reason']) : null;
        $requestedSchedule = \Illuminate\Support\Carbon::parse($values['scheduled_at']);

        $batch = DB::transaction(function () use ($request, $batchId, $values, $courier, $reason, $eligibility, $requestedSchedule) {
            $batch = PickupBatch::whereKey($batchId)->lockForUpdate()->firstOrFail();
            $assignmentIds = PickupAssignment::where('pickup_batch_id', $batch->id)->orderBy('order_id')->pluck('id');
            abort_unless($assignmentIds->count() >= 2, 409, 'This pickup batch no longer contains multiple parcels.');

            $orders = Order::whereIn('id', PickupAssignment::whereIn('id', $assignmentIds)->pluck('order_id'))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $deliveries = Delivery::whereIn('order_id', $orders->keys())->orderBy('order_id')->lockForUpdate()->get()->keyBy('order_id');
            /** @var \Illuminate\Database\Eloquent\Collection<int, PickupAssignment> $assignments */
            $assignments = PickupAssignment::whereIn('id', $assignmentIds)->orderBy('order_id')->lockForUpdate()->get();

            abort_unless($orders->count() === $assignmentIds->count(), 409, 'A pickup batch parcel is no longer available.');
            abort_unless($eligibility->isEligible($courier), 422, 'The pickup rider is no longer eligible.');
            abort_unless($assignments->every(fn (PickupAssignment $assignment) => in_array($assignment->status, [
                PickupAssignment::REQUESTED,
                PickupAssignment::ASSIGNED,
                PickupAssignment::ACCEPTED,
            ], true) && !$assignment->picked_up_at), 422, 'A pickup rider cannot be changed after collection.');

            foreach ($orders as $order) {
                $delivery = $deliveries->get($order->id);
                abort_unless($order->status === 'READY_FOR_PICKUP'
                    && $delivery
                    && $delivery->status === 'READY_FOR_PICKUP', 422, "Order #{$order->id} is no longer ready for pickup.");
            }

            $currentCourierId = $batch->courier_profile_id;
            $courierChanged = $currentCourierId !== null && (int) $currentCourierId !== (int) $courier->id;
            $scheduleChanged = !$batch->scheduled_at || !$batch->scheduled_at->equalTo($requestedSchedule);
            if ($currentCourierId !== null && !$courierChanged && !$scheduleChanged) {
                return $batch->load('assignments.order', 'assignments.courierProfile.user');
            }
            if ($courierChanged) {
                abort_unless($request->filled('expected_courier_profile_id')
                    && (int) $values['expected_courier_profile_id'] === (int) $currentCourierId, 409, 'Pickup batch assignment changed. Refresh and try again.');
                abort_unless($reason !== null && $reason !== '', 422, 'A reason is required when changing the pickup rider.');
            }

            $now = now();
            foreach ($assignments as $assignment) {
                $previousStatus = $assignment->status;
                $assignment->update([
                    'courier_profile_id' => $courier->id,
                    'assigned_by' => $request->user()->id,
                    'status' => PickupAssignment::ASSIGNED,
                    'assigned_at' => $now,
                    'scheduled_at' => $requestedSchedule,
                ]);
                OrderDeliveryProjection::event($deliveries->get($assignment->order_id), [
                    'actor_id' => $request->user()->id,
                    'event_type' => $currentCourierId
                        ? ($scheduleChanged && !$courierChanged ? 'pickup_rescheduled' : 'pickup_reassigned')
                        : 'pickup_assigned',
                    'previous_status' => $previousStatus,
                    'new_status' => PickupAssignment::ASSIGNED,
                    'previous_courier_profile_id' => $currentCourierId,
                    'courier_profile_id' => $courier->id,
                    'reason' => $reason,
                ]);
            }

            $batch->update([
                'courier_profile_id' => $courier->id,
                'assigned_by' => $request->user()->id,
                'status' => PickupBatch::ASSIGNED,
                'assigned_at' => $now,
                'scheduled_at' => $requestedSchedule,
            ]);

            return $batch->fresh()->load('assignments.order', 'assignments.courierProfile.user');
        });

        return response()->json([
            'success' => true,
            'message' => 'Pickup batch assigned to the courier.',
            'data' => $batch,
        ]);
    }

    public function sortAndAssign(Request $request, int $orderId, CourierEligibility $eligibility, DeliveryAreaResolver $areaResolver)
    {
        $values = $request->validate([
            'delivery_area_id' => ['nullable', 'integer', 'exists:delivery_areas,id'],
            'courier_profile_id' => ['nullable', 'integer', 'exists:courier_profiles,id'],
            'expected_status' => ['required', 'in:AT_SORTING_CENTER,SORTED'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $reason = isset($values['reason']) ? trim($values['reason']) : null;
        $courier = isset($values['courier_profile_id']) ? $eligibility->find((int) $values['courier_profile_id']) : null;
        if (isset($values['courier_profile_id'])) {
            abort_unless($courier, 422, 'Select an eligible courier.');
        }

        $result = DB::transaction(function () use ($request, $orderId, $values, $courier, $eligibility, $reason, $areaResolver) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->firstOrFail();
            $route = $areaResolver->resolve($order->delivery_psgc_code);
            $storedAreaId = $delivery->delivery_area_id;
            $areaId = $route['status'] === 'mapped'
                ? (int) $route['area']->id
                : ($values['delivery_area_id'] ?? $storedAreaId);

            if ($route['status'] === 'mapped') {
                abort_if(
                    isset($values['delivery_area_id']) && (int) $values['delivery_area_id'] !== (int) $route['area']->id,
                    409,
                    'The destination area is determined by the saved delivery address.',
                );
            } elseif (!$areaId) {
                abort(422, 'This parcel needs a routing exception review. Map its destination address to an active delivery area first.');
            } elseif ($order->delivery_psgc_code && !$reason) {
                abort(422, 'Add a reason when manually resolving an unmapped or ambiguous destination.');
            }

            $area = DeliveryArea::with('hub')->whereKey($areaId)->lockForUpdate()->firstOrFail();
            abort_unless($area->is_active, 422, 'This delivery area is inactive.');
            abort_unless($delivery->current_hub_id && $area->hub_id && $area->hub?->is_active, 409, 'The destination area is not mapped to an active hub.');
            abort_unless($order->status === $values['expected_status'] && $delivery->status === $order->status, 409, 'Parcel status changed. Refresh the logistics queue.');
            abort_unless(in_array($order->status, [Delivery::AT_SORTING_CENTER, Delivery::SORTED], true), 422, 'Only parcels at or processed by the sorting center can be assigned.');
            abort_unless($delivery->events()->where('event_type', 'parcel_scanned')->exists(), 422, 'Scan the parcel at the sorting center before sorting and assigning it.');

            $requiresTransfer = (int) $area->hub_id !== (int) $delivery->current_hub_id;
            if ($requiresTransfer) {
                abort_if($courier, 409, 'Assign the final-mile courier after the parcel reaches its destination hub.');
                if ($route['status'] !== 'mapped') {
                    abort_unless($reason !== null && $reason !== '', 422, 'Add a reason when manually routing a parcel to another hub.');
                }
                if ($order->status === Delivery::AT_SORTING_CENTER) {
                    app(\App\Services\ParcelSortingService::class)->transitionToSorted($delivery, $request->user(), $area->id);
                } else {
                    $delivery->update(['delivery_area_id' => $area->id]);
                }

                return [
                    'delivery' => $delivery->fresh()->load(['order', 'deliveryArea.hub', 'courierProfile.user', 'events.actor']),
                    'transfer_required' => true,
                ];
            }

            abort_unless($courier && $eligibility->find($courier->id) && $eligibility->isEligibleForArea($courier, $area->id), 422, 'Select a courier eligible for the automatically routed delivery area.');

            if ($order->status === Delivery::AT_SORTING_CENTER) {
                app(\App\Services\ParcelSortingService::class)->transitionToSorted($delivery, $request->user(), $area->id);
            } else {
                $delivery->update(['delivery_area_id' => $area->id]);
            }
            // Sorting may have advanced both the delivery and order from
            // AT_SORTING_CENTER to SORTED in the shared domain service.
            $previousStatus = $delivery->status;
            $previousCourier = $delivery->courier_profile_id;
            $delivery->update([
                'courier_profile_id' => $courier->id,
                'assigned_by' => $request->user()->id,
                'status' => Delivery::ASSIGNED,
                'assigned_at' => now(),
                'failure_reason' => null,
            ]);
            $order->update(['status' => Delivery::ASSIGNED]);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'event_type' => $previousStatus === Delivery::FAILED ? 'retry_assigned' : ($previousCourier ? 'reassigned' : 'delivery_assigned'),
                'previous_status' => $previousStatus,
                'new_status' => Delivery::ASSIGNED,
                'previous_courier_profile_id' => $previousCourier,
                'courier_profile_id' => $courier->id,
                'reason' => $reason,
            ]);

            return [
                'delivery' => $delivery->load(['order', 'deliveryArea.hub', 'courierProfile.user', 'events.actor']),
                'transfer_required' => false,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => $result['transfer_required']
                ? 'Parcel sorted and automatically routed. Create a transfer to its destination hub before assigning final-mile delivery.'
                : 'Parcel automatically routed, sorted, and assigned to an area courier.',
            'data' => $result['delivery'],
        ]);
    }

    public function scanParcel(Request $request, int $orderId)
    {
        $values = $request->validate([
            'expected_status' => ['required', 'in:AT_SORTING_CENTER,SORTED'],
            'parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
        ]);
        $delivery = DB::transaction(function () use ($request, $orderId, $values) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('parcel_code', $values['parcel_code'])->lockForUpdate()->firstOrFail();
            abort_unless((int) $delivery->order_id === (int) $order->id, 422, 'The scanned parcel does not match this order.');
            abort_unless($order->status === $values['expected_status'] && $delivery->status === $values['expected_status'], 409, 'Parcel status changed. Refresh the queue before scanning.');
            abort_unless($delivery->current_hub_id, 409, 'Parcel must be received at a hub before sorting-center scanning.');

            if (!$delivery->events()->where('event_type', 'parcel_scanned')->where('hub_id', $delivery->current_hub_id)->exists()) {
                OrderDeliveryProjection::event($delivery, [
                    'actor_id' => $request->user()->id,
                    'hub_id' => $delivery->current_hub_id,
                    'event_type' => 'parcel_scanned',
                    'previous_status' => $values['expected_status'],
                    'new_status' => $values['expected_status'],
                    'reason' => 'Parcel scanned at sorting center.',
                ]);
            }

            return $delivery->load(['order', 'deliveryArea', 'events.actor']);
        });

        return response()->json(['success' => true, 'message' => 'Parcel scanned. Its destination area is matched from the saved delivery address; resolve any routing exception before dispatch.', 'data' => $delivery]);
    }

    public function resolveAndScanParcel(Request $request)
    {
        $values = $request->validate(['parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/']]);
        $delivery = Delivery::where('parcel_code', $values['parcel_code'])->firstOrFail();
        $request->merge(['expected_status' => $delivery->status]);

        return $this->scanParcel($request, (int) $delivery->order_id);
    }

    public function reassignDelivery(Request $request, int $orderId, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'courier_profile_id' => ['required', 'integer', 'exists:courier_profiles,id'],
            'delivery_area_id' => ['required', 'integer', 'exists:delivery_areas,id'],
            'expected_courier_profile_id' => ['present', 'nullable', 'integer'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $courier = $eligibility->find((int) $values['courier_profile_id']);
        abort_unless($courier && $eligibility->isEligibleForArea($courier, (int) $values['delivery_area_id']), 422, 'The selected courier is not eligible for this delivery area.');
        $reason = isset($values['reason']) ? trim($values['reason']) : null;

        $delivery = DB::transaction(function () use ($request, $orderId, $values, $courier, $eligibility, $reason) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->firstOrFail();
            $area = DeliveryArea::whereKey($values['delivery_area_id'])->lockForUpdate()->firstOrFail();
            abort_unless($area->is_active, 422, 'This delivery area is inactive.');
            $legacyOutForDelivery = $order->status === Delivery::OUT_FOR_DELIVERY
                && $delivery->legacy_imported && !$delivery->courier_profile_id;
            abort_unless((in_array($order->status, [Delivery::ASSIGNED, Delivery::FAILED], true) || $legacyOutForDelivery)
                && $delivery->status === $order->status, 422, 'This parcel cannot be assigned in its current state.');
            abort_unless($order->status === Delivery::FAILED || !$delivery->delivery_picked_up_at, 422, 'A delivery rider cannot be reassigned after collecting the parcel.');
            abort_unless((int) ($delivery->courier_profile_id ?? 0) === (int) ($values['expected_courier_profile_id'] ?? 0), 409, 'The delivery assignment changed. Refresh and try again.');
            abort_unless($eligibility->find($courier->id) && $eligibility->isEligibleForArea($courier, $area->id), 422, 'The courier is no longer eligible for this area.');

            $isRetry = $order->status === Delivery::FAILED;
            $isReassign = $delivery->courier_profile_id !== null;
            if ($isRetry || $isReassign || $legacyOutForDelivery) abort_unless($reason !== null && $reason !== '', 422, 'A reason is required when retrying, reassigning, or reconciling a delivery.');
            if (!$isRetry && !$isReassign && $delivery->legacy_imported !== true) abort(422, 'Only legacy unassigned deliveries may be reconciled here.');

            if ((int) ($delivery->courier_profile_id ?? 0) === (int) $courier->id
                && (int) ($delivery->delivery_area_id ?? 0) === (int) $area->id
                && !$isRetry) {
                return $delivery;
            }

            $previousStatus = $delivery->status;
            $previousCourier = $delivery->courier_profile_id;
            $delivery->update([
                'delivery_area_id' => $area->id,
                'courier_profile_id' => $courier->id,
                'assigned_by' => $request->user()->id,
                'status' => $legacyOutForDelivery ? Delivery::OUT_FOR_DELIVERY : Delivery::ASSIGNED,
                'assigned_at' => now(),
                'delivery_picked_up_at' => $legacyOutForDelivery ? $delivery->delivery_picked_up_at : null,
                'delivered_at' => null,
                'failure_reason' => null,
            ]);
            if (!$legacyOutForDelivery) $order->update(['status' => Delivery::ASSIGNED]);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'event_type' => $legacyOutForDelivery ? 'legacy_current_delivery_reconciled' : ($isRetry ? 'retry_assigned' : ($isReassign ? 'reassigned' : 'legacy_reconciled')),
                'previous_status' => $previousStatus,
                'new_status' => $legacyOutForDelivery ? Delivery::OUT_FOR_DELIVERY : Delivery::ASSIGNED,
                'previous_courier_profile_id' => $previousCourier,
                'courier_profile_id' => $courier->id,
                'reason' => $reason,
            ]);
            return $delivery->load(['order', 'deliveryArea', 'courierProfile.user', 'events.actor']);
        });

        return response()->json(['success' => true, 'message' => 'Delivery assignment saved.', 'data' => $delivery]);
    }

    public function confirmLegacySortingReceipt(Request $request, int $orderId)
    {
        $values = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
            'hub_id' => ['required', 'integer', 'exists:logistics_hubs,id'],
        ]);
        $reason = trim($values['reason']);
        abort_unless($reason !== '', 422, 'A verification note is required.');
        $delivery = DB::transaction(function () use ($request, $orderId, $reason, $values) {
            $hub = LogisticsHub::whereKey($values['hub_id'])->lockForUpdate()->firstOrFail();
            abort_unless($hub->is_active, 422, 'Select an active hub.');
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->firstOrFail();
            abort_unless($delivery->legacy_imported && $delivery->status === Delivery::PICKED_UP && $order->status === Delivery::PICKED_UP, 409, 'Only legacy parcels marked picked up can be verified here.');
            abort_unless(!$order->pickupAssignment()->exists(), 409, 'This parcel has an active pickup assignment.');

            $delivery->update(['status' => Delivery::AT_SORTING_CENTER, 'current_hub_id' => $hub->id]);
            $order->update(['status' => Delivery::AT_SORTING_CENTER]);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'hub_id' => $hub->id,
                'event_type' => 'legacy_sorting_receipt_verified',
                'previous_status' => Delivery::PICKED_UP,
                'new_status' => Delivery::AT_SORTING_CENTER,
                'reason' => $reason,
            ]);
            return $delivery->load(['order', 'events.actor']);
        });

        return response()->json(['success' => true, 'message' => 'Current sorting-center receipt verification was recorded.', 'data' => $delivery]);
    }
}
