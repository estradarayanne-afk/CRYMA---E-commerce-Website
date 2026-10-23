<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Voucher;
use App\Models\VoucherRedemption;
use App\Support\VoucherDiscount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

class BuyerOrderController extends Controller
{
    public function checkoutData(Request $request)
    {
        $requiredAddressColumns = ['region', 'label', 'recipient_name', 'phone', 'is_default'];
        abort_unless(
            Schema::hasTable('addresses') &&
            !collect($requiredAddressColumns)->contains(fn (string $column) => !Schema::hasColumn('addresses', $column)),
            503,
            'Checkout address selection is unavailable until the required address migrations are applied.'
        );

        $addresses = $request->user()->addresses()
            ->orderByDesc('is_default')
            ->latest('id')
            ->get();
        $address = $addresses->first();

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
                'addresses' => $addresses,
            ],
        ]);
    }

    public function index(Request $request)
    {
        $query = Order::with(['items.product', 'delivery.events', 'delivery.pickupAssignment', 'delivery.deliveryArea'])
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
        $orders->getCollection()->transform(fn (Order $order) => \App\Support\OrderDeliveryProjection::apply($order));

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    public function show(Request $request, int $id)
    {
        $order = Order::with(['items.product', 'delivery.events', 'delivery.pickupAssignment', 'delivery.deliveryArea'])
            ->where('buyer_id', $request->user()->id)
            ->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found.',
            ], 404);
        }

        \App\Support\OrderDeliveryProjection::apply($order);

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    public function confirmReceived(Request $request, int $id)
    {
        $order = DB::transaction(function () use ($request, $id) {
            $order = Order::where('buyer_id', $request->user()->id)->whereKey($id)->lockForUpdate()->firstOrFail();
            $delivery = \App\Models\Delivery::where('order_id', $order->id)->lockForUpdate()->first();
            abort_unless($delivery, 409, 'This order has no delivery record to confirm.');
            if ($order->status === 'COMPLETED' && $delivery->buyer_confirmed_by === $request->user()->id) {
                return \App\Support\OrderDeliveryProjection::apply($order->load('delivery.events', 'delivery.deliveryArea', 'delivery.pickupAssignment'));
            }
            abort_unless($order->status === 'DELIVERED' && $delivery->status === 'DELIVERED', 409, 'Receipt can be confirmed only after the delivery rider marks the order delivered.');

            $delivery->update([
                'status' => 'COMPLETED',
                'buyer_confirmed_at' => now(),
                'buyer_confirmed_by' => $request->user()->id,
            ]);
            $order->update(['status' => 'COMPLETED']);
            \App\Support\OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'event_type' => 'buyer_receipt_confirmed',
                'previous_status' => 'DELIVERED',
                'new_status' => 'COMPLETED',
                'previous_courier_profile_id' => $delivery->courier_profile_id,
                'courier_profile_id' => $delivery->courier_profile_id,
            ]);

            return \App\Support\OrderDeliveryProjection::apply($order->load('delivery.events', 'delivery.deliveryArea', 'delivery.pickupAssignment'));
        });

        return response()->json(['success' => true, 'message' => 'Receipt confirmed. The order is complete.', 'data' => $order]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'idempotency_key' => $request->header('Idempotency-Key'),
        ]);

        $validated = $request->validate([
            'idempotency_key' => ['required', 'uuid'],
            'delivery_address' => [
                'required',
                'string',
                'max:1000',
            ],
            'address_id' => ['sometimes', 'nullable', 'integer'],
            'voucher_code' => ['sometimes', 'nullable', 'string', 'max:64'],

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
        $validated['voucher_code'] = filled($validated['voucher_code'] ?? null)
            ? mb_strtoupper(trim($validated['voucher_code']))
            : null;

        $userId = $request->user()->id;
        if (!empty($validated['address_id'])) {
            $selectedAddress = $request->user()->addresses()->findOrFail($validated['address_id']);
            $validated['delivery_address'] = collect([
                $selectedAddress->label ? ucfirst($selectedAddress->label) : null,
                'Recipient: '.($selectedAddress->recipient_name ?: trim(
                    $request->user()->first_name.' '.$request->user()->last_name
                )),
                filled($selectedAddress->phone ?: $request->user()->phone)
                    ? 'Contact: '.($selectedAddress->phone ?: $request->user()->phone)
                    : null,
                $selectedAddress->house_number,
                $selectedAddress->building_name,
                $selectedAddress->unit_number,
                $selectedAddress->street,
                $selectedAddress->barangay,
                $selectedAddress->municipality,
                $selectedAddress->province,
                $selectedAddress->region,
                $selectedAddress->postal_code,
            ])->filter(fn ($part) => filled($part))->implode(', ');
        }
        $canonicalItems = collect($validated['items'])
            ->map(fn (array $item): array => [
                'product_id' => (int) $item['product_id'],
                'quantity' => (int) $item['quantity'],
            ])
            ->sortBy('product_id')
            ->values()
            ->all();
        $requestDetails = [
            'delivery_address' => trim($validated['delivery_address']),
            'payment_method' => $validated['payment_method'],
            'items' => $canonicalItems,
        ];
        if ($validated['voucher_code'] !== null) {
            $requestDetails['voucher_code'] = $validated['voucher_code'];
        }
        $requestHash = hash('sha256', json_encode($requestDetails, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        $idempotencyKey = $validated['idempotency_key'];

        $existingOrder = Order::with('items.product')
            ->where('buyer_id', $userId)
            ->where('checkout_idempotency_key', $idempotencyKey)
            ->first();

        if ($existingOrder) {
            return $this->idempotentOrderResponse($existingOrder, $requestHash);
        }

        try {
            $order = DB::transaction(function () use ($request, $validated, $userId, $idempotencyKey, $requestHash) {
                // Reserve the request key before stock checks. The unique index
                // serializes concurrent retries of the same buyer request.
                $order = Order::create([
                    'buyer_id' => $userId,
                    'delivery_address' => trim($validated['delivery_address']),
                    'payment_method' => $validated['payment_method'],
                    'subtotal' => 0,
                    'shipping_fee' => 0,
                    'total_amount' => 0,
                    'voucher_code' => null,
                    'voucher_discount' => 0,
                    'status' => 'pending',
                    'checkout_idempotency_key' => $idempotencyKey,
                    'checkout_request_hash' => $requestHash,
                ]);

                $items = [];
                $subtotalCents = 0;

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
                        ->where('review_status', 'approved')
                        ->whereHas('seller', fn ($seller) => $seller->where('role', 'seller')->where('status', 'active'))
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

                    $sellingPrice = $product->sellingPrice();
                    $priceCents = $this->amountToCents($sellingPrice);
                    $quantity = (int) $requestedItem['quantity'];
                    $maxOrderCents = 999_999_999_999; // DECIMAL(12, 2)

                    if (
                        $priceCents < 0 ||
                        $priceCents > intdiv($maxOrderCents, $quantity) ||
                        $subtotalCents > $maxOrderCents - ($priceCents * $quantity)
                    ) {
                        abort(422, 'A product price is invalid or the order total exceeds the supported amount.');
                    }

                    $lineSubtotalCents = $priceCents * $quantity;
                    $subtotalCents += $lineSubtotalCents;

                    $items[] = [
                        $product,
                        $quantity,
                        $this->formatCents($lineSubtotalCents),
                    ];
                }

                $voucherResult = null;
                if ($validated['voucher_code'] !== null) {
                    $voucher = Voucher::query()
                        ->whereRaw('UPPER(code) = ?', [$validated['voucher_code']])
                        ->lockForUpdate()
                        ->first();

                    if (!$voucher) {
                        throw ValidationException::withMessages([
                            'voucher_code' => ['This voucher code is not valid.'],
                        ]);
                    }

                    $voucherResult = app(VoucherDiscount::class)->calculate(
                        $voucher,
                        array_map(
                            fn (array $item): array => [$item[0], $item[1], $this->amountToCents($item[2])],
                            $items
                        ),
                        $userId
                    );
                }

                foreach (
                    $items
                    as [$product, $quantity, $lineSubtotal]
                ) {
                    $updatedStockRows = Product::whereKey($product->id)
                        ->where('status', 'active')
                        ->where('stock', '>=', $quantity)
                        ->decrement('stock', $quantity);

                    if ($updatedStockRows !== 1) {
                        abort(
                            422,
                            "Not enough stock for {$product->name}."
                        );
                    }

                    $order->items()->create([
                        'product_id' => $product->id,
                        'seller_id' => $product->seller_id,
                        'quantity' => $quantity,
                        'unit_price' => $sellingPrice,
                        'subtotal' => $lineSubtotal,
                    ]);
                }

                $discountCents = $voucherResult['discount_cents'] ?? 0;
                $voucher = $voucherResult['voucher'] ?? null;
                $order->update([
                    'subtotal' => $this->formatCents($subtotalCents),
                    'total_amount' => $this->formatCents($subtotalCents - $discountCents),
                    'voucher_id' => $voucher?->id,
                    'voucher_code' => $voucher?->code,
                    'voucher_discount' => $this->formatCents($discountCents),
                ]);

                if ($voucher) {
                    VoucherRedemption::create([
                        'voucher_id' => $voucher->id,
                        'buyer_id' => $userId,
                        'order_id' => $order->id,
                        'discount_amount' => $this->formatCents($discountCents),
                    ]);
                }

                return $order->load('items.product');
            });
        } catch (QueryException $exception) {
            $existingOrder = Order::with('items.product')
                ->where('buyer_id', $userId)
                ->where('checkout_idempotency_key', $idempotencyKey)
                ->first();

            if (!$existingOrder) {
                throw $exception;
            }

            return $this->idempotentOrderResponse($existingOrder, $requestHash);
        }

        return response()->json([
            'success' => true,
            'message' => 'Order placed successfully.',
            'data' => $order,
        ], 201);
    }

    private function idempotentOrderResponse(Order $order, string $requestHash)
    {
        if (!hash_equals((string) $order->checkout_request_hash, $requestHash)) {
            return response()->json([
                'success' => false,
                'code' => 'checkout_key_conflict',
                'message' => 'This checkout request key has already been used for different order details.',
            ], 409);
        }

        return response()->json([
            'success' => true,
            'message' => 'This order was already placed.',
            'data' => $order,
        ], 200);
    }

    private function amountToCents(string $amount): int
    {
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '0');
        $isNegative = str_starts_with($whole, '-');
        $whole = ltrim($whole, '-');
        $cents = ((int) $whole * 100) + (int) str_pad(substr($fraction, 0, 2), 2, '0');

        return $isNegative ? -$cents : $cents;
    }

    private function formatCents(int $amount): string
    {
        return intdiv($amount, 100).'.'.str_pad((string) ($amount % 100), 2, '0', STR_PAD_LEFT);
    }
}
