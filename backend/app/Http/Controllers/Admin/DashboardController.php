<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Order;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $totalUsers = User::count();

        $customers = User::where('role', 'buyer')->count();

        $sellers = User::where('role', 'seller')->count();

        $riders = User::where('role', 'rider')->count();

        $logistics = User::where('role', 'logistics')->count();

        $admins = User::where('role', 'admin')->count();

        $recentRegistrations = User::query()
            ->select([
                'id',
                'first_name',
                'middle_name',
                'last_name',
                'email',
                'role',
                'status',
                'created_at',
            ])
            ->latest()
            ->take(5)
            ->get();

        $monthStart = Carbon::now()->startOfMonth();
        $previousMonthStart = $monthStart->copy()->subMonth();
        $previousMonthEnd = $previousMonthStart->copy()
            ->day(min(Carbon::now()->day, $previousMonthStart->daysInMonth))
            ->endOfDay();
        $currentUsers = User::whereBetween('created_at', [$monthStart, Carbon::now()]);
        $previousUsers = User::whereBetween('created_at', [$previousMonthStart, $previousMonthEnd]);
        $currentOrders = Order::whereBetween('created_at', [$monthStart, Carbon::now()]);
        $previousOrders = Order::whereBetween('created_at', [$previousMonthStart, $previousMonthEnd]);

        return response()->json([
            'success' => true,

            'data' => [
                'total_users'          => $totalUsers,
                'customers'            => $customers,
                'sellers'              => $sellers,
                'riders'               => $riders,
                'admins'               => $admins,
                'logistics'            => $logistics,
                'total_orders'         => Order::count(),
                'total_revenue'        => Order::sum('total_amount'),
                'monthly_activity'     => [
                    'users' => ['current' => (clone $currentUsers)->count(), 'previous' => (clone $previousUsers)->count()],
                    'sellers' => [
                        'current' => (clone $currentUsers)->where('role', 'seller')->count(),
                        'previous' => (clone $previousUsers)->where('role', 'seller')->count(),
                    ],
                    'orders' => ['current' => (clone $currentOrders)->count(), 'previous' => (clone $previousOrders)->count()],
                    'revenue' => [
                        'current' => (clone $currentOrders)->sum('total_amount'),
                        'previous' => (clone $previousOrders)->sum('total_amount'),
                    ],
                ],
                'recent_registrations' => $recentRegistrations,
            ],
        ]);
    }

    public function ridersOnlineByMunicipality()
    {
        $riders = User::query()
            ->where('role', 'rider')
            ->where('is_online', 1)
            ->with(['addresses' => function ($q) {
                $q->where('is_primary', 1);
            }])
            ->get();

        // Group by municipality
        $byMunicipality = [];
        foreach ($riders as $rider) {
            $municipality = $rider->addresses->first()?->municipality ?? 'Unknown';
            if (!isset($byMunicipality[$municipality])) {
                $byMunicipality[$municipality] = 0;
            }
            $byMunicipality[$municipality]++;
        }

        // Sort by count descending
        arsort($byMunicipality);

        return response()->json([
            'success' => true,
            'data' => [
                'municipalities' => collect($byMunicipality)->map(function ($count, $municipality) {
                    return [
                        'municipality' => $municipality,
                        'online_count' => $count,
                        'status' => $count > 1 ? 'green' : ($count === 1 ? 'yellow' : 'red'),
                    ];
                })->values(),
                'last_updated' => now(),
                'total_online' => collect($byMunicipality)->sum(),
            ],
        ]);
    }
}
