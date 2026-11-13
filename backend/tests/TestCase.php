<?php

namespace Tests;

use App\Models\Address;
use App\Models\SellerPickupAddress;
use App\Models\ShippingRate;
use App\Models\ShippingZone;
use App\Models\ShippingZoneRate;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function checkoutAddressFor(User $buyer): Address
    {
        ShippingRate::query()->firstOrCreate(
            ['region' => 'National Capital Region', 'province' => 'Metro Manila'],
            ['fee' => '0.00', 'is_active' => true]
        );

        return $buyer->addresses()->firstOrCreate(
            ['label' => 'home', 'is_default' => true],
            [
                'recipient_name' => 'Test Buyer',
                'phone' => '09171234567',
                'region' => 'National Capital Region',
                'province' => 'Metro Manila',
                'municipality' => 'Manila',
                'barangay' => 'Barangay Sample',
                'street' => 'Example Street',
                'house_number' => '123',
                'postal_code' => '1000',
            ]
        );
    }

    protected function configureTestShippingFor(
        User $seller,
        string $pickupRegion = 'National Capital Region',
        string $deliveryRegion = 'National Capital Region',
    ): void {
        $originZone = $this->shippingZoneForTestRegion($pickupRegion);
        $destinationZone = $this->shippingZoneForTestRegion($deliveryRegion);

        SellerPickupAddress::query()->updateOrCreate(
            ['user_id' => $seller->id],
            [
                'recipient_name' => 'Test Seller',
                'phone' => '09171234567',
                'region' => $pickupRegion,
                'province' => '',
                'municipality' => 'Test City',
                'barangay' => 'Test Barangay',
                'street' => 'Test Road',
                'house_number' => '1',
                'postal_code' => '1000',
            ],
        );

        ShippingZoneRate::query()
            ->where('origin_zone_id', $originZone->id)
            ->where('destination_zone_id', $destinationZone->id)
            ->update(['is_active' => false]);

        ShippingZoneRate::query()->updateOrCreate(
            [
                'origin_zone_id' => $originZone->id,
                'destination_zone_id' => $destinationZone->id,
                'provider' => 'Test Fixture',
                'min_weight_kg' => '0.000',
            ],
            [
                'rate_source' => 'cryma',
                'max_weight_kg' => '1000.000',
                'fee' => '0.00',
                'min_delivery_days' => 1,
                'max_delivery_days' => 3,
                'volumetric_divisor_cm3_per_kg' => null,
                'is_provisional' => false,
                'is_active' => true,
                'verification_note' => null,
                'verified_by' => null,
                'verified_at' => null,
            ],
        );
    }

    private function shippingZoneForTestRegion(string $region): ShippingZone
    {
        $trimmedRegion = trim($region);
        $variants = [mb_strtolower($trimmedRegion)];
        if (preg_match('/\(([^()]*)\)\s*$/u', $trimmedRegion, $matches)) {
            $variants[] = mb_strtolower(trim($matches[1]));
            $variants[] = mb_strtolower(trim(preg_replace('/\s*\([^()]*\)\s*$/u', '', $trimmedRegion)));
        }

        return ShippingZone::query()
            ->whereHas('regions', fn ($query) => $query
                ->whereRaw('LOWER(TRIM(region_name)) IN ('.implode(',', array_fill(0, count($variants), '?')).')', $variants))
            ->firstOrFail();
    }
}
