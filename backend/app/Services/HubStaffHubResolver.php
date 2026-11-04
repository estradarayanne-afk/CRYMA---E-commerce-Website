<?php

namespace App\Services;

use App\Models\HubStaffProfile;
use App\Models\LogisticsHub;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class HubStaffHubResolver
{
    public function resolve(User $user): LogisticsHub
    {
        abort_unless($user->role === 'hub_staff' && $user->status === 'active', 403, 'An active Hub Staff account is required.');

        $profile = HubStaffProfile::query()->where('user_id', $user->id)->first();
        abort_unless($profile, 403, 'An active Hub Staff hub assignment is required.');

        $hub = LogisticsHub::query()->find($profile->hub_id);
        abort_unless($hub && $hub->is_active, 403, 'An active Hub Staff hub assignment is required.');

        return $hub;
    }

    public function resolveForUpdate(User $user): LogisticsHub
    {
        $freshUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
        abort_unless($freshUser->role === 'hub_staff' && $freshUser->status === 'active', 403, 'An active Hub Staff account is required.');

        $profile = HubStaffProfile::query()->where('user_id', $freshUser->id)->lockForUpdate()->first();
        abort_unless($profile, 403, 'An active Hub Staff hub assignment is required.');

        $hub = LogisticsHub::query()->whereKey($profile->hub_id)->lockForUpdate()->first();
        abort_unless($hub && $hub->is_active, 403, 'An active Hub Staff hub assignment is required.');

        return $hub;
    }
}
