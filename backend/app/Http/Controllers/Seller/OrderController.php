<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Order;
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

        $orders = Order::with([
                'buyer:id,first_name,middle_name,last_name,email,phone',
                'items' => function ($query) use ($user) {
                    $query->where('seller_id', $user->id)
                        ->with('product:id,name,price,category');
                },
            ])
            ->whereHas('items', function ($query) use ($user) {
                $query->where('seller_id', $user->id);
            })
            ->latest()
            ->get();

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

        $order = Order::with([
                'buyer:id,first_name,middle_name,last_name,email,phone',
                'items' => function ($query) use ($user) {
                    $query->where('seller_id', $user->id)
                        ->with('product:id,name,price,category');
                },
            ])
            ->whereHas('items', function ($query) use ($user) {
                $query->where('seller_id', $user->id);
            })
            ->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found.',
            ], 404);
        }

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

        $order = Order::with('items')
            ->whereHas('items', function ($query) use ($user) {
                $query->where('seller_id', $user->id);
            })
            ->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found.',
            ], 404);
        }

        $currentStatus = strtoupper((string) $order->status);

        if ($currentStatus === 'PENDING') {
            $currentStatus = 'PLACED';
        }

        $allowedTransitions = [
            'PLACED' => 'CONFIRMED',
            'CONFIRMED' => 'PREPARING',
            'PREPARING' => 'READY_FOR_PICKUP',
        ];

        $requestedStatus = $validated['status'];

        if (
            !isset($allowedTransitions[$currentStatus]) ||
            $allowedTransitions[$currentStatus] !== $requestedStatus
        ) {
            return response()->json([
                'success' => false,
                'message' => "Invalid status transition from {$currentStatus} to {$requestedStatus}.",
            ], 422);
        }

        $order->update([
            'status' => $requestedStatus,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order status updated successfully.',
            'data' => $order->fresh()->load([
                'buyer:id,first_name,middle_name,last_name,email,phone',
                'items.product:id,name,price,category',
            ]),
        ]);
    }
}