<?php

namespace Database\Seeders;

use App\Models\ShippingZone;
use App\Models\ShippingZoneRate;
use Illuminate\Database\Seeder;
use RuntimeException;

class ShippingZoneDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'development', 'testing'])) {
            throw new RuntimeException('Provisional shipping rates may only be seeded in local, development, or testing environments.');
        }

        $zones = ShippingZone::query()->pluck('id', 'slug');
        $routePrices = [
            ['luzon', 'luzon', ['80.00', '110.00', '150.00']],
            ['visayas', 'visayas', ['80.00', '110.00', '150.00']],
            ['mindanao', 'mindanao', ['80.00', '110.00', '150.00']],
            ['luzon', 'visayas', ['150.00', '220.00', '300.00']],
            ['visayas', 'luzon', ['150.00', '220.00', '300.00']],
            ['luzon', 'mindanao', ['180.00', '250.00', '350.00']],
            ['mindanao', 'luzon', ['180.00', '250.00', '350.00']],
            ['visayas', 'mindanao', ['150.00', '220.00', '300.00']],
            ['mindanao', 'visayas', ['150.00', '220.00', '300.00']],
        ];
        $brackets = [
            ['min' => '0.000', 'max' => '1.000'],
            ['min' => '1.010', 'max' => '3.000'],
            ['min' => '3.010', 'max' => '5.000'],
        ];

        foreach ($routePrices as [$origin, $destination, $fees]) {
            foreach ($brackets as $index => $bracket) {
                ShippingZoneRate::query()->updateOrCreate(
                    [
                        'origin_zone_id' => $zones[$origin],
                        'destination_zone_id' => $zones[$destination],
                        'provider' => 'CRYMA Demo',
                        'min_weight_kg' => $bracket['min'],
                    ],
                    [
                        'max_weight_kg' => $bracket['max'],
                        'fee' => $fees[$index],
                        'volumetric_divisor_cm3_per_kg' => null,
                        'is_provisional' => true,
                        'is_active' => true,
                        'verified_by' => null,
                        'verified_at' => null,
                    ]
                );
            }
        }
    }
}
