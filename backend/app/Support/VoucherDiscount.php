<?php

namespace App\Support;

use App\Models\Product;
use App\Models\Voucher;
use Illuminate\Validation\ValidationException;

class VoucherDiscount
{
    /**
     * @param array<int, array{0: Product, 1: int, 2: int}> $items
     * @return array{voucher: Voucher, subtotal_cents: int, eligible_subtotal_cents: int, discount_cents: int}
     */
    public function calculate(Voucher $voucher, array $items, int $buyerId): array
    {
        $discountValueCents = $this->toCents((string) $voucher->discount_value);
        if ($discountValueCents <= 0 || ($voucher->discount_type === 'percentage' && $discountValueCents > 10000)) {
            $this->reject('This voucher has an invalid discount configuration.');
        }
        if (!$voucher->is_active) {
            $this->reject('This voucher is not active.');
        }
        if ($voucher->starts_at && $voucher->starts_at->isFuture()) {
            $this->reject('This voucher is not available yet.');
        }
        if ($voucher->expires_at && $voucher->expires_at->isPast()) {
            $this->reject('This voucher has expired.');
        }

        $redeemedCount = $voucher->redemptions()->count();
        if ($voucher->usage_limit !== null && $redeemedCount >= $voucher->usage_limit) {
            $this->reject('This voucher has reached its usage limit.');
        }
        if ($voucher->redemptions()->where('buyer_id', $buyerId)->count() >= $voucher->per_buyer_limit) {
            $this->reject('You have already used this voucher the maximum number of times.');
        }

        $eligibleSubtotalCents = $this->eligibleSubtotal($voucher, $items);
        if ($eligibleSubtotalCents <= 0) {
            $this->reject('This voucher does not apply to the selected products.');
        }

        $minimumSpendCents = $this->toCents((string) $voucher->minimum_spend);
        if ($eligibleSubtotalCents < $minimumSpendCents) {
            $this->reject('The eligible items do not meet this voucher’s minimum spend.');
        }

        if ($voucher->discount_type === 'fixed') {
            $discountCents = $discountValueCents;
        } elseif ($voucher->discount_type === 'percentage') {
            $basisPoints = $discountValueCents;
            $discountCents = intdiv(($eligibleSubtotalCents * $basisPoints) + 5000, 10000);
            if ($voucher->maximum_discount !== null) {
                $discountCents = min($discountCents, $this->toCents((string) $voucher->maximum_discount));
            }
        } else {
            $this->reject('This voucher has an unsupported discount type.');
        }

        $discountCents = min($eligibleSubtotalCents, $discountCents);
        if ($discountCents <= 0) {
            $this->reject('This voucher does not provide a discount for this order.');
        }

        return [
            'voucher' => $voucher,
            'subtotal_cents' => collect($items)->sum(fn (array $item): int => $item[2]),
            'eligible_subtotal_cents' => $eligibleSubtotalCents,
            'discount_cents' => $discountCents,
        ];
    }

    /**
     * @param array<int, array{0: Product, 1: int, 2: int}> $items
     */
    private function eligibleSubtotal(Voucher $voucher, array $items): int
    {
        $productIds = collect($voucher->product_ids ?? [])->map(fn ($id) => (string) $id);
        $categories = collect($voucher->categories ?? [])->map(fn ($category) => mb_strtolower(trim((string) $category)));
        $hasRestrictions = $productIds->isNotEmpty() || $categories->isNotEmpty();

        return collect($items)->sum(function (array $item) use ($productIds, $categories, $hasRestrictions): int {
            [$product, , $lineSubtotalCents] = $item;
            if (!$hasRestrictions) {
                return $lineSubtotalCents;
            }

            $matchesProduct = $productIds->contains((string) $product->id);
            $matchesCategory = $categories->contains(mb_strtolower((string) $product->category));

            return ($matchesProduct || $matchesCategory) ? $lineSubtotalCents : 0;
        });
    }

    public function toCents(string $amount): int
    {
        $amount = trim($amount);
        if (!preg_match('/^\d+(?:\.\d{1,2})?$/', $amount)) {
            return 0;
        }

        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '0');
        return ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');
    }

    public function formatCents(int $amount): string
    {
        return intdiv($amount, 100).'.'.str_pad((string) ($amount % 100), 2, '0', STR_PAD_LEFT);
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['voucher_code' => [$message]]);
    }
}
