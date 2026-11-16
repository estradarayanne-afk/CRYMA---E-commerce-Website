<?php

namespace App\Services;

use App\Models\GeographicLocation;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class LogisticsMunicipality
{
    public function scopeUsers(Builder $users, User $logisticsUser): Builder
    {
        return $this->scopeUsersAtAddress($users, $this->addressForUser($logisticsUser));
    }

    public function addressForUser(User $user): ?Model
    {
        if ($user->relationLoaded('addresses')) {
            return $user->addresses->sort($this->defaultAddressComparator(...))->first();
        }

        return $user->addresses()
            ->orderByDesc('is_default')
            ->latest('id')
            ->first();
    }

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

    public function scopeUsersAtAddress(Builder $users, ?Model $address): Builder
    {
        if (! $address || trim((string) $address->municipality) === '') {
            return $users->whereRaw('1 = 0');
        }

        $municipalityCode = $this->municipalityCode($address);
        $locationCodes = collect();
        if ($municipalityCode !== null) {
            $subMunicipalityCodes = GeographicLocation::query()
                ->where('parent_code', $municipalityCode)
                ->where('level', 'SubMun')
                ->pluck('code')
                ->prepend($municipalityCode);
            $locationCodes = GeographicLocation::query()
                ->whereIn('parent_code', $subMunicipalityCodes)
                ->where('level', 'Bgy')
                ->pluck('code')
                ->prepend($municipalityCode);
        }

        return $users->whereHas('addresses', function (Builder $addresses) use ($address, $locationCodes): void {
            $addresses->where(function (Builder $locality) use ($address): void {
                foreach (['region', 'province', 'municipality'] as $field) {
                    $locality->whereRaw(
                        "LOWER(TRIM(COALESCE({$field}, ''))) = ?",
                        [mb_strtolower(trim((string) $address->{$field}))],
                    );
                }
            });
            if ($locationCodes->isNotEmpty()) {
                $addresses->orWhereIn('psgc_code', $locationCodes);
            }
        });
    }

    public function sameMunicipality(?Model $first, ?Model $second): bool
    {
        if (! $first || ! $second) {
            return false;
        }

        $firstCode = $this->municipalityCode($first);
        $secondCode = $this->municipalityCode($second);
        if ($firstCode !== null && $secondCode !== null) {
            return $firstCode === $secondCode;
        }

        foreach (['region', 'province', 'municipality'] as $field) {
            if (mb_strtolower(trim((string) $first->{$field})) !== mb_strtolower(trim((string) $second->{$field}))) {
                return false;
            }
        }

        return trim((string) $first->municipality) !== '';
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
        $municipalityCode = $this->municipalityCode($address);
        abort_unless($municipalityCode, 422, 'The seller pickup municipality could not be matched to a logistics hub.');

        $hub = LogisticsHub::query()
            ->where('psgc_code', $municipalityCode)
            ->where('is_active', true)
            ->first();
        abort_unless($hub, 422, 'No active logistics hub is configured for the seller pickup municipality.');

        return $hub;
    }

    private function defaultAddressComparator(Model $first, Model $second): int
    {
        return ((int) $second->is_default <=> (int) $first->is_default)
            ?: ($second->id <=> $first->id);
    }
}
