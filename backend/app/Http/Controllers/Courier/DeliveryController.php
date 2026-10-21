<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\User;
use App\Services\CourierEligibility;
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
            'order.items.product:id,name,image',
            'order.items.seller:id,first_name,last_name',
            'deliveryArea:id,name',
            'proof',
            'events',
        ]);
    }

    private function parcelData(Delivery $delivery): array
    {
        $order = $delivery->order;
        return [
            'id' => $delivery->id,
            'order_id' => $delivery->order_id,
            'status' => $delivery->status,
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
                'delivery_address' => $order->delivery_address,
                'items' => $order->items->map(fn ($item) => [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'product' => $item->product ? ['id' => $item->product->id, 'name' => $item->product->name, 'image' => $item->product->image] : null,
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

            $next = $validated['status'];
            if ($delivery->status === $next) {
                return $delivery->load(['order.items.product:id,name,image', 'events']);
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

            return $delivery->load(['order.items.product:id,name,image', 'events']);
        });

        $result->load(['order.items.product:id,name,image', 'deliveryArea:id,name', 'events']);
        return response()->json(['success' => true, 'message' => 'Delivery status updated.', 'data' => $this->parcelData($result)]);
    }
}
