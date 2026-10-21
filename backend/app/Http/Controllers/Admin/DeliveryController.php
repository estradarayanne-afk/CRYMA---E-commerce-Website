<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\Order;
use App\Support\OrderDeliveryProjection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryController extends Controller
{
    public function show(int $id)
    {
        $delivery = Delivery::with([
            'order.buyer:id,first_name,last_name,email,phone',
            'order.items.product:id,name,price',
            'order.items.seller:id,first_name,last_name',
            'courierProfile.user:id,first_name,last_name,email,phone',
            'deliveryArea:id,name',
            'pickupAssignment.courierProfile.user:id,first_name,last_name',
            'events.actor:id,first_name,last_name,email',
            'events.previousCourierProfile.user:id,first_name,last_name',
            'events.courierProfile.user:id,first_name,last_name',
            'proof',
        ])->find($id);

        return $delivery
            ? response()->json(['success' => true, 'data' => $delivery])
            : response()->json(['success' => false, 'message' => 'Delivery not found.'], 404);
    }

    public function resolve(Request $request, int $orderId)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:RETURNED'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);
        $reason = trim($validated['reason']);
        if ($reason === '') return response()->json(['success' => false, 'message' => 'A reason is required.'], 422);

        $delivery = DB::transaction(function () use ($request, $orderId, $reason) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->firstOrFail();
            if ($delivery->status !== Delivery::FAILED || $order->status !== Delivery::FAILED) {
                abort(422, 'Only failed deliveries can be returned.');
            }
            $delivery->update(['status' => 'RETURNED', 'failure_reason' => $reason]);
            $order->update(['status' => 'RETURNED']);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'event_type' => 'resolved_return',
                'previous_status' => Delivery::FAILED,
                'new_status' => 'RETURNED',
                'previous_courier_profile_id' => $delivery->courier_profile_id,
                'courier_profile_id' => $delivery->courier_profile_id,
                'reason' => $reason,
            ]);
            return $delivery->load(['order.buyer:id,first_name,last_name', 'deliveryArea', 'courierProfile.user:id,first_name,last_name', 'events.actor:id,first_name,last_name']);
        });

        return response()->json(['success' => true, 'message' => 'The administrator return decision was recorded.', 'data' => $delivery]);
    }
}
