<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\CodCollection;
use App\Models\CheckoutGroup;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Order;
use App\Models\OrderShippingCharge;
use App\Models\PlatformConfig;
use App\Models\Product;
use App\Models\ProductDailyMetric;
use App\Models\RefundRequest;
use App\Models\SellerProfile;
use App\Models\User;
use App\Models\Voucher;
use App\Models\VoucherRedemption;
use App\Notifications\SellerActivityNotification;
use App\Support\VoucherDiscount;
use App\Support\ShippingQuote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

class BuyerOrderController extends Controller
{
    public function checkoutData(Request $request)
    {
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

    public function shippingQuote(Request $request, ShippingQuote $shippingQuote)
    {
        $validated = $request->validate([
            'address_id' => ['required', 'integer'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.variant_id' => ['sometimes', 'nullable', 'uuid'],
        ]);
        $address = $request->user()->addresses()->findOrFail($validated['address_id']);
        $products = Product::query()
            ->whereIn('id', collect($validated['items'])->pluck('product_id')->unique())
            ->where('status', 'active')
            ->where('review_status', 'approved')
            ->whereHas('seller', fn ($seller) => $seller->where('role', 'seller')->where('status', 'active'))
            ->get()
            ->keyBy('id');
        $items = [];
        foreach ($validated['items'] as $requested) {
            $product = $products->get($requested['product_id']);
            if (!$product || $product->stock < $requested['quantity']) {
                throw ValidationException::withMessages([
                    'items' => ['A selected product is no longer available in the requested quantity.'],
                ]);
            }
            if ($product->variants) {
                $variant = collect($product->variants)->first(
                    fn (array $candidate) => ($candidate['id'] ?? null) === ($requested['variant_id'] ?? null)
                );
                if (!$variant || (int) $variant['stock'] < $requested['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => ['A selected product variant is no longer available in the requested quantity.'],
                    ]);
                }
            } elseif (!empty($requested['variant_id'])) {
                throw ValidationException::withMessages([
                    'items' => ['A selected product variant is no longer available.'],
                ]);
            }
            $items[] = ['product' => $product, 'quantity' => (int) $requested['quantity']];
        }
        $quote = $shippingQuote->quote($address, $items);

        return response()->json([
            'success' => true,
            'data' => $quote,
        ]);
    }

    public function index(Request $request)
    {
        $query = Order::with(['items.product', 'shippingCharge', 'codCollection', 'delivery.events', 'delivery.pickupAssignment', 'delivery.courierProfile.user:id,first_name,last_name', 'delivery.deliveryArea'])
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
        $order = Order::with(['items.product', 'shippingCharge', 'codCollection', 'delivery.events', 'delivery.pickupAssignment', 'delivery.courierProfile.user:id,first_name,last_name', 'delivery.deliveryArea', 'delivery.currentHub', 'delivery.returnShipment.currentHub', 'latestRefundRequest.returnShipment.currentHub'])
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

    public function cancel(Request $request, int $id)
    {
        $order = DB::transaction(function () use ($request, $id) {
            $order = Order::with('items')
                ->where('buyer_id', $request->user()->id)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            abort_unless(in_array(strtoupper((string) $order->status), ['PENDING', 'PLACED'], true), 409, 'This order can no longer be cancelled. Contact the seller if you need help.');
            abort_if($order->delivery()->exists(), 409, 'This order already has shipment activity and can no longer be cancelled here. Contact the seller for help.');

            foreach ($order->items as $item) {
                $product = Product::whereKey($item->product_id)->lockForUpdate()->first();
                if (!$product) continue;

                $variants = $product->variants ?? [];
                if ($variants) {
                    $variantIndex = collect($variants)->search(function (array $variant) use ($item): bool {
                        if (filled($item->variant_id)) return (string) ($variant['id'] ?? '') === (string) $item->variant_id;
                        return filled($item->variant_label) && collect([
                            filled($variant['color'] ?? null) ? 'Color: '.$variant['color'] : null,
                            filled($variant['size'] ?? null) ? 'Size: '.$variant['size'] : null,
                        ])->filter()->implode(' · ') === $item->variant_label;
                    });
                    abort_if($variantIndex === false, 409, "This order's product option changed, so it cannot be safely cancelled. Contact the seller for help.");
                    $variants[$variantIndex]['stock'] = (int) ($variants[$variantIndex]['stock'] ?? 0) + (int) $item->quantity;
                    $product->variants = $variants;
                }

                $product->stock = (int) $product->stock + (int) $item->quantity;
                $product->save();
            }

            $order->status = 'CANCELLED';
            $order->save();
            Commission::where('order_id', $order->id)->whereIn('status', ['pending', 'available'])->update(['status' => 'cancelled']);
            CodCollection::where('order_id', $order->id)->where('status', 'awaiting_collection')->update(['status' => 'cancelled']);
            // Reverse the voucher redemption so the use count is returned to the voucher.
            // This must run inside the transaction so it rolls back if anything fails.
            if (
                !$order->checkout_group_id
                || !Order::where('checkout_group_id', $order->checkout_group_id)
                    ->where('status', '!=', 'CANCELLED')
                    ->exists()
            ) {
                VoucherRedemption::where('order_id', $order->id)
                    ->orWhereIn('order_id', $order->checkoutGroup?->orders()->pluck('id') ?? [])
                    ->delete();
            }

            return $order->load('items.product');
        });

        return response()->json(['success' => true, 'message' => 'Order cancelled and stock restored.', 'data' => $order]);
    }

    public function requestRefund(Request $request, int $id)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:2000', 'not_regex:/^\\s*$/u'],
            'requested_amount' => ['required', 'numeric', 'decimal:0,2', 'gt:0'],
        ]);

        $buyer = $request->user();
        abort_unless($buyer->role === 'buyer', 403, 'Only buyers can request a refund.');

        $refundRequest = DB::transaction(function () use ($buyer, $id, $validated) {
            $order = Order::where('buyer_id', $buyer->id)->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless(in_array(strtoupper((string) $order->status), ['DELIVERED', 'COMPLETED'], true), 422, 'A refund request can be submitted after the order is delivered.');
            abort_if((float) $validated['requested_amount'] > (float) $order->total_amount, 422, 'The requested amount cannot exceed the order total.');

            $openRequest = RefundRequest::where('order_id', $order->id)
                ->whereIn('status', ['pending', 'under_review', 'approved'])
                ->exists();
            abort_if($openRequest, 409, 'This order already has an active refund request.');
            abort_if(RefundRequest::where('order_id', $order->id)->where('status', 'refunded')->exists(), 409, 'This order has already been refunded.');

            User::whereKey($buyer->id)->lockForUpdate()->firstOrFail();
            $admin = User::where('role', 'admin')->where('status', 'active')->first();
            $conversation = Conversation::where('buyer_id', $buyer->id)
                ->whereNull('seller_id')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();
            if (!$conversation) {
                $conversation = Conversation::create(['buyer_id' => $buyer->id, 'admin_id' => $admin?->id]);
            } elseif (
                $admin
                && !$conversation->admin()->where('role', 'admin')->where('status', 'active')->exists()
            ) {
                $conversation->update(['admin_id' => $admin->id]);
            }

            $refundRequest = RefundRequest::create([
                'order_id' => $order->id,
                'buyer_id' => $buyer->id,
                'conversation_id' => $conversation->id,
                'requested_amount' => $validated['requested_amount'],
                'reason' => trim($validated['reason']),
                'status' => 'pending',
            ]);

            Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $buyer->id,
                'sender_type' => 'user',
                'order_id' => $order->id,
                'message' => "Refund request #{$refundRequest->id} submitted for Order #{$order->id} (₱".number_format((float) $refundRequest->requested_amount, 2).'). Reason: '.trim($validated['reason']),
                'is_read' => false,
            ]);
            Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $buyer->id,
                'sender_type' => 'assistant',
                'order_id' => $order->id,
                'message' => "Refund request #{$refundRequest->id} is now pending Customer Service review. You can track its status on Order #{$order->id}. Approval and repayment are not automatic.",
                'is_read' => true,
            ]);
            $conversation->touch();

            return $refundRequest;
        });

        return response()->json([
            'success' => true,
            'message' => 'Refund request submitted for review.',
            'data' => $refundRequest->fresh(),
        ], 201);
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
            $cod = \App\Models\CodCollection::where('order_id', $order->id)->first();
            $hasOpenRefund = RefundRequest::where('order_id', $order->id)->whereIn('status', ['pending', 'under_review', 'approved'])->exists();
            if ($cod?->status === 'remitted' && !$hasOpenRefund) {
                Commission::where('order_id', $order->id)->where('status', 'pending')->update(['status' => 'available']);
            }
            \App\Support\OrderDeliveryProjection::event($delivery, [
                'actor_id' => $request->user()->id,
                'event_type' => 'buyer_receipt_confirmed',
                'previous_status' => 'DELIVERED',
                'new_status' => 'COMPLETED',
                'previous_courier_profile_id' => $delivery->courier_profile_id,
                'courier_profile_id' => $delivery->courier_profile_id,
            ]);

            $sellerIds = $order->items()->distinct()->pluck('seller_id');
            User::whereIn('id', $sellerIds)->where('role', 'seller')->get()->each(function (User $seller) use ($order) {
                $seller->notify(new SellerActivityNotification(
                    'Customer confirmed delivery',
                    "The customer confirmed receipt of order #{$order->id}.",
                    'order_received',
                    '/seller/orders',
                    ['order_id' => $order->id, 'status' => 'COMPLETED'],
                ));
            });

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
            'shipping_voucher_code' => ['sometimes', 'nullable', 'string', 'max:64'],

            'payment_method' => [
                'required',
                'in:cash_on_delivery',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],

            'items.*.product_id' => [
                'required',
                'integer',
            ],

            'items.*.variant_id' => ['sometimes', 'nullable', 'uuid'],
            'items.*.quantity' => [
                'required',
                'integer',
                'min:1',
            ],
        ]);
        $combinationKeys = collect($validated['items'])
            ->map(fn (array $item) => $item['product_id'].'|'.($item['variant_id'] ?? 'base'));
        if ($combinationKeys->unique()->count() !== $combinationKeys->count()) {
            throw ValidationException::withMessages([
                'items' => ['Each product variant can only be checked out once.'],
            ]);
        }
        $validated['voucher_code'] = filled($validated['voucher_code'] ?? null)
            ? mb_strtoupper(trim($validated['voucher_code']))
            : null;
        $validated['shipping_voucher_code'] = filled($validated['shipping_voucher_code'] ?? null)
            ? mb_strtoupper(trim($validated['shipping_voucher_code']))
            : null;

        $userId = $request->user()->id;
        $selectedAddress = !empty($validated['address_id'])
            ? $request->user()->addresses()->findOrFail($validated['address_id'])
            : $request->user()->addresses()->orderByDesc('is_default')->latest('id')->first();
        if (!$selectedAddress) {
            throw ValidationException::withMessages([
                'address_id' => ['Save a delivery address before placing an order.'],
            ]);
        }
        $validated['address_id'] = $selectedAddress->id;
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
        $canonicalItems = collect($validated['items'])
            ->map(fn (array $item): array => [
                'product_id' => (int) $item['product_id'],
                'variant_id' => $item['variant_id'] ?? null,
                'quantity' => (int) $item['quantity'],
            ])
            ->sortBy(fn (array $item) => $item['product_id'].'|'.($item['variant_id'] ?? ''))
            ->values()
            ->all();
        $requestDetails = [
            'delivery_address' => trim($validated['delivery_address']),
            'address_id' => (int) $validated['address_id'],
            'payment_method' => $validated['payment_method'],
            'items' => $canonicalItems,
        ];
        if ($validated['voucher_code'] !== null) {
            $requestDetails['voucher_code'] = $validated['voucher_code'];
        }
        if ($validated['shipping_voucher_code'] !== null) {
            $requestDetails['shipping_voucher_code'] = $validated['shipping_voucher_code'];
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
            $orders = DB::transaction(function () use ($request, $validated, $userId, $idempotencyKey, $requestHash) {
                // Reserve the request key before stock checks. The unique index
                // serializes concurrent retries of the same buyer request.
                $group = CheckoutGroup::create([
                    'buyer_id' => $userId,
                    'address_id' => $validated['address_id'],
                    'delivery_address' => trim($validated['delivery_address']),
                    'payment_method' => $validated['payment_method'],
                    'subtotal' => 0,
                    'shipping_fee' => 0,
                    'voucher_discount' => 0,
                    'shipping_voucher_discount' => 0,
                    'total_amount' => 0,
                    'voucher_code' => $validated['voucher_code'],
                    'shipping_voucher_code' => $validated['shipping_voucher_code'],
                    'idempotency_key' => $idempotencyKey,
                    'request_hash' => $requestHash,
                ]);
                $order = Order::create([
                    'buyer_id' => $userId,
                    'checkout_group_id' => $group->id,
                    'delivery_address' => trim($validated['delivery_address']),
                    'payment_method' => $validated['payment_method'],
                    'subtotal' => 0,
                    'shipping_fee' => 0,
                    'total_amount' => 0,
                    'voucher_code' => null,
                    'voucher_discount' => 0,
                    'shipping_voucher_id' => null,
                    'shipping_voucher_code' => null,
                    'shipping_voucher_discount' => 0,
                    'status' => 'pending',
                    'checkout_idempotency_key' => $idempotencyKey,
                    'checkout_request_hash' => $requestHash,
                ]);

                $items = [];
                $variantStocks = [];
                $vacationSellers = [];
                $subtotalCents = 0;

                foreach ($validated['items'] as $requestedItem) {
                    $product = Product::with('seller.sellerProfile')
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

                    $sellerId = (int) $product->seller_id;
                    if (!array_key_exists($sellerId, $vacationSellers)) {
                        $sellerProfile = SellerProfile::query()
                            ->where('user_id', $sellerId)
                            ->lockForUpdate()
                            ->first();
                        $vacationSellers[$sellerId] = [
                            'on_vacation' => (bool) data_get($sellerProfile?->storefront_settings, 'on_vacation', false),
                            'name' => $sellerProfile?->business_name ?: 'This seller',
                        ];
                    }
                    if ($vacationSellers[$sellerId]['on_vacation']) {
                        abort(422, $vacationSellers[$sellerId]['name'].' is on vacation and is not accepting orders. Please remove this item and try again when the seller returns.');
                    }

                    if ($product->stock < $requestedItem['quantity']) {
                        abort(
                            422,
                            "Not enough stock for {$product->name}."
                        );
                    }

                    $variant = null;
                    if (!empty($product->variants)) {
                        if (!isset($variantStocks[$product->id])) {
                            $variantStocks[$product->id] = $product->variants;
                        }
                        $variantIndex = collect($variantStocks[$product->id])->search(
                            fn (array $candidate) => ($candidate['id'] ?? null) === ($requestedItem['variant_id'] ?? null)
                        );
                        if ($variantIndex === false) {
                            abort(422, "A selected variant of {$product->name} is no longer available.");
                        }
                        $variant = $variantStocks[$product->id][$variantIndex];
                        if ((int) $variant['stock'] < $requestedItem['quantity']) {
                            abort(422, "Not enough stock for the selected variant of {$product->name}.");
                        }
                        $variantStocks[$product->id][$variantIndex]['stock'] -= (int) $requestedItem['quantity'];
                    } elseif (!empty($requestedItem['variant_id'])) {
                        abort(422, "A selected variant of {$product->name} is no longer available.");
                    }

                    $sellingPrice = $variant
                        ? (string) ($variant['discounted_price'] ?? $variant['price'])
                        : $product->sellingPrice();
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
                        $sellingPrice,
                        $variant ? collect([
                            filled($variant['color'] ?? null) ? 'Color: '.$variant['color'] : null,
                            filled($variant['size'] ?? null) ? 'Size: '.$variant['size'] : null,
                        ])->filter()->implode(' · ') : null,
                        $variant['id'] ?? null,
                    ];
                }

                $selectedAddress = !empty($validated['address_id'])
                    ? $request->user()->addresses()->findOrFail($validated['address_id'])
                    : null;
                if (!$selectedAddress) {
                    throw ValidationException::withMessages([
                        'address_id' => ['Save a delivery address before placing an order.'],
                    ]);
                }
                $shippingQuote = app(ShippingQuote::class)->quote(
                    $selectedAddress,
                    array_map(fn (array $item): array => [
                        'product' => $item[0],
                        'quantity' => $item[1],
                    ], $items),
                    true
                );
                $shippingFeeCents = $this->amountToCents($shippingQuote['shipping_fee']);

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
                    if ($voucher->scope !== 'product') {
                        throw ValidationException::withMessages([
                            'voucher_code' => ['This is a shipping voucher. Apply it in the shipping voucher field.'],
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

                $shippingVoucherResult = null;
                if ($validated['shipping_voucher_code'] !== null) {
                    if (!$selectedAddress || !$shippingQuote) {
                        throw ValidationException::withMessages([
                            'shipping_voucher_code' => ['Choose a delivery address with a configured shipping rate first.'],
                        ]);
                    }

                    $shippingVoucher = Voucher::query()
                        ->whereRaw('UPPER(code) = ?', [$validated['shipping_voucher_code']])
                        ->lockForUpdate()
                        ->first();
                    if (!$shippingVoucher) {
                        throw ValidationException::withMessages([
                            'shipping_voucher_code' => ['This shipping voucher code is not valid.'],
                        ]);
                    }

                    $shippingVoucherResult = app(VoucherDiscount::class)->calculateShipping(
                        $shippingVoucher,
                        $shippingFeeCents,
                        $subtotalCents,
                        $userId
                    );
                }

                foreach ($items as [$product, $quantity]) {
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
                }
                foreach ($variantStocks as $productId => $variants) {
                    Product::whereKey($productId)->update([
                        'variants' => json_encode($variants, JSON_THROW_ON_ERROR),
                    ]);
                }

                $discountCents = $voucherResult['discount_cents'] ?? 0;
                $voucher = $voucherResult['voucher'] ?? null;
                $shippingDiscountCents = $shippingVoucherResult['discount_cents'] ?? 0;
                $shippingVoucher = $shippingVoucherResult['voucher'] ?? null;
                $totalCents = $subtotalCents - $discountCents + $shippingFeeCents - $shippingDiscountCents;
                if ($totalCents > 999_999_999_999) {
                    abort(422, 'The order total exceeds the supported amount.');
                }
                $itemsBySeller = collect($items)->groupBy(fn (array $item) => (int) $item[0]->seller_id);
                $shippingParcels = collect($shippingQuote['parcels'])->keyBy('seller_id');
                $sellerSubtotals = $itemsBySeller->map(
                    fn ($sellerItems) => $sellerItems->sum(fn (array $item) => $this->amountToCents($item[2]))
                )->all();
                $productDiscountBySeller = $voucherResult
                    ? $this->allocateCents($discountCents, $voucherResult['eligible_subtotal_by_seller_cents'])
                    : [];
                $sellerShippingFees = $shippingParcels->map(
                    fn (array $parcel) => $this->amountToCents($parcel['shipping_fee'])
                )->all();
                $shippingDiscountBySeller = $shippingVoucherResult
                    ? $this->allocateCents($shippingDiscountCents, $sellerShippingFees)
                    : [];
                $commissionRatePercent = (float) PlatformConfig::getValue('commission_rate_percent', '10.00');
                $orders = collect();
                foreach ($itemsBySeller as $sellerId => $sellerItems) {
                    $parcel = $shippingParcels->get((int) $sellerId);
                    if (!$parcel) {
                        abort(422, 'A shipping quote could not be matched to every seller parcel.');
                    }
                    $sellerSubtotalCents = (int) $sellerSubtotals[$sellerId];
                    $sellerDiscountCents = (int) ($productDiscountBySeller[$sellerId] ?? 0);
                    $sellerShippingCents = (int) $sellerShippingFees[$sellerId];
                    $sellerShippingDiscountCents = (int) ($shippingDiscountBySeller[$sellerId] ?? 0);
                    $sellerTotalCents = $sellerSubtotalCents - $sellerDiscountCents
                        + $sellerShippingCents - $sellerShippingDiscountCents;
                    $suborder = $orders->isEmpty()
                        ? $order
                        : Order::create([
                            'buyer_id' => $userId,
                            'checkout_group_id' => $group->id,
                            'delivery_address' => trim($validated['delivery_address']),
                            'payment_method' => $validated['payment_method'],
                            'subtotal' => 0,
                            'shipping_fee' => 0,
                            'total_amount' => 0,
                            'status' => 'pending',
                        ]);
                    $suborder->update([
                        'subtotal' => $this->formatCents($sellerSubtotalCents),
                        'shipping_fee' => $this->formatCents($sellerShippingCents),
                        'total_amount' => $this->formatCents($sellerTotalCents),
                        'voucher_id' => $voucher?->id,
                        'voucher_code' => $voucher?->code,
                        'voucher_discount' => $this->formatCents($sellerDiscountCents),
                        'shipping_voucher_id' => $shippingVoucher?->id,
                        'shipping_voucher_code' => $shippingVoucher?->code,
                        'shipping_voucher_discount' => $this->formatCents($sellerShippingDiscountCents),
                    ]);

                    foreach ($sellerItems as [$product, $quantity, $lineSubtotal, $sellingPrice, $variantLabel, $variantId]) {
                        $suborder->items()->create([
                            'product_id' => $product->id,
                            'seller_id' => $product->seller_id,
                            'quantity' => $quantity,
                            'unit_price' => $sellingPrice,
                            'subtotal' => $lineSubtotal,
                            'unit_weight_kg' => $product->weight_kg,
                            'unit_length_cm' => $product->length_cm,
                            'unit_width_cm' => $product->width_cm,
                            'unit_height_cm' => $product->height_cm,
                            'variant_label' => $variantLabel,
                            'variant_id' => $variantId,
                        ]);
                        ProductDailyMetric::recordPurchase($product, (int) $quantity);
                    }
                    OrderShippingCharge::create([
                        'order_id' => $suborder->id,
                        'seller_id' => (int) $sellerId,
                        'rate_id' => $parcel['rate_id'],
                        'provider' => $parcel['provider'],
                        'origin_zone' => $parcel['origin_zone'],
                        'destination_zone' => $parcel['destination_zone'],
                        'actual_weight_kg' => $parcel['actual_weight_kg'],
                        'volumetric_weight_kg' => $parcel['volumetric_weight_kg'],
                        'billable_weight_kg' => $parcel['billable_weight_kg'],
                        'fee' => $parcel['shipping_fee'],
                        'min_delivery_days' => $parcel['min_delivery_days'],
                        'max_delivery_days' => $parcel['max_delivery_days'],
                        'is_provisional' => $parcel['is_provisional'],
                    ]);

                    $earningsBasisCents = max(0, $sellerSubtotalCents - $sellerDiscountCents);
                    $commissionCents = (int) round($earningsBasisCents * ($commissionRatePercent / 100));
                    Commission::create([
                        'order_id' => $suborder->id,
                        'seller_id' => (int) $sellerId,
                        'order_amount' => $this->formatCents($earningsBasisCents),
                        'commission_rate' => $commissionRatePercent,
                        'commission_amount' => $this->formatCents($commissionCents),
                        'seller_earnings' => $this->formatCents($earningsBasisCents - $commissionCents),
                        'status' => 'pending',
                    ]);
                    CodCollection::create([
                        'order_id' => $suborder->id,
                        'expected_amount' => $this->formatCents($sellerTotalCents),
                        'status' => 'awaiting_collection',
                    ]);
                    $orders->push($suborder);
                }

                $group->update([
                    'subtotal' => $this->formatCents($subtotalCents),
                    'shipping_fee' => $this->formatCents($shippingFeeCents),
                    'voucher_discount' => $this->formatCents($discountCents),
                    'shipping_voucher_discount' => $this->formatCents($shippingDiscountCents),
                    'total_amount' => $this->formatCents($totalCents),
                ]);

                if ($voucher) {
                    VoucherRedemption::create([
                        'voucher_id' => $voucher->id,
                        'buyer_id' => $userId,
                        'order_id' => $order->id,
                        'discount_amount' => $this->formatCents($discountCents),
                    ]);
                }
                if ($shippingVoucher) {
                    VoucherRedemption::create([
                        'voucher_id' => $shippingVoucher->id,
                        'buyer_id' => $userId,
                        'order_id' => $order->id,
                        'discount_amount' => $this->formatCents($shippingDiscountCents),
                    ]);
                }

                $orders = $orders->map(fn (Order $suborder) => $suborder->load('items.product', 'shippingCharge'));
                $this->attachSellerStorefrontNames($orders);
                $primaryOrder = $orders->first();
                $primaryOrder->setAttribute(
                    'checkout_orders',
                    $orders->map(fn (Order $suborder) => $suborder->toArray())->values()
                );
                $primaryOrder->setAttribute('checkout_group_summary', $group);

                return $orders;
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

        $buyerName = trim(implode(' ', array_filter([$request->user()->first_name, $request->user()->last_name]))) ?: 'A buyer';
        foreach ($orders as $suborder) {
            $sellerItems = $suborder->items;
            $seller = User::query()->where('role', 'seller')->find($sellerItems->first()?->seller_id);
            $seller?->notify(new SellerActivityNotification(
                'New order received',
                "{$buyerName} placed order #{$suborder->id} with {$sellerItems->count()} product item".($sellerItems->count() === 1 ? '.' : 's.'),
                'new_order',
                '/seller/orders',
                ['order_id' => $suborder->id],
            ));
        }

        return response()->json([
            'success' => true,
            'message' => $orders->count() > 1
                ? 'Checkout placed successfully. Each seller parcel has its own order.'
                : 'Order placed successfully.',
            'data' => $orders->first(),
        ], 201);
    }

    private function attachSellerStorefrontNames($orders): void
    {
        $sellerIds = $orders
            ->flatMap(fn (Order $suborder) => $suborder->items->pluck('seller_id'))
            ->filter()
            ->unique()
            ->values();
        $storefrontNames = SellerProfile::query()
            ->whereIn('user_id', $sellerIds)
            ->pluck('business_name', 'user_id');

        foreach ($orders as $suborder) {
            $sellerId = $suborder->items->pluck('seller_id')->filter()->first();
            $suborder->setAttribute(
                'seller_storefront_name',
                $storefrontNames->get($sellerId) ?: 'Seller'
            );
        }
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

        $order->loadMissing([
            'items.product',
            'shippingCharge',
            'checkoutGroup.orders.items.product',
            'checkoutGroup.orders.shippingCharge',
        ]);
        $checkoutGroup = $order->checkoutGroup;
        $orders = $checkoutGroup?->orders ?? collect([$order]);
        $this->attachSellerStorefrontNames($orders);
        $order->setAttribute(
            'checkout_orders',
            $orders->map(fn (Order $suborder) => $suborder->toArray())->values()
        );
        $checkoutGroup?->unsetRelation('orders');
        $order->unsetRelation('checkoutGroup');
        $order->setAttribute('checkout_group_summary', $checkoutGroup);

        return response()->json([
            'success' => true,
            'message' => $orders->count() > 1
                ? 'This checkout was already placed.'
                : 'This order was already placed.',
            'data' => $order,
        ], 200);
    }

    /**
     * @param array<int, int> $weights keyed by seller ID
     * @return array<int, int>
     */
    private function allocateCents(int $totalCents, array $weights): array
    {
        $positiveWeights = array_filter($weights, fn (int $weight) => $weight > 0);
        $weightTotal = array_sum($positiveWeights);
        if ($totalCents <= 0) {
            return array_fill_keys(array_keys($weights), 0);
        }
        if ($weightTotal <= 0) {
            throw new \LogicException('A checkout discount cannot be allocated without an eligible seller amount.');
        }

        $allocations = array_fill_keys(array_keys($weights), 0);
        $remainders = [];
        $allocated = 0;
        foreach ($positiveWeights as $sellerId => $weight) {
            $share = ($totalCents * $weight) / $weightTotal;
            $allocations[$sellerId] = (int) floor($share);
            $remainders[$sellerId] = $share - $allocations[$sellerId];
            $allocated += $allocations[$sellerId];
        }
        arsort($remainders, SORT_NUMERIC);
        foreach (array_keys($remainders) as $sellerId) {
            if ($allocated >= $totalCents) {
                break;
            }
            $allocations[$sellerId]++;
            $allocated++;
        }

        return $allocations;
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
