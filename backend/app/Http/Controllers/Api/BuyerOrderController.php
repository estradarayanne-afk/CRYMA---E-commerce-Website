<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Conversation;
use App\Models\Commission;
use App\Models\CodCollection;
use App\Models\Message;
use App\Models\Product;
use App\Models\RefundRequest;
use App\Models\SellerProfile;
use App\Models\Voucher;
use App\Models\VoucherRedemption;
use App\Models\User;
use App\Notifications\SellerActivityNotification;
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
        $order = Order::with(['items.product', 'delivery.events', 'delivery.pickupAssignment', 'delivery.deliveryArea', 'delivery.currentHub', 'latestRefundRequest.returnShipment.currentHub'])
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

            'payment_method' => [
                'required',
                'in:cash_on_delivery',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
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
                'variant_id' => $item['variant_id'] ?? null,
                'quantity' => (int) $item['quantity'],
            ])
            ->sortBy(fn (array $item) => $item['product_id'].'|'.($item['variant_id'] ?? ''))
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
                $variantStocks = [];
                $vacationSellers = [];
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
                    as [$product, $quantity, $lineSubtotal, $sellingPrice, $variantLabel, $variantId]
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
                        'unit_weight_kg' => $product->weight_kg,
                        'variant_label' => $variantLabel,
                        'variant_id' => $variantId,
                    ]);
                }
                foreach ($variantStocks as $productId => $variants) {
                    Product::whereKey($productId)->update([
                        'variants' => json_encode($variants, JSON_THROW_ON_ERROR),
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

                $earningsBasisCents = max(0, $subtotalCents - $discountCents);
                $commissionCents = (int) round($earningsBasisCents * 0.10);
                $sellerId = $order->items()->value('seller_id');
                Commission::create([
                    'order_id' => $order->id,
                    'seller_id' => $sellerId,
                    'order_amount' => $this->formatCents($earningsBasisCents),
                    'commission_rate' => 10.00,
                    'commission_amount' => $this->formatCents($commissionCents),
                    'seller_earnings' => $this->formatCents($earningsBasisCents - $commissionCents),
                    'status' => 'pending',
                ]);
                CodCollection::create([
                    'order_id' => $order->id,
                    'expected_amount' => $this->formatCents($subtotalCents - $discountCents),
                    'status' => 'awaiting_collection',
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

        $order->loadMissing('items');
        $buyerName = trim(implode(' ', array_filter([$request->user()->first_name, $request->user()->last_name]))) ?: 'A buyer';
        foreach ($order->items->groupBy('seller_id') as $sellerId => $sellerItems) {
            $seller = User::query()->where('role', 'seller')->find($sellerId);
            $seller?->notify(new SellerActivityNotification(
                'New order received',
                "{$buyerName} placed order #{$order->id} with {$sellerItems->count()} product item".($sellerItems->count() === 1 ? '.' : 's.'),
                'new_order',
                '/seller/orders',
                ['order_id' => $order->id],
            ));
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
