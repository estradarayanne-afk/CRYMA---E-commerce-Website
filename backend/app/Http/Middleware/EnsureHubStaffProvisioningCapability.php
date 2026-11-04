<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHubStaffProvisioningCapability
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $profile = $user?->logisticsProfile;

        if (!$user || $user->role !== 'logistics' || !$profile?->can_manage_hub_staff) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        return $next($request);
    }
}
