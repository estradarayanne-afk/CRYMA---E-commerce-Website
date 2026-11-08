<?php

namespace Tests;

use App\Models\Address;
use App\Models\ShippingRate;
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
}
