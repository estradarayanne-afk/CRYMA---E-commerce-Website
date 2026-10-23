<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Display all orders.
     */
    public function index(Request $request)
    {
        $query = Order::with([
            'buyer',
            'items.product',
            'items.seller',
            'delivery.events.actor',
            'delivery.pickupAssignment.courierProfile.user',
            'delivery.deliveryArea',
        ]);

        // Search by order ID or buyer information
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhereHas('buyer', function ($buyerQuery) use ($search) {
                        $buyerQuery
                            ->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by order status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('date')) {
            $validated = $request->validate(['date' => ['date_format:Y-m-d']]);
            $query->whereDate('created_at', $validated['date']);
        }

        $orders = $query
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * Display a specific order.
     */
    public function show($id)
    {
        $order = Order::with([
            'buyer',
            'items.product',
            'items.seller',
            'commission',
            'delivery.events.actor',
            'delivery.courierProfile.user',
            'delivery.pickupAssignment.courierProfile.user',
            'delivery.deliveryArea',
        ])->find($id);

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
     * Update order status.
     */
    public function updateStatus(Request $request, $id)
    {
        if (is_string($request->input('status'))) {
            $request->merge(['status' => mb_strtoupper(trim($request->input('status')))]);
        }

        $validated = $request->validate([
            'status' => [
                'required',
                'in:PENDING,PLACED,CONFIRMED,PREPARING,READY_FOR_PICKUP,CANCELLED',
            ],
        ]);

        $order = DB::transaction(function () use ($id, $validated) {
            $order = Order::with('items')->whereKey($id)->lockForUpdate()->firstOrFail();
            if ($order->delivery()->exists()) {
                abort(409, 'This order has delivery history. Use the logistics workflow to preserve assignment and status history.');
            }
            $currentStatus = strtoupper((string) $order->status);
            if ($currentStatus === 'CANCELLED' && $validated['status'] !== 'CANCELLED') {
                abort(409, 'A cancelled order cannot be reopened.');
            }
            if ($currentStatus !== 'CANCELLED' && $validated['status'] === 'CANCELLED') {
                foreach ($order->items as $item) {
                    Product::whereKey($item->product_id)
                        ->lockForUpdate()
                        ->increment('stock', $item->quantity);
                }
            }
            $order->status = $validated['status'];
            $order->save();
            return $order;
        });

        return response()->json([
            'success' => true,
            'message' => 'Order status updated successfully.',
            'data' => $order,
        ]);
    }
}
