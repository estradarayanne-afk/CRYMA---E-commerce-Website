<?php

namespace App\Support;

use App\Models\Address;
use App\Models\ShippingRate;
use Illuminate\Validation\ValidationException;

class ShippingQuote
{
    public function forAddress(Address $address): ShippingRate
    {
        $rate = ShippingRate::query()
            ->where('is_active', true)
            ->whereRaw('LOWER(region) = ?', [mb_strtolower(trim($address->region))])
            ->whereRaw('LOWER(province) = ?', [mb_strtolower(trim($address->province))])
            ->first();

        if (!$rate) {
            throw ValidationException::withMessages([
                'address_id' => ['Shipping is not configured for this destination yet. Please contact CRYMA support or choose another address.'],
            ]);
        }

        return $rate;
    }

    public function availableForAddress(Address $address): ?ShippingRate
    {
        return ShippingRate::query()
            ->where('is_active', true)
            ->whereRaw('LOWER(region) = ?', [mb_strtolower(trim($address->region))])
            ->whereRaw('LOWER(province) = ?', [mb_strtolower(trim($address->province))])
            ->first();
    }
}
