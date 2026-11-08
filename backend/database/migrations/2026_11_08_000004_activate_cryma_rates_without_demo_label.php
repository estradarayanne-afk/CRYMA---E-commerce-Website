<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $hasLegacyRates = DB::table('shipping_zone_rates')
            ->where('provider', 'CRYMA Demo')
            ->where('rate_source', 'cryma')
            ->exists();
        if (! $hasLegacyRates) {
            return;
        }

        DB::table('shipping_zone_rates')
            ->where('provider', 'CRYMA Standard')
            ->where('rate_source', 'cryma')
            ->update([
                'provider' => 'CRYMA Standard (superseded)',
                'is_active' => false,
                'updated_at' => now(),
            ]);

        DB::table('shipping_zone_rates')
            ->where('provider', 'CRYMA Demo')
            ->where('rate_source', 'cryma')
            ->update([
                'provider' => 'CRYMA Standard',
                'is_provisional' => false,
                'is_active' => true,
                'verification_note' => null,
                'verified_by' => null,
                'verified_at' => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        $hasSupersededRates = DB::table('shipping_zone_rates')
            ->where('provider', 'CRYMA Standard (superseded)')
            ->where('rate_source', 'cryma')
            ->exists();
        if (! $hasSupersededRates) {
            return;
        }

        DB::table('shipping_zone_rates')
            ->where('provider', 'CRYMA Standard')
            ->where('rate_source', 'cryma')
            ->update([
                'provider' => 'CRYMA Demo',
                'is_active' => false,
                'updated_at' => now(),
            ]);

        DB::table('shipping_zone_rates')
            ->where('provider', 'CRYMA Standard (superseded)')
            ->where('rate_source', 'cryma')
            ->update([
                'provider' => 'CRYMA Standard',
                'is_active' => true,
                'updated_at' => now(),
            ]);
    }
};
