<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;

class DashboardController extends Controller
{
    public function index()
    {
        $totalUsers = User::count();

        $customers = User::where('role', 'buyer')->count();

        $sellers = User::where('role', 'seller')->count();

        $riders = User::where('role', 'rider')->count();

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

        return response()->json([
            'success' => true,

            'data' => [
                'total_users'          => $totalUsers,
                'customers'            => $customers,
                'sellers'              => $sellers,
                'riders'               => $riders,
                'admins'               => $admins,
                'total_orders'         => 0,
                'total_revenue'        => 0,
                'recent_registrations' => $recentRegistrations,
            ],
        ]);
    }
}