<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $zones = DB::table('shipping_zones')->pluck('id', 'slug');
        $routes = [
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

        foreach ($routes as [$origin, $destination, $fees]) {
            foreach ($brackets as $index => $bracket) {
                DB::table('shipping_zone_rates')->updateOrInsert(
                    [
                        'origin_zone_id' => $zones[$origin],
                        'destination_zone_id' => $zones[$destination],
                        'provider' => 'CRYMA Standard (superseded)',
                        'min_weight_kg' => $bracket['min'],
                    ],
                    [
                        'rate_source' => 'cryma',
                        'max_weight_kg' => $bracket['max'],
                        'fee' => $fees[$index],
                        'volumetric_divisor_cm3_per_kg' => null,
                        'is_provisional' => false,
                        'is_active' => false,
                        'verification_note' => null,
                        'verified_by' => null,
                        'verified_at' => null,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ],
                );
            }
        }

        DB::table('shipping_zone_rates')->updateOrInsert(
            [
                'origin_zone_id' => $zones['luzon'],
                'destination_zone_id' => $zones['luzon'],
                'provider' => 'CRYMA',
                'min_weight_kg' => '0.000',
            ],
            [
                'rate_source' => 'courier',
                'max_weight_kg' => '1.000',
                'fee' => '80.00',
                'volumetric_divisor_cm3_per_kg' => null,
                'is_provisional' => false,
                'is_active' => false,
                'verification_note' => null,
                'verified_by' => null,
                'verified_at' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );
    }

    public function down(): void
    {
        // These canonical rows may predate this migration, so rollback must not delete them.
    }
};
