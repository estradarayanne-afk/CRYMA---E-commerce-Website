<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class LogisticsMunicipality
{
    public function scopeUsers(Builder $users, User $logisticsUser): Builder
    {
        $address = $logisticsUser->addresses()
            ->orderByDesc('is_default')
            ->latest('id')
            ->first();

        if (! $address || trim((string) $address->municipality) === '') {
            return $users->whereRaw('1 = 0');
        }

        return $users->whereHas('addresses', function (Builder $addresses) use ($address): void {
            foreach (['region', 'province', 'municipality'] as $field) {
                $addresses->whereRaw(
                    "LOWER(TRIM(COALESCE({$field}, ''))) = ?",
                    [mb_strtolower(trim((string) $address->{$field}))],
                );
            }
        });
    }
}
