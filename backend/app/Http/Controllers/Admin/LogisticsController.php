<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\Order;
use App\Models\PickupAssignment;
use App\Services\CourierEligibility;
use App\Support\OrderDeliveryProjection;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LogisticsController extends Controller
{
    public function queue(CourierEligibility $eligibility)
    {
        $orderDetails = ['buyer:id,first_name,last_name', 'items.product:id,name', 'items.seller:id,first_name,last_name'];
        $pickupOrders = Order::with($orderDetails)->where('status', 'READY_FOR_PICKUP')
            ->whereDoesntHave('pickupAssignment')
            ->where(fn ($query) => $query->whereDoesntHave('delivery')
                ->orWhereHas('delivery', fn ($delivery) => $delivery->where('legacy_imported', true)->where('status', 'READY_FOR_PICKUP')))
            ->latest()->get();
        $pickups = PickupAssignment::with([
            'order.buyer:id,first_name,last_name', 'order.items.product:id,name',
            'order.items.seller.addresses', 'courierProfile.user:id,first_name,last_name',
            'delivery.events.actor:id,first_name,last_name',
        ])->latest()->get();
        $sortingOrders = Order::with([
            ...$orderDetails, 'delivery.deliveryArea', 'delivery.proof', 'delivery.pickupAssignment.courierProfile.user:id,first_name,last_name',
            'delivery.events.actor:id,first_name,last_name', 'delivery.courierProfile.user:id,first_name,last_name',
        ])->where(function ($query) {
            $query->whereIn('status', [Delivery::AT_SORTING_CENTER, Delivery::SORTED, Delivery::ASSIGNED, Delivery::FAILED])
                ->orWhere(fn ($legacy) => $legacy->where('status', Delivery::PICKED_UP)->whereHas('delivery', fn ($delivery) => $delivery->where('legacy_imported', true)))
                ->orWhere(fn ($legacy) => $legacy->where('status', Delivery::OUT_FOR_DELIVERY)->whereHas('delivery', fn ($delivery) => $delivery->where('legacy_imported', true)->whereNull('courier_profile_id')));
        })
            ->whereHas('delivery')->latest()->get();
        $areas = DeliveryArea::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $deliveries = Delivery::with(['order:id,status', 'deliveryArea:id,name', 'courierProfile.user:id,first_name,last_name', 'pickupAssignment.courierProfile.user:id,first_name,last_name', 'events.actor:id,first_name,last_name', 'proof'])
            ->latest()->get();
        $couriers = $eligibility->profiles()->with(['user:id,first_name,last_name', 'vehicles:id,courier_profile_id,vehicle_type', 'deliveryAreas:id,name,is_active'])
            ->orderBy('id')->get();

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
            'couriers.user:id,first_name,last_name', 'couriers.vehicles:id,courier_profile_id,vehicle_type',
        ])->orderBy('name')->get()]);
    }

    public function storeArea(Request $request)
    {
        if (is_string($request->input('name'))) $request->merge(['name' => trim($request->input('name'))]);
        $values = $request->validate(['name' => ['required', 'string', 'max:100', 'not_regex:/^\s*$/', 'unique:delivery_areas,name']]);
        return response()->json(['success' => true, 'data' => DeliveryArea::create(['name' => $values['name'], 'is_active' => true])], 201);
    }

    public function updateArea(Request $request, int $areaId)
    {
        $area = DeliveryArea::findOrFail($areaId);
        if (is_string($request->input('name'))) $request->merge(['name' => trim($request->input('name'))]);
        $values = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100', 'not_regex:/^\s*$/', Rule::unique('delivery_areas', 'name')->ignore($area->id)],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);
        $area = DB::transaction(function () use ($areaId, $values) {
            $area = DeliveryArea::whereKey($areaId)->lockForUpdate()->firstOrFail();
            $area->update($values);
            return $area->fresh();
        });
        return response()->json(['success' => true, 'data' => $area]);
    }

    public function assignCourierToArea(Request $request, int $areaId, CourierEligibility $eligibility)
    {
        $values = $request->validate(['courier_profile_id' => ['required', 'integer', 'exists:courier_profiles,id']]);
        $area = DeliveryArea::findOrFail($areaId);
        abort_unless($area->is_active, 422, 'Activate the delivery area before assigning couriers.');
        $courier = $eligibility->find((int) $values['courier_profile_id']);
        abort_unless($courier, 422, 'The selected courier is not eligible.');

        DB::transaction(function () use ($request, $areaId, $courier) {
            $area = DeliveryArea::whereKey($areaId)->lockForUpdate()->firstOrFail();
            $eligibleCourier = app(CourierEligibility::class)->find($courier->id);
            abort_unless($area->is_active && $eligibleCourier, 422, 'The area or courier is no longer eligible.');
            $area->couriers()->syncWithoutDetaching([$eligibleCourier->id => ['assigned_by' => $request->user()->id]]);
        });

        return response()->json(['success' => true, 'message' => 'Courier added to the delivery area.']);
    }

    public function removeCourierFromArea(int $areaId, int $courierProfileId)
    {
        DB::transaction(function () use ($areaId, $courierProfileId) {
            $area = DeliveryArea::whereKey($areaId)->lockForUpdate()->firstOrFail();
            $area->couriers()->detach($courierProfileId);
        });
        return response()->json(['success' => true, 'message' => 'Courier removed from future assignments in this area.']);
    }

    public function assignPickup(Request $request, int $orderId, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'courier_profile_id' => ['required', 'integer', 'exists:courier_profiles,id'],
            'expected_courier_profile_id' => ['nullable', 'integer'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $courier = $eligibility->find((int) $values['courier_profile_id']);
        abort_unless($courier, 422, 'The selected pickup rider is not eligible.');
        $reason = isset($values['reason']) ? trim($values['reason']) : null;

        try {
            $assignment = DB::transaction(function () use ($request, $orderId, $values, $courier, $reason, $eligibility) {
                $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
                $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->first();
                $assignment = PickupAssignment::where('order_id', $order->id)->lockForUpdate()->first();
                abort_unless($eligibility->find($courier->id), 422, 'The pickup rider is no longer eligible.');
                abort_unless($order->status === 'READY_FOR_PICKUP', 422, 'Only seller-ready orders can be assigned for pickup.');

                if ($assignment) {
                    abort_unless(in_array($assignment->status, [PickupAssignment::ASSIGNED, PickupAssignment::ACCEPTED], true) && !$assignment->picked_up_at, 422, 'Pickup rider cannot be changed after collection.');
                    if ((int) $assignment->courier_profile_id === (int) $courier->id) return $assignment;
                    abort_unless($request->filled('expected_courier_profile_id') && (int) $values['expected_courier_profile_id'] === (int) $assignment->courier_profile_id, 409, 'Pickup assignment changed. Refresh and try again.');
                    abort_unless($reason, 422, 'A reason is required when changing a pickup rider.');
                } else {
                    abort_unless(!$delivery || ($delivery->legacy_imported && $delivery->status === 'READY_FOR_PICKUP'), 409, 'This order already has a delivery record and cannot enter pickup assignment automatically.');
                    $delivery ??= Delivery::create(['order_id' => $order->id, 'status' => 'READY_FOR_PICKUP', 'legacy_imported' => false]);
                    $assignment = new PickupAssignment(['order_id' => $order->id, 'delivery_id' => $delivery->id]);
                }

                $previousCourier = $assignment->courier_profile_id;
                $previousAssignmentStatus = $assignment->exists ? $assignment->status : $order->status;
                $assignment->fill([
                    'courier_profile_id' => $courier->id,
                    'assigned_by' => $request->user()->id,
                    'status' => PickupAssignment::ASSIGNED,
                    'assigned_at' => now(),
                ])->save();
                OrderDeliveryProjection::event($delivery, [
                    'actor_id' => $request->user()->id,
                    'event_type' => $previousCourier ? 'pickup_reassigned' : 'pickup_assigned',
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

    public function sortAndAssign(Request $request, int $orderId, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'delivery_area_id' => ['required', 'integer', 'exists:delivery_areas,id'],
            'courier_profile_id' => ['required', 'integer', 'exists:courier_profiles,id'],
            'expected_status' => ['required', 'in:AT_SORTING_CENTER,SORTED'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $reason = isset($values['reason']) ? trim($values['reason']) : null;
        $courier = $eligibility->find((int) $values['courier_profile_id']);
        abort_unless($courier && $eligibility->isEligibleForArea($courier, (int) $values['delivery_area_id']), 422, 'The selected courier is not eligible for this delivery area.');

        $delivery = DB::transaction(function () use ($request, $orderId, $values, $courier, $eligibility, $reason) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->firstOrFail();
            $area = DeliveryArea::whereKey($values['delivery_area_id'])->lockForUpdate()->firstOrFail();
            abort_unless($area->is_active, 422, 'This delivery area is inactive.');
            abort_unless($order->status === $values['expected_status'] && $delivery->status === $order->status, 409, 'Parcel status changed. Refresh the logistics queue.');
            abort_unless(in_array($order->status, [Delivery::AT_SORTING_CENTER, Delivery::SORTED], true), 422, 'Only parcels at or processed by the sorting center can be assigned.');
            abort_unless($eligibility->find($courier->id) && $eligibility->isEligibleForArea($courier, $area->id), 422, 'The selected courier is no longer eligible for this area.');

            if ($order->status === Delivery::AT_SORTING_CENTER) {
                $delivery->update(['status' => Delivery::SORTED, 'delivery_area_id' => $area->id, 'sorted_at' => now()]);
                $order->update(['status' => Delivery::SORTED]);
                OrderDeliveryProjection::event($delivery, [
                    'actor_id' => $request->user()->id, 'event_type' => 'sorted',
                    'previous_status' => Delivery::AT_SORTING_CENTER, 'new_status' => Delivery::SORTED,
                ]);
            } else {
                $delivery->update(['delivery_area_id' => $area->id]);
            }

            $previousStatus = $order->status;
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

            return $delivery->load(['order', 'deliveryArea', 'courierProfile.user', 'events.actor']);
        });

        return response()->json(['success' => true, 'message' => 'Parcel sorted and assigned to an area courier.', 'data' => $delivery]);
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
            if ($isRetry || $isReassign || $legacyOutForDelivery) abort_unless($reason, 422, 'A reason is required when retrying, reassigning, or reconciling a delivery.');
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
        $values = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $reason = trim($values['reason']);
        abort_unless($reason !== '', 422, 'A verification note is required.');
        $delivery = DB::transaction(function () use ($request, $orderId, $reason) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->firstOrFail();
            abort_unless($delivery->legacy_imported && $delivery->status === Delivery::PICKED_UP && $order->status === Delivery::PICKED_UP, 409, 'Only legacy parcels marked picked up can be verified here.');
            abort_unless(!$order->pickupAssignment()->exists(), 409, 'This parcel has an active pickup assignment.');

            $delivery->update(['status' => Delivery::AT_SORTING_CENTER]);
            $order->update(['status' => Delivery::AT_SORTING_CENTER]);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
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
