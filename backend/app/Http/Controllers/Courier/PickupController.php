<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\PickupAssignment;
use App\Models\User;
use App\Services\CourierEligibility;
use App\Support\OrderDeliveryProjection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PickupController extends Controller
{
    private function profile(User $user, CourierEligibility $eligibility): CourierProfile
    {
        abort_unless($user->role === 'rider' && $user->status === 'active' && $user->email_verified_at, 403, 'Courier account is not eligible to operate.');
        $profile = $user->courierProfile;
        abort_unless($profile && $eligibility->isEligible($profile), 403, 'Courier account or required documents are not approved.');
        return $profile;
    }

    private function query()
    {
        return PickupAssignment::with([
            'order.items.product:id,name,image',
            'order.items.seller:id,first_name,last_name',
            'order.items.seller.addresses',
            'delivery.events',
        ]);
    }

    private function parcelData(PickupAssignment $assignment): array
    {
        $order = $assignment->order;
        return [
            'id' => $assignment->id,
            'order_id' => $assignment->order_id,
            'status' => $assignment->status,
            'assigned_at' => $assignment->assigned_at,
            'picked_up_at' => $assignment->picked_up_at,
            'received_at' => $assignment->received_at,
            'order' => $order ? [
                'id' => $order->id,
                'status' => $order->status,
                'items' => $order->items->map(function ($item) {
                    $seller = $item->seller;
                    return [
                        'id' => $item->id,
                        'quantity' => $item->quantity,
                        'product' => $item->product ? ['id' => $item->product->id, 'name' => $item->product->name, 'image' => $item->product->image] : null,
                        'seller' => $seller ? [
                            'first_name' => $seller->first_name,
                            'last_name' => $seller->last_name,
                            'addresses' => $seller->addresses->map(fn ($address) => [
                                'house_number' => $address->house_number, 'street' => $address->street,
                                'building_name' => $address->building_name, 'unit_number' => $address->unit_number,
                                'barangay' => $address->barangay, 'municipality' => $address->municipality,
                                'province' => $address->province, 'region' => $address->region,
                                'postal_code' => $address->postal_code,
                            ])->values(),
                        ] : null,
                    ];
                })->values(),
            ] : null,
            'events' => $assignment->delivery?->events->map(fn ($event) => [
                'id' => $event->id, 'event_type' => $event->event_type,
                'previous_status' => $event->previous_status, 'new_status' => $event->new_status,
                'created_at' => $event->created_at,
            ])->values() ?? collect(),
        ];
    }

    public function index(Request $request, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request->user(), $eligibility);
        $rows = $this->query()->where('courier_profile_id', $profile->id)
            ->whereIn('status', [PickupAssignment::ASSIGNED, PickupAssignment::ACCEPTED, PickupAssignment::PICKED_UP])
            ->latest('updated_at')->get();
        return response()->json(['success' => true, 'data' => $rows->map(fn (PickupAssignment $row) => $this->parcelData($row))->values()]);
    }

    public function history(Request $request, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request->user(), $eligibility);
        $rows = $this->query()->where('courier_profile_id', $profile->id)
            ->where('status', PickupAssignment::RECEIVED)->latest('updated_at')->get();
        return response()->json(['success' => true, 'data' => $rows->map(fn (PickupAssignment $row) => $this->parcelData($row))->values()]);
    }

    public function show(Request $request, int $id, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request->user(), $eligibility);
        $assignment = $this->query()->where('courier_profile_id', $profile->id)->find($id);
        return $assignment
            ? response()->json(['success' => true, 'data' => $this->parcelData($assignment)])
            : response()->json(['success' => false, 'message' => 'Assigned pickup was not found.'], 404);
    }

    public function updateStatus(Request $request, int $id, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'status' => ['required', 'in:ACCEPTED_BY_PICKUP_RIDER,PICKED_UP,AT_SORTING_CENTER'],
            'expected_status' => ['required', 'in:ASSIGNED_TO_PICKUP_RIDER,ACCEPTED_BY_PICKUP_RIDER,PICKED_UP'],
        ]);
        $profile = $this->profile($request->user(), $eligibility);
        $initial = PickupAssignment::where('courier_profile_id', $profile->id)->find($id);
        abort_unless($initial, 404, 'Assigned pickup was not found.');

        $assignment = DB::transaction(function () use ($request, $id, $profile, $values, $initial, $eligibility) {
            $order = Order::whereKey($initial->order_id)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->firstOrFail();
            $assignment = PickupAssignment::where('courier_profile_id', $profile->id)->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($eligibility->isEligible($profile), 403, 'Courier eligibility changed. Contact an administrator.');
            $expectedOrderStatus = $values['expected_status'] === PickupAssignment::PICKED_UP
                ? Delivery::PICKED_UP
                : 'READY_FOR_PICKUP';
            if ($assignment->status !== $values['expected_status'] || $order->status !== $expectedOrderStatus || $delivery->status !== $expectedOrderStatus) {
                abort(409, 'Pickup status changed or is inconsistent. Refresh and try again.');
            }

            $next = $values['status'];
            if ($values['expected_status'] === PickupAssignment::ASSIGNED) {
                abort_unless($next === PickupAssignment::ACCEPTED, 422, 'Accept the pickup assignment before collecting the parcel.');
                $orderPrevious = PickupAssignment::ASSIGNED;
                $assignment->update(['status' => PickupAssignment::ACCEPTED]);
            } elseif ($values['expected_status'] === PickupAssignment::ACCEPTED) {
                abort_unless($next === PickupAssignment::PICKED_UP, 422, 'Accept the pickup assignment before collecting the parcel.');
                $orderPrevious = PickupAssignment::ACCEPTED;
                $assignment->update(['status' => PickupAssignment::PICKED_UP, 'picked_up_at' => now()]);
                $delivery->update(['status' => Delivery::PICKED_UP, 'picked_up_at' => now()]);
                $order->update(['status' => Delivery::PICKED_UP]);
            } else {
                abort_unless($next === PickupAssignment::RECEIVED, 422, 'Pickup rider must collect the parcel before confirming receipt at the sorting center.');
                $orderPrevious = PickupAssignment::PICKED_UP;
                $assignment->update(['status' => PickupAssignment::RECEIVED, 'received_at' => now()]);
                $delivery->update(['status' => Delivery::AT_SORTING_CENTER]);
                $order->update(['status' => Delivery::AT_SORTING_CENTER]);
            }

            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'event_type' => match ($next) {
                    PickupAssignment::ACCEPTED => 'pickup_accepted',
                    PickupAssignment::PICKED_UP => 'pickup_collected',
                    default => 'sorting_center_received',
                },
                'previous_status' => $orderPrevious,
                'new_status' => $next,
                'previous_courier_profile_id' => $profile->id,
                'courier_profile_id' => $profile->id,
            ]);
            return $assignment->load(['order.items.product', 'order.items.seller.addresses', 'delivery.events']);
        });

        return response()->json(['success' => true, 'message' => 'Pickup status recorded.', 'data' => $this->parcelData($assignment)]);
    }
}
