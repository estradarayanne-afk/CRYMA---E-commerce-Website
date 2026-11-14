<?php

namespace App\Services;

use App\Models\DeliveryArea;
use App\Models\GeographicLocation;

class DeliveryAreaResolver
{
    /**
     * Resolve barangay PSGC codes to their uniquely configured delivery area.
     *
     * @param iterable<string|null> $barangayCodes
     * @return array<string, array{status: string, area: ?DeliveryArea}>
     */
    public function resolveMany(iterable $barangayCodes): array
    {
        $codes = collect($barangayCodes)
            ->filter(fn ($code) => is_string($code) && $code !== '')
            ->unique()
            ->values();

        if ($codes->isEmpty()) {
            return [];
        }

        $barangays = GeographicLocation::query()
            ->whereIn('code', $codes)
            ->where('level', 'Bgy')
            ->get(['code', 'parent_code'])
            ->keyBy('code');

        $parentLocations = GeographicLocation::query()
            ->whereIn('code', $barangays->pluck('parent_code')->unique())
            ->get(['code', 'level', 'parent_code'])
            ->keyBy('code');

        $subMunicipalities = $parentLocations->where('level', 'SubMun');
        $municipalities = GeographicLocation::query()
            ->whereIn('code', $subMunicipalities->pluck('parent_code')->unique())
            ->whereIn('level', ['City', 'Mun'])
            ->get(['code', 'level'])
            ->keyBy('code');

        $municipalityByBarangay = [];
        foreach ($barangays as $code => $barangay) {
            $parent = $parentLocations->get($barangay->parent_code);
            $municipality = $parent?->level === 'SubMun'
                ? $municipalities->get($parent->parent_code)
                : ($parent && in_array($parent->level, ['City', 'Mun'], true) ? $parent : null);
            if ($municipality) {
                $municipalityByBarangay[$code] = $municipality->code;
            }
        }

        $areasByMunicipality = DeliveryArea::query()
            ->with('hub')
            ->whereIn('psgc_code', array_values(array_unique($municipalityByBarangay)))
            ->get()
            ->groupBy('psgc_code');

        $result = [];
        foreach ($codes as $code) {
            $municipalityCode = $municipalityByBarangay[$code] ?? null;
            $areas = $municipalityCode ? $areasByMunicipality->get($municipalityCode, collect()) : collect();
            if ($areas->count() !== 1) {
                $result[$code] = [
                    'status' => $areas->count() > 1 ? 'ambiguous_mapping' : 'unmapped',
                    'area' => null,
                ];
                continue;
            }

            /** @var DeliveryArea $area */
            $area = $areas->first();
            if (!$area->is_active || !$area->hub || !$area->hub->is_active) {
                $result[$code] = ['status' => 'inactive_mapping', 'area' => $area];
                continue;
            }

            $result[$code] = ['status' => 'mapped', 'area' => $area];
        }

        return $result;
    }

    /**
     * @return array{status: string, area: ?DeliveryArea}
     */
    public function resolve(?string $barangayCode): array
    {
        if (!is_string($barangayCode) || $barangayCode === '') {
            return ['status' => 'missing_address_code', 'area' => null];
        }

        return $this->resolveMany([$barangayCode])[$barangayCode]
            ?? ['status' => 'invalid_address_code', 'area' => null];
    }
}
