<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ShippingRate;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShippingRateController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => ShippingRate::query()->orderBy('region')->orderBy('province')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateRate($request);
        $rate = ShippingRate::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Shipping rate created.',
            'data' => $rate,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $rate = ShippingRate::findOrFail($id);
        $rate->update($this->validateRate($request, $rate));

        return response()->json([
            'success' => true,
            'message' => 'Shipping rate updated.',
            'data' => $rate->fresh(),
        ]);
    }

    public function updateStatus(Request $request, int $id)
    {
        $validated = $request->validate(['is_active' => ['required', 'boolean']]);
        $rate = ShippingRate::findOrFail($id);
        $rate->update(['is_active' => $validated['is_active']]);

        return response()->json([
            'success' => true,
            'message' => $rate->is_active ? 'Shipping rate enabled.' : 'Shipping rate disabled.',
            'data' => $rate,
        ]);
    }

    private function validateRate(Request $request, ?ShippingRate $rate = null): array
    {
        return $request->validate([
            'region' => ['required', 'string', 'max:120', 'not_regex:/^\s*$/u'],
            'province' => [
                'required',
                'string',
                'max:120',
                'not_regex:/^\s*$/u',
                Rule::unique('shipping_rates', 'province')
                    ->where(fn ($query) => $query->whereRaw('LOWER(region) = ?', [
                        mb_strtolower(trim((string) $request->input('region'))),
                    ]))
                    ->ignore($rate?->id),
            ],
            'fee' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:9999999999.99'],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}
