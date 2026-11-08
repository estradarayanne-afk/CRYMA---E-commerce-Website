<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_zone_rates', function (Blueprint $table) {
            $table->string('rate_source', 16)->default('courier')->after('provider');
        });

        DB::table('shipping_zone_rates')
            ->where('provider', 'CRYMA Demo')
            ->update([
                'rate_source' => 'cryma',
                'is_provisional' => false,
                'is_active' => false,
            ]);

        $zones = DB::table('shipping_zones')->pluck('id', 'slug');
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
                DB::table('shipping_zone_rates')->updateOrInsert(
                    [
                        'origin_zone_id' => $zones[$origin],
                        'destination_zone_id' => $zones[$destination],
                        'provider' => 'CRYMA Standard',
                        'min_weight_kg' => $bracket['min'],
                    ],
                    [
                        'rate_source' => 'cryma',
                        'max_weight_kg' => $bracket['max'],
                        'fee' => $fees[$index],
                        'volumetric_divisor_cm3_per_kg' => null,
                        'is_provisional' => false,
                        'is_active' => true,
                        'verification_note' => null,
                        'verified_by' => null,
                        'verified_at' => null,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ],
                );
            }
        }
    }

    public function down(): void
    {
        DB::table('shipping_zone_rates')
            ->where('rate_source', 'cryma')
            ->update(['is_active' => false]);

        Schema::table('shipping_zone_rates', function (Blueprint $table) {
            $table->dropColumn('rate_source');
        });
    }
};
