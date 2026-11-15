<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CourierPresence;
use App\Models\CourierProfile;
use App\Services\CourierEligibility;
use Illuminate\Http\Request;

class CourierPresenceController extends Controller
{
    public function show(Request $request)
    {
        $profile = CourierProfile::where('user_id', $request->user()->id)->firstOrFail();
        $presence = $profile->presence;

        return response()->json(['success' => true, 'data' => [
            'is_available' => (bool) $presence?->is_available,
            'location_updated_at' => $presence?->location_updated_at,
        ]]);
    }

    public function update(Request $request, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'is_available' => ['required', 'boolean'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'accuracy_meters' => ['nullable', 'numeric', 'min:0', 'max:10000'],
        ]);
        $profile = CourierProfile::where('user_id', $request->user()->id)->firstOrFail();

        if ($values['is_available']) {
            abort_unless(
                array_key_exists('latitude', $values)
                    && array_key_exists('longitude', $values)
                    && $values['latitude'] !== null
                    && $values['longitude'] !== null,
                422,
                'A current location is required to become available.',
            );
            abort_unless($eligibility->find($profile->id), 422, 'Only eligible riders can become available for dispatch.');

            $presence = CourierPresence::updateOrCreate(
                ['courier_profile_id' => $profile->id],
                [
                    'is_available' => true,
                    'latitude' => $values['latitude'],
                    'longitude' => $values['longitude'],
                    'accuracy_meters' => $values['accuracy_meters'] ?? null,
                    'location_updated_at' => now(),
                ],
            );
        } else {
            $presence = CourierPresence::updateOrCreate(
                ['courier_profile_id' => $profile->id],
                [
                    'is_available' => false,
                    'latitude' => null,
                    'longitude' => null,
                    'accuracy_meters' => null,
                    'location_updated_at' => null,
                ],
            );
        }

        return response()->json(['success' => true, 'data' => [
            'is_available' => $presence->is_available,
            'location_updated_at' => $presence->location_updated_at,
        ]]);
    }
}
