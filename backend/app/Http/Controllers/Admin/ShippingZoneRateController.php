<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShippingZoneRate;
use Illuminate\Http\Request;

class ShippingZoneRateController extends Controller
{
    public function store(Request $request)
    {
        $values = $this->validateRate($request);
        $this->assertCanActivate($values);
        $rate = ShippingZoneRate::create($values);

        return response()->json(['success' => true, 'data' => $rate], 201);
    }

    public function update(Request $request, int $id)
    {
        $rate = ShippingZoneRate::findOrFail($id);
        $values = $this->validateRate($request);
        $this->assertCanActivate($values);
        $rate->update($values);

        return response()->json(['success' => true, 'data' => $rate->fresh()]);
    }

    public function updateStatus(Request $request, int $id)
    {
        $values = $request->validate(['is_active' => ['required', 'boolean']]);
        $rate = ShippingZoneRate::findOrFail($id);
        $this->assertCanActivate([
            'is_active' => $values['is_active'],
            'is_provisional' => $rate->is_provisional,
            'verified_at' => $rate->verified_at,
        ]);
        $rate->update($values);

        return response()->json(['success' => true, 'data' => $rate->fresh()]);
    }

    public function verify(Request $request, int $id)
    {
        $values = $request->validate([
            'verification_note' => ['required', 'string', 'min:5', 'max:500'],
        ]);
        $rate = ShippingZoneRate::findOrFail($id);
        $rate->update([
            'is_provisional' => false,
            'verification_note' => trim($values['verification_note']),
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        return response()->json(['success' => true, 'data' => $rate->fresh()]);
    }

    private function validateRate(Request $request): array
    {
        $values = $request->validate([
            'origin_zone_id' => ['required', 'integer', 'exists:shipping_zones,id'],
            'destination_zone_id' => ['required', 'integer', 'exists:shipping_zones,id'],
            'provider' => ['required', 'string', 'max:80', 'not_regex:/^\s*$/u'],
            'min_weight_kg' => ['required', 'numeric', 'min:0', 'max:100000', 'decimal:0,3'],
            'max_weight_kg' => ['required', 'numeric', 'gt:min_weight_kg', 'max:100000', 'decimal:0,3'],
            'fee' => ['required', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'volumetric_divisor_cm3_per_kg' => ['nullable', 'numeric', 'gt:0', 'max:100000000', 'decimal:0,2'],
            'is_provisional' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ]);
        if ($values['is_provisional']) {
            $values['verified_by'] = null;
            $values['verified_at'] = null;
            $values['verification_note'] = null;
        }

        return $values;
    }

    private function assertCanActivate(array $values): void
    {
        if (
            app()->environment('production')
            && ($values['is_active'] ?? false)
            && (($values['is_provisional'] ?? true) || empty($values['verified_at']))
        ) {
            abort(422, 'Only verified courier rates can be activated in production.');
        }
    }
}
