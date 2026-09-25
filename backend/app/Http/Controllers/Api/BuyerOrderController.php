<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BuyerOrderController extends Controller
{
    public function checkoutData(Request $request)
    {
        $address = $request->user()
            ->addresses()
            ->latest()
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'first_name' => $request->user()->first_name,
                    'last_name' => $request->user()->last_name,
                    'phone' => $request->user()->phone,
                    'email' => $request->user()->email,
                ],
                'address' => $address,
            ],
        ]);
    }

    public function index(Request $request)
    {
        $query = Order::with('items.product')
            ->where('buyer_id', $request->user()->id);

        /*
        |--------------------------------------------------------------------------
        | SEARCH
        |--------------------------------------------------------------------------
        | Searches by:
        | - Order ID
        | - Product name
        */
        if ($request->filled('search')) {
            $search = trim($request->search);

            $query->where(function ($orderQuery) use ($search) {
                $orderQuery
                    ->where('id', 'like', "%{$search}%")
                    ->orWhereHas('items.product', function ($productQuery) use ($search) {
                        $productQuery->where(
                            'name',
                            'like',
                            "%{$search}%"
                        );
                    });
            });
        }

        /*
        |--------------------------------------------------------------------------
        | STATUS FILTER
        |--------------------------------------------------------------------------
        */
        if ($request->filled('status')) {
            $query->where(
                'status',
                $request->status
            );
        }

        /*
        |--------------------------------------------------------------------------
        | DATE FILTER
        |--------------------------------------------------------------------------
        */
        if ($request->filled('date_from')) {
            $query->whereDate(
                'created_at',
                '>=',
                $request->date_from
            );
        }

        if ($request->filled('date_to')) {
            $query->whereDate(
                'created_at',
                '<=',
                $request->date_to
            );
        }

        /*
        |--------------------------------------------------------------------------
        | SORTING
        |--------------------------------------------------------------------------
        */
        $sort = $request->get(
            'sort',
            'newest'
        );

        switch ($sort) {
            case 'oldest':
                $query->orderBy(
                    'created_at',
                    'asc'
                );
                break;

            case 'highest':
                $query->orderBy(
                    'total_amount',
                    'desc'
                );
                break;

            case 'lowest':
                $query->orderBy(
                    'total_amount',
                    'asc'
                );
                break;

            case 'newest':
            default:
                $query->latest();
                break;
        }

        /*
        |--------------------------------------------------------------------------
        | PAGINATION
        |--------------------------------------------------------------------------
        */
        $orders = $query
            ->paginate(10)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    public function show(Request $request, int $id)
    {
        $order = Order::with('items.product')
            ->where('buyer_id', $request->user()->id)
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'delivery_address' => [
                'required',
                'string',
                'max:1000',
            ],

            'payment_method' => [
                'required',
                'in:cash_on_delivery,gcash',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
            ],

            'items.*.product_id' => [
                'required',
                'integer',
                'distinct',
            ],

            'items.*.quantity' => [
                'required',
                'integer',
                'min:1',
            ],
        ]);

        $order = DB::transaction(function () use ($request, $validated) {
            $items = [];
            $subtotal = 0;

            $sellerIds = collect($validated['items'])
                ->map(function ($item) {
                    return Product::where('id', $item['product_id'])
                        ->value('seller_id');
                })
                ->filter()
                ->unique()
                ->values();

            if ($sellerIds->count() > 1) {
                abort(
                    422,
                    'Please checkout products from one seller at a time.'
                );
            }

            foreach ($validated['items'] as $requestedItem) {
                $product = Product::with('seller')
                    ->where('status', 'active')
                    ->lockForUpdate()
                    ->find($requestedItem['product_id']);

                if (!$product) {
                    abort(
                        422,
                        'One of the selected products is no longer available.'
                    );
                }

                if ($product->stock < $requestedItem['quantity']) {
                    abort(
                        422,
                        "Not enough stock for {$product->name}."
                    );
                }

                $lineSubtotal =
                    $product->price * $requestedItem['quantity'];

                $subtotal += $lineSubtotal;

                $items[] = [
                    $product,
                    $requestedItem['quantity'],
                    $lineSubtotal,
                ];
            }

            $order = Order::create([
                'buyer_id' => $request->user()->id,
                'delivery_address' => $validated['delivery_address'],
                'payment_method' => $validated['payment_method'],
                'subtotal' => $subtotal,
                'shipping_fee' => 0,
                'total_amount' => $subtotal,
                'status' => 'pending',
            ]);

            foreach (
                $items
                as [$product, $quantity, $lineSubtotal]
            ) {
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