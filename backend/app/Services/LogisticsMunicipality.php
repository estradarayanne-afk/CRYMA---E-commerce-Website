<?php

namespace App\Services;

use App\Models\GeographicLocation;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class LogisticsMunicipality
{
    public function pickupAddressForSeller(User $seller): ?Model
    {
        $seller->loadMissing('sellerPickupAddress');
        if ($seller->sellerPickupAddress) {
            return $seller->sellerPickupAddress;
        }

        if ($seller->relationLoaded('addresses')) {
            return $seller->addresses->sort($this->defaultAddressComparator(...))->first();
        }

        return $seller->addresses()->orderByDesc('is_default')->latest('id')->first();
    }

    public function pickupAddressForOrder(Order $order): ?Model
    {
        $order->loadMissing('items.seller.sellerPickupAddress', 'items.seller.addresses');
        $seller = $order->items->first()?->seller;

        return $seller ? $this->pickupAddressForSeller($seller) : null;
    }

    public function municipalityCode(Model $address): ?string
    {
        $psgcCode = trim((string) ($address->psgc_code ?? ''));
        if ($psgcCode !== '') {
            $location = GeographicLocation::query()->whereKey($psgcCode)->first();
            while ($location && ! in_array($location->level, ['City', 'Mun'], true)) {
                $location = $location->parent;
            }

            if ($location) {
                return (string) $location->code;
            }
        }

        $municipality = trim((string) $address->municipality);
        if ($municipality === '') {
            return null;
        }

        $regionName = trim((string) $address->region);
        $region = $regionName === '' ? null : GeographicLocation::query()
            ->where('level', 'Reg')
            ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($regionName)])
            ->first();

        $parentCode = $region?->code;
        $provinceName = trim((string) $address->province);
        if ($provinceName !== '') {
            $provinceQuery = GeographicLocation::query()
                ->where('level', 'Prov')
                ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($provinceName)]);
            if ($region) {
                $provinceQuery->where('parent_code', $region->code);
            }
            $provinceMatches = $provinceQuery->limit(2)->get();
            if ($provinceMatches->count() !== 1) {
                return null;
            }
            $parentCode = $provinceMatches->first()->code;
        }

        $municipalityQuery = GeographicLocation::query()
            ->whereIn('level', ['City', 'Mun'])
            ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($municipality)]);
        if ($parentCode !== null) {
            $municipalityQuery->where('parent_code', $parentCode);
        }
        $matches = $municipalityQuery->limit(2)->pluck('code');

        return $matches->count() === 1 ? (string) $matches->first() : null;
    }

    public function hubForAddress(Model $address): LogisticsHub
    {
        $hub = $this->resolveHubForAddress($address);
        abort_unless($hub, 422, 'No active logistics hub is configured for the seller pickup municipality.');

        return $hub;
    }

    public function resolveHubForAddress(?Model $address): ?LogisticsHub
    {
        if ($address === null) {
            return null;
        }

        $municipalityCode = $this->municipalityCode($address);

        return $municipalityCode
            ? LogisticsHub::query()
                ->where('psgc_code', $municipalityCode)
                ->where('is_active', true)
                ->first()
            : null;
    }

    public function hubForUser(User $user): ?LogisticsHub
    {
        $address = $user->addresses()
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->first();

        return $this->resolveHubForAddress($address);
    }

    private function defaultAddressComparator(Model $first, Model $second): int
    {
        return ((int) $second->is_default <=> (int) $first->is_default)
            ?: ($second->id <=> $first->id);
    }
}
