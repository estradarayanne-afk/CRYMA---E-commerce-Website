<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Notifications\BuyerDeliveryMilestoneNotification;
use Illuminate\Http\Request;

class BuyerNotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()->notifications()
            ->where('type', BuyerDeliveryMilestoneNotification::class)
            ->latest()
            ->limit(30)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $notifications,
                'unread_count' => $request->user()->unreadNotifications()
                    ->where('type', BuyerDeliveryMilestoneNotification::class)
                    ->count(),
            ],
        ]);
    }

    public function markRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()
            ->where('type', BuyerDeliveryMilestoneNotification::class)
            ->whereKey($id)
            ->firstOrFail();
        $notification->markAsRead();

        return response()->json(['success' => true, 'data' => ['read_at' => $notification->read_at]]);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications()
            ->where('type', BuyerDeliveryMilestoneNotification::class)
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }
}
