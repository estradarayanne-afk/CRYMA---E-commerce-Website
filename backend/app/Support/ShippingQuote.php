<?php

namespace App\Support;

use App\Models\Address;
use App\Models\Product;
use App\Models\ShippingZone;
use App\Models\ShippingZoneRate;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class ShippingQuote
{
    /**
     * @param array<int, array{product: Product, quantity: int}> $items
     * @return array{shipping_fee: string, is_provisional: bool, parcels: array<int, array<string, mixed>>}
     */
    public function quote(Address $deliveryAddress, array $items, bool $lockRates = false): array
    {
        if ($items === []) {
            $this->reject('items', 'Select at least one product to calculate shipping.');
        }

        $destinationZone = $this->zoneForRegion($deliveryAddress->region);
        if (!$destinationZone || !$destinationZone->is_active) {
            $this->reject('address_id', 'Shipping is not available for this delivery region yet.');
        }

        $sellerItems = [];
        foreach ($items as $item) {
            $product = $item['product'];
            $quantity = (int) $item['quantity'];
            if ($quantity < 1 || !$product->weight_kg || (float) $product->weight_kg <= 0) {
                $this->reject('items', 'Every selected product needs a valid shipping weight before checkout.');
            }
            $sellerItems[$product->seller_id][] = [$product, $quantity];
        }

        $parcels = [];
        $totalCents = 0;
        $anyProvisional = false;
        foreach ($sellerItems as $sellerId => $sellerParcelItems) {
            $seller = User::query()
                ->with(['sellerPickupAddress'])
                ->find($sellerId);
            $pickupAddress = $seller?->sellerPickupAddress;
            if (!$pickupAddress) {
                $this->reject('items', 'A seller must set a pickup address before their products can be shipped.');
            }

            $originZone = $this->zoneForRegion($pickupAddress->region);
            if (!$originZone || !$originZone->is_active) {
                $this->reject('items', 'A seller pickup region is not assigned to an active shipping zone yet.');
            }

            $ratesQuery = ShippingZoneRate::query()
                ->where('origin_zone_id', $originZone->id)
                ->where('destination_zone_id', $destinationZone->id)
                ->where('is_active', true)
                ->orderBy('provider')
                ->orderBy('min_weight_kg');
            $this->applyEnvironmentGuard($ratesQuery);
            if ($lockRates) {
                $ratesQuery->lockForUpdate();
            }
            $routeRates = $ratesQuery->get();
            if ($routeRates->isEmpty()) {
                $this->reject('address_id', 'A verified shipping rate is not available for one or more seller routes.');
            }

            $actualWeight = 0.0;
            $volumeCm3 = 0.0;
            $hasDimensions = true;
            foreach ($sellerParcelItems as [$product, $quantity]) {
                $actualWeight += (float) $product->weight_kg * $quantity;
                if (!$product->length_cm || !$product->width_cm || !$product->height_cm) {
                    $hasDimensions = false;
                    continue;
                }
                $volumeCm3 += (float) $product->length_cm
                    * (float) $product->width_cm
                    * (float) $product->height_cm
                    * $quantity;
            }

            $divisor = $routeRates->first(fn (ShippingZoneRate $rate) => $rate->volumetric_divisor_cm3_per_kg !== null)
                ? (float) $routeRates->first(fn (ShippingZoneRate $rate) => $rate->volumetric_divisor_cm3_per_kg !== null)->volumetric_divisor_cm3_per_kg
                : null;
            if ($divisor !== null && !$hasDimensions) {
                $this->reject('items', 'Add dimensions to every product in this parcel to calculate volumetric shipping.');
            }
            $volumetricWeight = $divisor !== null ? $volumeCm3 / $divisor : null;
            $billableWeight = $this->roundUpToHundredth(max($actualWeight, $volumetricWeight ?? 0));
            $rate = $routeRates->first(
                fn (ShippingZoneRate $candidate) =>
                    (float) $candidate->min_weight_kg <= $billableWeight
                    && (float) $candidate->max_weight_kg >= $billableWeight
            );
            if (!$rate) {
                $this->reject('address_id', 'No active shipping rate covers a seller parcel’s billable weight.');
            }

            $feeCents = app(VoucherDiscount::class)->toCents((string) $rate->fee);
            $totalCents += $feeCents;
            $anyProvisional = $anyProvisional || $rate->is_provisional;
            $parcels[] = [
                'seller_id' => (int) $sellerId,
                'seller_name' => $seller->sellerProfile?->business_name ?: 'Seller',
                'origin_zone' => $originZone->name,
                'destination_zone' => $destinationZone->name,
                'provider' => $rate->provider,
                'actual_weight_kg' => number_format($actualWeight, 3, '.', ''),
                'volumetric_weight_kg' => $volumetricWeight === null
                    ? null
                    : number_format($volumetricWeight, 3, '.', ''),
                'billable_weight_kg' => number_format($billableWeight, 3, '.', ''),
                'shipping_fee' => $this->formatCents($feeCents),
                'is_provisional' => $rate->is_provisional,
                'rate_id' => $rate->id,
            ];
        }

        return [
            'shipping_fee' => $this->formatCents($totalCents),
            'is_provisional' => $anyProvisional,
            'parcels' => $parcels,
        ];
    }

    private function zoneForRegion(string $region): ?ShippingZone
    {
        return ShippingZone::query()
            ->whereHas('regions', fn (Builder $query) => $query
                ->whereRaw('LOWER(TRIM(region_name)) = ?', [mb_strtolower(trim($region))])
            )
            ->first();
    }

    private function applyEnvironmentGuard(Builder $query): void
    {
        if (app()->environment('production')) {
            $query->where('is_provisional', false)->whereNotNull('verified_at');
        }
    }

    private function roundUpToHundredth(float $weight): float
    {
        return ceil(($weight * 100) - 0.0000001) / 100;
    }

    private function formatCents(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }

    private function reject(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => [$message]]);
    }
}
