<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\SellerPickupAddress;
use App\Models\ShippingZoneRegion;
use Illuminate\Http\Request;

class PickupAddressController extends Controller
{
    public function show(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'address' => $request->user()->sellerPickupAddress,
                'regions' => ShippingZoneRegion::query()
                    ->whereHas('zone', fn ($query) => $query->where('is_active', true))
                    ->orderBy('region_name')
                    ->pluck('region_name'),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'recipient_name' => ['required', 'string', 'max:120', 'not_regex:/^\s*$/u'],
            'phone' => ['required', 'string', 'max:13', 'regex:/^(?:09[0-9]{9}|\\+639[0-9]{9})$/'],
            'region' => [
                'required',
                'string',
                'max:160',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $mapped = ShippingZoneRegion::query()
                        ->whereRaw('LOWER(TRIM(region_name)) = ?', [mb_strtolower(trim((string) $value))])
                        ->whereHas('zone', fn ($query) => $query->where('is_active', true))
                        ->exists();
                    if (!$mapped) {
                        $fail('Choose a region assigned to an active shipping zone.');
                    }
                },
            ],
            'province' => ['required', 'string', 'max:160', 'not_regex:/^\s*$/u'],
            'municipality' => ['required', 'string', 'max:160', 'not_regex:/^\s*$/u'],
            'barangay' => ['required', 'string', 'max:160', 'not_regex:/^\s*$/u'],
            'street' => ['required', 'string', 'max:255', 'not_regex:/^\s*$/u'],
            'house_number' => ['required', 'string', 'max:80', 'not_regex:/^\s*$/u'],
            'building_name' => ['nullable', 'string', 'max:160'],
            'unit_number' => ['nullable', 'string', 'max:80'],
            'postal_code' => ['required', 'string', 'max:16', 'regex:/^\d{4}$/'],
        ]);
        $address = SellerPickupAddress::updateOrCreate(
            ['user_id' => $request->user()->id],
            collect($validated)->map(fn ($value) => is_string($value) ? trim($value) : $value)->all()
        );

        return response()->json([
            'success' => true,
            'message' => 'Pickup address saved.',
            'data' => $address,
        ]);
    }
}
