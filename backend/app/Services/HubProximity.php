<?php

namespace App\Services;

use App\Models\CourierProfile;
use Illuminate\Support\Collection;

class HubProximity
{
    public const LOCATION_FRESHNESS_MINUTES = 5;

    public function forCourier(CourierProfile $courier, Collection $hubs): array
    {
        $presence = $courier->presence;
        $hasFreshLocation = $presence?->is_available
            && $presence->latitude !== null
            && $presence->longitude !== null
            && $presence->location_updated_at?->greaterThanOrEqualTo(now()->subMinutes(self::LOCATION_FRESHNESS_MINUTES));

        $proximity = [];
        foreach ($hubs as $hub) {
            $result = [
                'state' => 'offline',
                'nearby' => false,
                'distance_km' => null,
                'radius_km' => $hub->proximity_radius_km,
            ];

            if ($hub->latitude === null || $hub->longitude === null) {
                $result['state'] = 'hub_unpinned';
            } elseif ($presence?->is_available && !$hasFreshLocation) {
                $result['state'] = 'stale';
            } elseif ($hasFreshLocation) {
                $distance = $this->distanceInKilometers(
                    (float) $presence->latitude,
                    (float) $presence->longitude,
                    (float) $hub->latitude,
                    (float) $hub->longitude,
                );
                $nearby = $distance <= (float) $hub->proximity_radius_km;
                $result['state'] = $nearby ? 'nearby' : 'far';
                $result['nearby'] = $nearby;
                $result['distance_km'] = round($distance, 2);
            }

            $proximity[(string) $hub->id] = $result;
        }

        return $proximity;
    }

    private function distanceInKilometers(float $latitudeA, float $longitudeA, float $latitudeB, float $longitudeB): float
    {
        $latitudeDelta = deg2rad($latitudeB - $latitudeA);
        $longitudeDelta = deg2rad($longitudeB - $longitudeA);
        $a = sin($latitudeDelta / 2) ** 2
            + cos(deg2rad($latitudeA)) * cos(deg2rad($latitudeB)) * sin($longitudeDelta / 2) ** 2;
        $a = min(1, max(0, $a));

        return 6371.0088 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
