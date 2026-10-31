<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user && $user->role === 'seller', 403, 'Only sellers can view these notifications.');

        $notifications = $user->notifications()->latest()->limit(30)->get();

        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $notifications,
                'unread_count' => $user->unreadNotifications()->count(),
            ],
        ]);
    }

    public function markRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->whereKey($id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['success' => true, 'data' => ['read_at' => $notification->read_at]]);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }
}
