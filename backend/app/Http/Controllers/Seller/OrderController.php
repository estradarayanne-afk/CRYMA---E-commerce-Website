<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Order;
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
            return $order->fresh()->load([
                'buyer:id,first_name,middle_name,last_name,email,phone',
                'items.product:id,name,price,category',
            ]);
        });
        $order->setAttribute('seller', $this->sellerContact($user));

        return response()->json([
            'success' => true,
            'message' => 'Order status updated successfully.',
            'data' => $order,
        ]);
    }

    private function sellerOrderQuery(User $user): Builder
    {
        return Order::with([
            'delivery.events',
            'delivery.pickupAssignment',
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
