<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;

class DashboardController extends Controller
{
    public function index()
    {
        $totalUsers = User::count();

        $customers = User::where('role', 'customer')->count();

        $sellers = User::where('role', 'seller')->count();

        $riders = User::where('role', 'rider')->count();

        $admins = User::where('role', 'admin')->count();

        return response()->json([
            'success' => true,

            'data' => [
                'total_users' => $totalUsers,
                'customers' => $customers,
                'sellers' => $sellers,
                'riders' => $riders,
                'admins' => $admins,
            ],
        ]);
    }
}