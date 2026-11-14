<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Delivery;
use App\Models\PickupBatch;
use App\Models\PickupAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Get orders containing products owned by the authenticated seller.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can access orders.',
            ], 403);
        }

        $orders = $this->sellerOrderQuery($user)
            ->latest()
            ->get();
        $orders->each(function (Order $order) use ($user) {
            \App\Support\OrderDeliveryProjection::apply($order);
            $order->setAttribute('seller', $this->sellerContact($user));
        });

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * Show one order containing products owned by the authenticated seller.
     */
    public function show(Request $request, int $id)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can access orders.',
            ], 403);
        }

        $order = $this->sellerOrderQuery($user)->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found.',
            ], 404);
        }

        \App\Support\OrderDeliveryProjection::apply($order);
        $order->setAttribute('seller', $this->sellerContact($user));

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    /**
     * Update the seller-controlled order status.
     *
     * Seller flow:
     * pending/PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP
     */
    public function updateStatus(Request $request, int $id)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can update order status.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => [
                'required',
                'in:CONFIRMED,PREPARING,READY_FOR_PICKUP',
            ],
        ]);

        $order = DB::transaction(function () use ($user, $id, $validated) {
            $order = Order::with('items')
                ->whereHas('items', fn ($query) => $query->where('seller_id', $user->id))
                ->whereKey($id)->lockForUpdate()->firstOrFail();
            $currentStatus = strtoupper((string) $order->status);
            if ($currentStatus === 'PENDING') $currentStatus = 'PLACED';
            $allowedTransitions = ['PLACED' => 'CONFIRMED', 'CONFIRMED' => 'PREPARING', 'PREPARING' => 'READY_FOR_PICKUP'];
            $requestedStatus = $validated['status'];
            if (!isset($allowedTransitions[$currentStatus]) || $allowedTransitions[$currentStatus] !== $requestedStatus) {
                abort(422, "Invalid status transition from {$currentStatus} to {$requestedStatus}.");
            }
            $order->update(['status' => $requestedStatus]);
            if ($requestedStatus === 'READY_FOR_PICKUP') {
                Delivery::firstOrCreate(
                    ['order_id' => $order->id],
                    ['status' => 'READY_FOR_PICKUP', 'legacy_imported' => false],
                );
            }
            return $order->fresh()->load([
                'buyer:id,first_name,middle_name,last_name,email,phone',
                'items.product:id,name,price,category',
                'delivery',
            ]);
        });
        $order->setAttribute('seller', $this->sellerContact($user));

        return response()->json([
            'success' => true,
            'message' => 'Order status updated successfully.',
            'data' => $order,
        ]);
    }

    public function requestPickup(Request $request, int $id)
    {
        $user = $request->user();
        $pickupAddress = $this->pickupAddressFor($user);
        $assignment = DB::transaction(function () use ($user, $id, $pickupAddress) {
            $order = Order::whereHas('items', fn ($query) => $query->where('seller_id', $user->id))
                ->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless(strtoupper((string) $order->status) === 'READY_FOR_PICKUP', 422, 'Mark the order ready before scheduling pickup.');

            $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->first();
            $assignment = PickupAssignment::where('order_id', $order->id)->lockForUpdate()->first();
            if ($assignment) {
                abort_unless($assignment->status === PickupAssignment::REQUESTED, 409, 'A pickup has already been scheduled or completed.');
                return $assignment;
            }
            abort_unless(!$delivery || ($delivery->legacy_imported && $delivery->status === 'READY_FOR_PICKUP'), 409, 'This order already has an active shipment.');
            $delivery ??= Delivery::create(['order_id' => $order->id, 'status' => 'READY_FOR_PICKUP', 'legacy_imported' => false]);
            $assignment = PickupAssignment::create([
                'order_id' => $order->id,
                'delivery_id' => $delivery->id,
                'assigned_by' => $user->id,
                'status' => PickupAssignment::REQUESTED,
                'pickup_address' => $pickupAddress,
                'requested_at' => now(),
            ]);
            \App\Support\OrderDeliveryProjection::event($delivery, [
                'actor_id' => $user->id,
                'event_type' => 'pickup_requested',
                'previous_status' => 'READY_FOR_PICKUP',
                'new_status' => PickupAssignment::REQUESTED,
            ]);
            return $assignment;
        });

        return response()->json(['success' => true, 'message' => 'Courier pickup requested.', 'data' => $assignment]);
    }

    public function requestPickupBatch(Request $request)
    {
        $user = $request->user();
        $values = $request->validate([
            'order_ids' => ['required', 'array', 'min:2', 'max:30'],
            'order_ids.*' => ['required', 'integer', 'distinct', 'min:1'],
            'preferred_scheduled_at' => ['required', 'date', 'after:now'],
        ]);
        $pickupAddress = $this->pickupAddressFor($user);
        $orderIds = collect($values['order_ids'])->map(fn ($id) => (int) $id)->sort()->values();
        $preferredSchedule = \Illuminate\Support\Carbon::parse($values['preferred_scheduled_at']);

        $batch = DB::transaction(function () use ($user, $orderIds, $pickupAddress, $preferredSchedule) {
            $orders = Order::whereIn('id', $orderIds)
                ->whereHas('items', fn ($query) => $query->where('seller_id', $user->id))
                ->orderBy('id')
                ->lockForUpdate()
                ->get();
            abort_unless($orders->count() === $orderIds->count(), 404, 'One or more selected orders were not found.');

            foreach ($orders as $order) {
                abort_unless(strtoupper((string) $order->status) === 'READY_FOR_PICKUP', 422, "Order #{$order->id} is not ready for pickup.");
                $assignment = PickupAssignment::where('order_id', $order->id)->lockForUpdate()->first();
                abort_unless(!$assignment, 409, "Order #{$order->id} already has a pickup assignment.");
                $delivery = Delivery::where('order_id', $order->id)->lockForUpdate()->first();
                abort_unless(!$delivery || ($delivery->legacy_imported && $delivery->status === 'READY_FOR_PICKUP'), 409, "Order #{$order->id} already has an active shipment.");
            }

            $batch = PickupBatch::create([
                'seller_id' => $user->id,
                'pickup_address' => $pickupAddress,
                'status' => PickupBatch::REQUESTED,
                'requested_at' => now(),
                'preferred_scheduled_at' => $preferredSchedule,
            ]);

            foreach ($orders as $order) {
                $delivery = Delivery::firstOrCreate(
                    ['order_id' => $order->id],
                    ['status' => 'READY_FOR_PICKUP', 'legacy_imported' => false],
                );
                $assignment = PickupAssignment::create([
                    'order_id' => $order->id,
                    'delivery_id' => $delivery->id,
                    'pickup_batch_id' => $batch->id,
                    'assigned_by' => $user->id,
                    'status' => PickupAssignment::REQUESTED,
                    'pickup_address' => $pickupAddress,
                    'requested_at' => now(),
                ]);
                \App\Support\OrderDeliveryProjection::event($delivery, [
                    'actor_id' => $user->id,
                    'event_type' => 'pickup_requested',
                    'previous_status' => 'READY_FOR_PICKUP',
                    'new_status' => PickupAssignment::REQUESTED,
                ]);
            }

            return $batch->load('assignments.order');
        });

        return response()->json([
            'success' => true,
            'message' => 'Bulk courier pickup requested. Logistics will confirm your preferred pickup time.',
            'data' => $batch,
        ], 201);
    }

    private function pickupAddressFor(User $user): string
    {
        $address = $user->addresses()->orderByDesc('is_default')->latest('id')->first();
        abort_unless($address, 422, 'Add a seller pickup address in Account Settings before requesting a courier pickup.');

        return collect([
            $address->recipient_name ? 'Contact: '.$address->recipient_name : null,
            $address->phone ? 'Phone: '.$address->phone : null,
            implode(', ', array_filter([
                $address->house_number,
                $address->building_name,
                $address->unit_number,
                $address->street,
            ])),
            $address->barangay,
            $address->municipality,
            $address->province,
            $address->region,
            $address->postal_code,
        ])->filter()->implode(', ');
    }

    private function sellerOrderQuery(User $user): Builder
    {
        return Order::with([
            'delivery.events',
            'delivery',
            'delivery.pickupAssignment.courierProfile.user:id,first_name,last_name,phone',
            'delivery.deliveryArea',
            'buyer:id,first_name,middle_name,last_name,email,phone',
            'items' => function ($query) use ($user) {
                $query->where('seller_id', $user->id)
                    ->with('product:id,name,price,category');
            },
        ])->whereHas('items', function ($query) use ($user) {
            $query->where('seller_id', $user->id);
        });
    }

    private function sellerContact(User $user): array
    {
        $user->loadMissing('sellerProfile:id,user_id,business_name');

        return [
            'name' => trim(implode(' ', array_filter([
                $user->first_name,
                $user->middle_name,
                $user->last_name,
            ]))),
            'business_name' => $user->sellerProfile?->business_name,
            'email' => $user->email,
            'phone' => $user->phone,
        ];
    }
}
