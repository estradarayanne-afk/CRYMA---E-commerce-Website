<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('logistics_hubs', function (Blueprint $table): void {
            if (! Schema::hasColumn('logistics_hubs', 'psgc_code')) {
                $table->char('psgc_code', 10)->nullable()->unique();
                $table->foreign('psgc_code')->references('code')->on('geographic_locations')->nullOnDelete();
            }
            if (! Schema::hasColumn('logistics_hubs', 'location_label')) {
                $table->string('location_label', 255)->nullable();
            }
        });

        Schema::table('delivery_areas', function (Blueprint $table): void {
            if (! Schema::hasColumn('delivery_areas', 'psgc_code')) {
                $table->char('psgc_code', 10)->nullable()->unique();
                $table->foreign('psgc_code')->references('code')->on('geographic_locations')->nullOnDelete();
            }
            if (! Schema::hasColumn('delivery_areas', 'location_label')) {
                $table->string('location_label', 255)->nullable();
            }
        });

        $locations = DB::table('geographic_locations')
            ->whereIn('level', ['Reg', 'Prov', 'City', 'Mun'])
            ->get(['code', 'name', 'level', 'parent_code'])
            ->keyBy('code');
        $lgus = $locations->whereIn('level', ['City', 'Mun'])->values();
        if ($lgus->isEmpty()) {
            throw new RuntimeException('The Philippine geographic directory has no city or municipality records.');
        }

        $now = now();
        $hubRows = [];
        $areaRows = [];

        foreach ($lgus as $location) {
            $parent = $locations->get($location->parent_code);
            if (! $parent || ! in_array($parent->level, ['Prov', 'Reg'], true)) {
                throw new RuntimeException("The PSGC parent for {$location->code} is invalid.");
            }

            $region = $parent->level === 'Reg' ? $parent : $locations->get($parent->parent_code);
            if (! $region || $region->level !== 'Reg') {
                throw new RuntimeException("The PSGC region for {$location->code} is invalid.");
            }

            $locationLabel = $parent->level === 'Prov'
                ? "{$location->name}, {$parent->name}, {$region->name}"
                : "{$location->name}, {$region->name}";
            $codeSuffix = substr($location->code, -4);
            $hubName = mb_substr("{$location->name} · {$codeSuffix} Hub", 0, 100);
            $areaName = mb_substr($location->name, 0, 85)." [{$location->code}]";

            $hubRows[] = [
                'name' => $hubName,
                'code' => "LGU-{$location->code}",
                'address' => null,
                'is_active' => true,
                'psgc_code' => $location->code,
                'location_label' => $locationLabel,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $areaRows[] = [
                'name' => $areaName,
                'is_active' => true,
                'psgc_code' => $location->code,
                'location_label' => $locationLabel,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($hubRows, 200) as $chunk) {
            DB::table('logistics_hubs')->insertOrIgnore($chunk);
        }

        $hubIdsByPsgc = DB::table('logistics_hubs')
            ->whereIn('psgc_code', $lgus->pluck('code'))
            ->pluck('id', 'psgc_code');
        if ($hubIdsByPsgc->count() !== $lgus->count()) {
            throw new RuntimeException('Not all PSGC locations could be mapped to an LGU hub.');
        }

        foreach ($areaRows as &$area) {
            $area['hub_id'] = $hubIdsByPsgc->get($area['psgc_code']);
        }
        unset($area);

        foreach (array_chunk($areaRows, 200) as $chunk) {
            DB::table('delivery_areas')->insertOrIgnore($chunk);
        }
    }

    public function down(): void
    {
        $lguHubIds = DB::table('logistics_hubs')->whereNotNull('psgc_code')->pluck('id');
        $lguAreaIds = DB::table('delivery_areas')->whereNotNull('psgc_code')->pluck('id');

        if (DB::table('deliveries')->whereIn('current_hub_id', $lguHubIds)->exists()
            || DB::table('hub_transfers')->whereIn('from_hub_id', $lguHubIds)->orWhereIn('to_hub_id', $lguHubIds)->exists()
            || DB::table('hub_staff_profiles')->whereIn('hub_id', $lguHubIds)->exists()
            || DB::table('deliveries')->whereIn('delivery_area_id', $lguAreaIds)->exists()
            || DB::table('courier_delivery_areas')->whereIn('delivery_area_id', $lguAreaIds)->exists()) {
            throw new RuntimeException('LGU hubs are in operational use and cannot be removed by rolling back this migration.');
        }

        DB::table('delivery_areas')->whereNotNull('psgc_code')->delete();
        DB::table('logistics_hubs')->whereNotNull('psgc_code')->delete();

        Schema::table('delivery_areas', function (Blueprint $table): void {
            $table->dropForeign(['psgc_code']);
            $table->dropUnique(['psgc_code']);
            $table->dropColumn(['psgc_code', 'location_label']);
        });
        Schema::table('logistics_hubs', function (Blueprint $table): void {
            $table->dropForeign(['psgc_code']);
            $table->dropUnique(['psgc_code']);
            $table->dropColumn(['psgc_code', 'location_label']);
        });
    }
};
