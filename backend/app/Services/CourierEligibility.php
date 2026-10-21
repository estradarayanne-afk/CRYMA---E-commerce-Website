<?php

namespace App\Services;

use App\Models\CourierProfile;
use Illuminate\Database\Eloquent\Builder;

class CourierEligibility
{
    public function profiles(): Builder
    {
        return CourierProfile::query()
            ->whereHas('user', fn (Builder $query) => $query
                ->where('role', 'rider')
                ->where('status', 'active')
                ->whereNotNull('email_verified_at'))
            ->whereHas('user.documents', fn (Builder $query) => $query
                ->where('document_type', 'valid_id')->where('status', 'approved'))
            ->whereHas('user.documents', fn (Builder $query) => $query
                ->where('document_type', 'or_cr')->where('status', 'approved'))
            ->whereHas('user.documents', fn (Builder $query) => $query
                ->where('document_type', 'drivers_license')->where('status', 'approved'))
            ->whereHas('vehicles');
    }

    public function profilesInArea(int $areaId): Builder
    {
        return $this->profiles()->whereHas('deliveryAreas', fn (Builder $query) => $query
            ->where('delivery_areas.id', $areaId)
            ->where('delivery_areas.is_active', true));
    }

    public function find(int $id): ?CourierProfile
    {
        return $this->profiles()->with('user:id,first_name,last_name,role,status,email_verified_at')
            ->whereKey($id)
            ->first();
    }

    public function isEligible(CourierProfile $profile): bool
    {
        return $this->profiles()->whereKey($profile->id)->exists();
    }

    public function isEligibleForArea(CourierProfile $profile, int $areaId): bool
    {
        return $this->profilesInArea($areaId)->whereKey($profile->id)->exists();
    }
}
