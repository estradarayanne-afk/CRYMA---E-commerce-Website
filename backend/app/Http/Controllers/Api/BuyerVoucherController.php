<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Voucher;
use App\Models\VoucherClaim;
use App\Support\VoucherDiscount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BuyerVoucherController extends Controller
{
    public function index(Request $request)
    {
        $buyerId = $request->user()->id;
        $vouchers = Voucher::query()
            ->where(function ($query) use ($buyerId) {
                $query->where('is_active', true)
                    ->orWhereHas('redemptions', fn ($redemptions) => $redemptions->where('buyer_id', $buyerId))
                    ->orWhereHas('claims', fn ($claims) => $claims->where('buyer_id', $buyerId));
            })
            ->with(['seller:id,first_name,last_name', 'seller.sellerProfile:user_id,business_name'])
            ->withCount([
                'redemptions',
                'redemptions as buyer_redemptions_count' => fn ($query) => $query->where('buyer_id', $buyerId),
                'claims as buyer_claims_count' => fn ($query) => $query->where('buyer_id', $buyerId),
            ])
            ->orderByDesc('is_active')
            ->orderBy('expires_at')
            ->get();
        $eligibleProductNames = Product::query()
            ->where('status', 'active')
            ->where('review_status', 'approved')
            ->whereHas('seller', fn ($seller) => $seller->where('role', 'seller')->where('status', 'active'))
            ->whereIn('id', $vouchers->flatMap(fn (Voucher $voucher) => $voucher->product_ids ?? [])->unique())
            ->pluck('name', 'id');
        $vouchers = $vouchers->map(function (Voucher $voucher) use ($eligibleProductNames) {
                [$status, $reason] = $this->statusDetails($voucher);
                $voucher->setAttribute('buyer_status', $status);
                $voucher->setAttribute('buyer_status_reason', $reason);
                $voucher->setAttribute('is_claimed', $voucher->buyer_claims_count > 0);
                $voucher->setAttribute('eligible_product_names', collect($voucher->product_ids ?? [])
                    ->map(fn ($id) => $eligibleProductNames->get($id))
                    ->filter()
                    ->values());
                if ($voucher->seller) {
                    $voucher->setAttribute('seller_name', $voucher->seller->sellerProfile?->business_name
                        ?: trim($voucher->seller->first_name.' '.$voucher->seller->last_name));
                }
                $voucher->setAttribute('voucher_seller_id', $voucher->seller_id);
                $voucher->makeHidden(['seller', 'seller_id']);
                return $voucher;
            });

        return response()->json(['success' => true, 'data' => $vouchers]);
    }

    public function claim(Request $request, int $id)
    {
        $buyerId = $request->user()->id;
        $voucher = DB::transaction(function () use ($id, $buyerId) {
            $voucher = Voucher::query()->lockForUpdate()->findOrFail($id);
            if ($voucher->claims()->where('buyer_id', $buyerId)->exists()) {
                return $voucher;
            }
            if (!$voucher->is_active) {
                throw ValidationException::withMessages(['voucher' => ['This voucher is not available to claim.']]);
            }
            if ($voucher->starts_at?->isFuture()) {
                throw ValidationException::withMessages(['voucher' => ['This voucher is not available yet.']]);
            }
            if ($voucher->expires_at?->isPast()) {
                throw ValidationException::withMessages(['voucher' => ['This voucher has expired.']]);
            }
            if ($voucher->usage_limit !== null && $voucher->redemptions()->count() >= $voucher->usage_limit) {
                throw ValidationException::withMessages(['voucher' => ['This voucher has reached its usage limit.']]);
            }
            if ($voucher->redemptions()->where('buyer_id', $buyerId)->count() >= $voucher->per_buyer_limit) {
                throw ValidationException::withMessages(['voucher' => ['You have already used this voucher the maximum number of times.']]);
            }

            $products = Product::query()
                ->where('status', 'active')
                ->where('review_status', 'approved')
                ->whereHas('seller', fn ($seller) => $seller->where('role', 'seller')->where('status', 'active'));
            if ($voucher->seller_id !== null) $products->where('seller_id', $voucher->seller_id);
            $productIds = $voucher->product_ids ?? [];
            $categories = $voucher->categories ?? [];
            if ($productIds || $categories) {
                $products->where(function ($query) use ($productIds, $categories) {
                    if ($productIds) $query->whereIn('id', $productIds);
                    if ($categories) {
                        $productIds ? $query->orWhereIn('category', $categories) : $query->whereIn('category', $categories);
                    }
                });
            }
            if (!$products->exists()) {
                throw ValidationException::withMessages(['voucher' => ['This voucher has no eligible products available right now.']]);
            }

            VoucherClaim::create(['voucher_id' => $voucher->id, 'buyer_id' => $buyerId]);
            return $voucher;
        });

        return response()->json([
            'success' => true,
            'message' => 'Voucher added to your account.',
            'data' => ['voucher_id' => $voucher->id, 'is_claimed' => true],
        ], 201);
    }

    public function validateCode(Request $request, VoucherDiscount $discounts)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:64'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.variant_id' => ['sometimes', 'nullable', 'uuid'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);
        $combinationKeys = collect($validated['items'])
            ->map(fn (array $item) => $item['product_id'].'|'.($item['variant_id'] ?? 'base'));
        if ($combinationKeys->unique()->count() !== $combinationKeys->count()) {
            throw ValidationException::withMessages(['items' => ['Each product variant can only appear once in a voucher check.']]);
        }

        return DB::transaction(function () use ($request, $validated, $discounts) {
            $items = $this->loadItems($validated['items'], $discounts);
            $voucher = Voucher::query()
                ->whereRaw('UPPER(code) = ?', [mb_strtoupper(trim($validated['code']))])
                ->first();

            if (!$voucher) {
                throw ValidationException::withMessages(['code' => ['This voucher code is not valid.']]);
            }

            $result = $discounts->calculate($voucher, $items, $request->user()->id);

            return response()->json([
                'success' => true,
                'data' => [
                    'voucher' => $voucher,
                    'subtotal' => $discounts->formatCents($result['subtotal_cents']),
                    'eligible_subtotal' => $discounts->formatCents($result['eligible_subtotal_cents']),
                    'discount_amount' => $discounts->formatCents($result['discount_cents']),
                ],
            ]);
        });
    }

    /**
     * @param array<int, array{product_id: int, quantity: int}> $requestedItems
     * @return array<int, array{0: Product, 1: int, 2: int}>
     */
    private function loadItems(array $requestedItems, VoucherDiscount $discounts): array
    {
        $result = [];
        $sellerIds = [];
        $totalCents = 0;
        foreach ($requestedItems as $requested) {
            $product = Product::query()
                ->where('status', 'active')
                ->where('review_status', 'approved')
                ->whereHas('seller', fn ($seller) => $seller->where('role', 'seller')->where('status', 'active'))
                ->find($requested['product_id']);
            if (!$product || $product->stock < $requested['quantity']) {
                throw ValidationException::withMessages(['items' => ['A selected product is no longer available in the requested quantity.']]);
            }
            $variant = null;
            if (!empty($product->variants)) {
                $variant = collect($product->variants)->first(
                    fn (array $candidate) => ($candidate['id'] ?? null) === ($requested['variant_id'] ?? null)
                );
                if (!$variant || (int) $variant['stock'] < $requested['quantity']) {
                    throw ValidationException::withMessages(['items' => ['A selected product variant is no longer available in the requested quantity.']]);
                }
            } elseif (!empty($requested['variant_id'])) {
                throw ValidationException::withMessages(['items' => ['The selected product does not have that variant.']]);
            }
            $sellerIds[] = $product->seller_id;
            $priceCents = $discounts->toCents(
                $variant
                    ? (string) ($variant['discounted_price'] ?? $variant['price'])
                    : $product->sellingPrice()
            );
            $quantity = (int) $requested['quantity'];
            $maxOrderCents = 999_999_999_999;
            if (
                $priceCents < 0 ||
                $priceCents > intdiv($maxOrderCents, $quantity) ||
                $totalCents > $maxOrderCents - ($priceCents * $quantity)
            ) {
                throw ValidationException::withMessages(['items' => ['The selected products have an invalid or unsupported total.']]);
            }
            $lineCents = $priceCents * $quantity;
            $totalCents += $lineCents;
            $result[] = [$product, $quantity, $lineCents];
        }

        if (count(array_unique($sellerIds)) > 1) {
            throw ValidationException::withMessages(['items' => ['Please checkout products from one seller at a time.']]);
        }

        return $result;
    }

    private function statusDetails(Voucher $voucher): array
    {
        if ($voucher->buyer_redemptions_count >= $voucher->per_buyer_limit) {
            return ['used', 'You have used this voucher the maximum number of times.'];
        }
        if ($voucher->expires_at && $voucher->expires_at->isPast()) {
            return ['expired', 'This voucher has expired.'];
        }
        if (!$voucher->is_active) {
            return ['ineligible', 'This voucher is currently inactive.'];
        }
        if ($voucher->starts_at && $voucher->starts_at->isFuture()) {
            return ['ineligible', 'This voucher is not available yet.'];
        }
        if ($voucher->usage_limit !== null && $voucher->redemptions_count >= $voucher->usage_limit) {
            return ['ineligible', 'This voucher has reached its usage limit.'];
        }
        return ['available', null];
    }
}
