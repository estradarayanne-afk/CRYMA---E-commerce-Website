<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\PushToken;
use Illuminate\Http\Request;

/**
 * Courier notification list and push-token registration.
 * Reuses the existing `notifications` table (Laravel's standard morphable table).
 */
class NotificationController extends Controller
{
    /** List the courier's unread and recent notifications. */
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($n) => [
                'id'         => $n->id,
                'type'       => class_basename($n->type),
                'data'       => $n->data,
                'read_at'    => $n->read_at,
                'created_at' => $n->created_at,
            ]);

        return response()->json(['success' => true, 'data' => $notifications]);
    }

    /** Mark a single notification as read. */
    public function markRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();
        return response()->json(['success' => true, 'message' => 'Marked as read.']);
    }

    /** Mark all notifications as read. */
    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);
        return response()->json(['success' => true, 'message' => 'All notifications marked as read.']);
    }

    /** Register or update a device push token. */
    public function registerToken(Request $request)
    {
        $values = $request->validate([
            'token'    => ['required', 'string', 'max:512'],
            'platform' => ['required', 'in:android,ios'],
        ]);

        // Upsert: one token row per device token string (prevents duplicates).
        PushToken::updateOrCreate(
            ['token' => $values['token']],
            [
                'user_id'  => $request->user()->id,
                'platform' => $values['platform'],
            ]
        );

        return response()->json(['success' => true, 'message' => 'Push token registered.']);
    }

    /** Remove push token on logout so stale tokens don't waste notifications. */
    public function removeToken(Request $request)
    {
        $values = $request->validate(['token' => ['required', 'string', 'max:512']]);
        PushToken::where('token', $values['token'])
            ->where('user_id', $request->user()->id)
            ->delete();
        return response()->json(['success' => true, 'message' => 'Push token removed.']);
    }
}
