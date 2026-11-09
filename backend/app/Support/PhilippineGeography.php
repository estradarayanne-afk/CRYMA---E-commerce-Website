<?php

namespace App\Support;

use App\Models\GeographicLocation;
use Illuminate\Validation\ValidationException;

class PhilippineGeography
{
    public function options(string $path): array
    {
        if ($path === 'regions') {
            return $this->children(null, ['Reg']);
        }

        if (preg_match('/\Aregions\/([0-9]{10})\/provinces\z/', $path, $matches)) {
            $this->requireLocation($matches[1], ['Reg']);

            return $this->children($matches[1], ['Prov']);
        }

        if (preg_match('/\Aregions\/([0-9]{10})\/cities-municipalities\z/', $path, $matches)) {
            $this->requireLocation($matches[1], ['Reg']);

            return $this->children($matches[1], ['City', 'Mun']);
        }

        if (preg_match('/\Aregions\/([0-9]{10})\/provinces\/([0-9]{10})\/cities-municipalities\z/', $path, $matches)) {
            $this->requireChild($matches[2], $matches[1], ['Prov']);

            return $this->children($matches[2], ['City', 'Mun']);
        }

        if (preg_match('/\Aregions\/([0-9]{10})\/provinces\/([0-9]{10})\/cities-municipalities\/([0-9]{10})\/barangays\z/', $path, $matches)) {
            $this->requireChild($matches[2], $matches[1], ['Prov']);
            $this->requireChild($matches[3], $matches[2], ['City', 'Mun']);

            return $this->barangays($matches[3]);
        }

        if (preg_match('/\Aregions\/([0-9]{10})\/cities-municipalities\/([0-9]{10})\/barangays\z/', $path, $matches)) {
            $this->requireChild($matches[2], $matches[1], ['City', 'Mun']);

            return $this->barangays($matches[2]);
        }

        throw ValidationException::withMessages(['path' => ['Select a supported Philippine geography path.']]);
    }

    public function validateAddress(array $address): string
    {
        $region = $this->findByName('Reg', null, $address['region']);
        if (! $region) {
            $this->reject('region', 'Select a region from the supported Philippine address list.');
        }

        $provinceName = trim((string) ($address['province'] ?? ''));
        if ($provinceName !== '') {
            $province = $this->findByName('Prov', $region->code, $provinceName);
            if (! $province) {
                $this->reject('province', 'Select a province within the selected region.');
            }
        } else {
            $hasProvinces = GeographicLocation::query()->where('parent_code', $region->code)->where('level', 'Prov')->exists();
            if ($hasProvinces) {
                $this->reject('province', 'Select a province within the selected region.');
            }
            $province = null;
        }

        $cityParentCode = $province?->code ?? $region->code;
        $city = GeographicLocation::query()
            ->where('parent_code', $cityParentCode)
            ->whereIn('level', ['City', 'Mun'])
            ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($address['municipality']))])
            ->first();
        if (! $city) {
            $this->reject('municipality', 'Select a city or municipality within the selected region and province.');
        }

        $barangayParents = GeographicLocation::query()
            ->where('parent_code', $city->code)
            ->where('level', 'SubMun')
            ->pluck('code')
            ->prepend($city->code);
        $barangayQuery = GeographicLocation::query()
            ->whereIn('parent_code', $barangayParents)
            ->where('level', 'Bgy');

        $requestedCode = trim((string) ($address['psgc_code'] ?? ''));
        if ($requestedCode !== '') {
            $barangay = (clone $barangayQuery)
                ->whereKey($requestedCode)
                ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($address['barangay']))])
                ->first();
        } else {
            $matches = (clone $barangayQuery)
                ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($address['barangay']))])
                ->limit(2)
                ->get();
            $barangay = $matches->count() === 1 ? $matches->first() : null;
        }

        if (! $barangay) {
            $this->reject('barangay', 'Select a barangay within the selected city or municipality.');
        }

        return (string) $barangay->code;
    }

    private function children(?string $parentCode, array $levels): array
    {
        return GeographicLocation::query()
            ->where('parent_code', $parentCode)
            ->whereIn('level', $levels)
            ->orderBy('name')
            ->get(['code', 'name'])
            ->map(fn (GeographicLocation $location): array => [
                'code' => $location->code,
                'name' => $location->name,
            ])
            ->all();
    }

    private function barangays(string $cityCode): array
    {
        $parents = GeographicLocation::query()
            ->where('parent_code', $cityCode)
            ->where('level', 'SubMun')
            ->pluck('code')
            ->prepend($cityCode);

        return GeographicLocation::query()
            ->whereIn('parent_code', $parents)
            ->where('level', 'Bgy')
            ->orderBy('name')
            ->get(['code', 'name'])
            ->map(fn (GeographicLocation $location): array => [
                'code' => $location->code,
                'name' => $location->name,
            ])
            ->all();
    }

    private function findByName(string $level, ?string $parentCode, string $name): ?GeographicLocation
    {
        return GeographicLocation::query()
            ->where('level', $level)
            ->where('parent_code', $parentCode)
            ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower(trim($name))])
            ->first();
    }

    private function requireLocation(string $code, array $levels): GeographicLocation
    {
        $location = GeographicLocation::query()->whereKey($code)->whereIn('level', $levels)->first();
        abort_unless($location, 404, 'The selected Philippine location was not found.');

        return $location;
    }

    private function requireChild(string $code, string $parentCode, array $levels): GeographicLocation
    {
        $location = GeographicLocation::query()
            ->whereKey($code)
            ->where('parent_code', $parentCode)
            ->whereIn('level', $levels)
            ->first();
        abort_unless($location, 404, 'The selected Philippine location does not belong to its parent.');

        return $location;
    }

    private function reject(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => [$message]]);
    }
}
