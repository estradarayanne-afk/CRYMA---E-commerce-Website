<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\PlatformPolicy;
use Illuminate\Http\Request;

class PlatformSettingsController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Announcements
    |--------------------------------------------------------------------------
    */

    public function announcements()
    {
        $announcements = Announcement::latest()->get();

        return response()->json([
            'success' => true,
            'data' => $announcements,
        ]);
    }

    public function storeAnnouncement(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'is_active' => 'boolean',
        ]);

        $announcement = Announcement::create([
            'title' => $validated['title'],
            'message' => $validated['message'],
            'is_active' => $validated['is_active'] ?? true,
            'published_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Announcement posted successfully.',
            'data' => $announcement,
        ], 201);
    }

    public function updateAnnouncement(
        Request $request,
        $id
    ) {
        $announcement = Announcement::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'is_active' => 'boolean',
        ]);

        $announcement->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Announcement updated successfully.',
            'data' => $announcement,
        ]);
    }

    public function deleteAnnouncement($id)
    {
        $announcement = Announcement::findOrFail($id);

        $announcement->delete();

        return response()->json([
            'success' => true,
            'message' => 'Announcement deleted successfully.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Platform Policies
    |--------------------------------------------------------------------------
    */

    public function policies()
    {
        $policies = PlatformPolicy::latest()->get();

        return response()->json([
            'success' => true,
            'data' => $policies,
        ]);
    }

    public function storePolicy(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'is_active' => 'boolean',
        ]);

        $policy = PlatformPolicy::create([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Platform policy created successfully.',
            'data' => $policy,
        ], 201);
    }

    public function updatePolicy(
        Request $request,
        $id
    ) {
        $policy = PlatformPolicy::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'is_active' => 'boolean',
        ]);

        $policy->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Platform policy updated successfully.',
            'data' => $policy,
        ]);
    }

    public function deletePolicy($id)
    {
        $policy = PlatformPolicy::findOrFail($id);

        $policy->delete();

        return response()->json([
            'success' => true,
            'message' => 'Platform policy deleted successfully.',
        ]);
    }
}