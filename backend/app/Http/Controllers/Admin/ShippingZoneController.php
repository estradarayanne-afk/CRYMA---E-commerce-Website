<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShippingZone;
use App\Models\ShippingZoneRegion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShippingZoneController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => ShippingZone::query()
                ->with(['regions:id,shipping_zone_id,region_name', 'outgoingRates'])
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80', 'not_regex:/^\s*$/u', 'unique:shipping_zones,name'],
            'slug' => ['required', 'alpha_dash:ascii', 'max:80', 'unique:shipping_zones,slug'],
            'is_active' => ['required', 'boolean'],
            'regions' => ['sometimes', 'array', 'max:100'],
            'regions.*' => ['required', 'string', 'max:160', 'distinct:ignore_case'],
        ]);
        $zone = DB::transaction(function () use ($validated) {
            $zone = ShippingZone::create(collect($validated)->only(['name', 'slug', 'is_active'])->all());
            $this->syncRegions($zone, $validated['regions'] ?? []);

            return $zone->load('regions');
        });

        return response()->json(['success' => true, 'data' => $zone], 201);
    }

    public function update(Request $request, int $id)
    {
        $zone = ShippingZone::findOrFail($id);
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80', 'not_regex:/^\s*$/u', 'unique:shipping_zones,name,'.$zone->id],
            'slug' => ['sometimes', 'required', 'alpha_dash:ascii', 'max:80', 'unique:shipping_zones,slug,'.$zone->id],
            'is_active' => ['sometimes', 'required', 'boolean'],
            'regions' => ['sometimes', 'array', 'max:100'],
            'regions.*' => ['required', 'string', 'max:160', 'distinct:ignore_case'],
        ]);
        DB::transaction(function () use ($zone, $validated) {
            $zone->update(collect($validated)->only(['name', 'slug', 'is_active'])->all());
            if (array_key_exists('regions', $validated)) {
                $this->syncRegions($zone, $validated['regions']);
            }
        });

        return response()->json(['success' => true, 'data' => $zone->fresh()->load('regions')]);
    }

    private function syncRegions(ShippingZone $zone, array $regions): void
    {
        $normalized = collect($regions)->map(fn (string $region) => trim($region))->filter()->values();
        $duplicates = ShippingZoneRegion::query()
            ->whereIn(DB::raw('LOWER(TRIM(region_name))'), $normalized->map(fn (string $region) => mb_strtolower($region)))
            ->where('shipping_zone_id', '!=', $zone->id)
            ->exists();
        if ($duplicates) {
            abort(422, 'A region can only belong to one shipping zone.');
        }

        $zone->regions()->delete();
        foreach ($normalized as $region) {
            $zone->regions()->create(['region_name' => $region]);
        }
    }
}
