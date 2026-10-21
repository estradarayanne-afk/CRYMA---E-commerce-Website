<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\PickupAssignment;
use App\Support\OrderDeliveryProjection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ParcelOperationsController extends Controller
{
    public function confirmSortingReceipt(Request $request, int $orderId)
    {
        $values = $request->validate([
            'expected_status' => ['required', 'in:PICKED_UP'],
        ]);

        $assignment = DB::transaction(function () use ($request, $orderId, $values) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->firstOrFail();
            $assignment = PickupAssignment::where('order_id', $order->id)->lockForUpdate()->firstOrFail();

            abort_unless(
                $order->status === $values['expected_status']
                    && $delivery->status === $values['expected_status']
                    && $assignment->status === PickupAssignment::PICKED_UP
                    && $assignment->picked_up_at !== null,
                409,
                'Only a collected parcel awaiting sorting-center receipt can be confirmed.',
            );

            $previousStatus = $delivery->status;
            $assignment->update([
                'status' => PickupAssignment::RECEIVED,
                'received_at' => now(),
            ]);
            $delivery->update(['status' => Delivery::AT_SORTING_CENTER]);
            $order->update(['status' => Delivery::AT_SORTING_CENTER]);

            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'event_type' => 'sorting_center_received',
                'previous_status' => $previousStatus,
                'new_status' => Delivery::AT_SORTING_CENTER,
                'previous_courier_profile_id' => $assignment->courier_profile_id,
                'courier_profile_id' => $assignment->courier_profile_id,
            ]);

            return $assignment->load(['order', 'courierProfile.user', 'delivery.events']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Sorting-center receipt confirmed.',
            'data' => $assignment,
        ]);
    }
}
