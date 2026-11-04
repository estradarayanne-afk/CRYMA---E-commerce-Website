<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\HubStaffHubResolver;

class EnsureAssignedActiveHub
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            app(HubStaffHubResolver::class)->resolve($request->user());
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            return response()->json(['success' => false, 'message' => 'An active Hub Staff account and active hub assignment are required.'], 403);
        }

        return $next($request);
    }
}
