<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryLocation;
use App\Services\CourierEligibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Accepts GPS location updates from the mobile courier app for active
 * deliveries and makes them available to the buyer's tracking view.
 */
class LocationController extends Controller
{
    /** Active delivery statuses that allow location recording. */
    private const ACTIVE_STATUSES = [
        Delivery::ASSIGNED,
        Delivery::OUT_FOR_DELIVERY,
    ];

    public function store(Request $request, int $id, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'latitude'       => ['required', 'numeric', 'between:-90,90'],
            'longitude'      => ['required', 'numeric', 'between:-180,180'],
            'accuracy_meters'=> ['nullable', 'numeric', 'min:0', 'max:10000'],
            'captured_at'    => ['nullable', 'date'],
        ]);

        $user = $request->user();
        abort_unless(
            $user->role === 'rider' && $user->status === 'active' && $user->email_verified_at,
            403, 'Courier account is not eligible to operate.'
        );
        $profile = $user->courierProfile;
        abort_unless($profile && $eligibility->isEligible($profile), 403, 'Courier account is not approved.');

        $delivery = Delivery::where('courier_profile_id', $profile->id)
            ->whereIn('status', self::ACTIVE_STATUSES)
            ->findOrFail($id);

        $capturedAt = isset($values['captured_at'])
            ? \Carbon\Carbon::parse($values['captured_at'])
            : now();

        DB::transaction(function () use ($delivery, $profile, $values, $capturedAt): void {
            DeliveryLocation::create([
                'delivery_id'       => $delivery->id,
                'courier_profile_id'=> $profile->id,
                'latitude'          => $values['latitude'],
                'longitude'         => $values['longitude'],
                'accuracy_meters'   => $values['accuracy_meters'] ?? null,
                'captured_at'       => $capturedAt,
                'created_at'        => now(),
            ]);

            // Update cache columns on deliveries for fast buyer lookup.
            $delivery->update([
                'last_lat'         => $values['latitude'],
                'last_lng'         => $values['longitude'],
                'last_location_at' => $capturedAt,
            ]);
        });

        return response()->json(['success' => true, 'message' => 'Location recorded.']);
    }
}
