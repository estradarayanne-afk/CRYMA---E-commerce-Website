<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\Order;

class DashboardController extends Controller
{
    public function index()
    {
        $counts = [
            'pickups_awaiting_assignment' => Order::where('status', 'READY_FOR_PICKUP')
                ->whereDoesntHave('pickupAssignment')
                ->where(fn ($query) => $query->whereDoesntHave('delivery')
                    ->orWhereHas('delivery', fn ($delivery) => $delivery
                        ->where('legacy_imported', true)
                        ->where('status', 'READY_FOR_PICKUP')))
                ->count(),
            'incoming_parcels' => Delivery::where('status', Delivery::PICKED_UP)->count(),
            'parcels_awaiting_sorting' => Delivery::where('status', Delivery::AT_SORTING_CENTER)->count(),
            'parcels_ready_for_dispatch' => Delivery::where('status', Delivery::SORTED)->count(),
            'deliveries_in_progress' => Delivery::where('status', Delivery::OUT_FOR_DELIVERY)->count(),
            'completed_deliveries' => Delivery::whereIn('status', [Delivery::DELIVERED, Delivery::COMPLETED])->count(),
            'failed_deliveries' => Delivery::where('status', Delivery::FAILED)->count(),
        ];

        return response()->json(['success' => true, 'data' => $counts]);
    }
}
