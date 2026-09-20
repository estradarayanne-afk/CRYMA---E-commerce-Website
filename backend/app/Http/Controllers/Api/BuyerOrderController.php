<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BuyerOrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::with('items.product')
            ->where('buyer_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $orders]);
    }

    public function show(Request $request, int $id)
    {
        $order = Order::with('items.product')
            ->where('buyer_id', $request->user()->id)
            ->find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found.'], 404);
        }

        return response()->json(['success' => true, 'data' => $order]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $order = DB::transaction(function () use ($request, $validated) {
            $items = [];
            $subtotal = 0;

            foreach ($validated['items'] as $requestedItem) {
                $product = Product::with('seller')
                    ->where('status', 'active')
                    ->lockForUpdate()
                    ->find($requestedItem['product_id']);

                if (!$product) {
                    abort(422, 'One of the selected products is no longer available.');
                }

                if ($product->stock < $requestedItem['quantity']) {
                    abort(422, "Not enough stock for {$product->name}.");
                }

                $lineSubtotal = $product->price * $requestedItem['quantity'];
                $subtotal += $lineSubtotal;
                $items[] = [$product, $requestedItem['quantity'], $lineSubtotal];
            }

            $order = Order::create([
                'buyer_id' => $request->user()->id,
                'subtotal' => $subtotal,
                'shipping_fee' => 0,
                'total_amount' => $subtotal,
                'status' => 'pending',
            ]);

            foreach ($items as [$product, $quantity, $lineSubtotal]) {
                $order->items()->create([
                    'product_id' => $product->id,
                    'seller_id' => $product->seller_id,
                    'quantity' => $quantity,
                    'unit_price' => $product->price,
                    'subtotal' => $lineSubtotal,
                ]);

                $product->decrement('stock', $quantity);
            }

            return $order->load('items.product');
        });

        return response()->json([
            'success' => true,
            'message' => 'Order placed successfully.',
            'data' => $order,
        ], 201);
    }
}