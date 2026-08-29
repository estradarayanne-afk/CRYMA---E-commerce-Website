<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class RegistrationController extends Controller
{
    /**
     * Get pending account registrations.
     */
    public function index(Request $request)
    {
        $query = User::query()
            ->with([
                'addresses',
                'documents',
                'buyerProfile',
                'sellerProfile',
                'courierProfile.vehicles',
            ])
            ->with('documents')
            ->where('status', 'pending')
            ->whereIn('role', ['seller', 'buyer', 'rider']);

        // Search
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filter by role
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        $registrations = $query
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $registrations,
        ]);
    }

    /**
 * Approve a pending registration.
 */
public function approve(int $id)
{
    $user = User::where('id', $id)
        ->where('status', 'pending')
        ->whereIn('role', ['seller', 'buyer', 'rider'])
        ->first();

    if (!$user) {
        return response()->json([
            'success' => false,
            'message' => 'Pending registration not found.',
        ], 404);
    }

    $user->update([
        'status' => 'active',
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Registration approved successfully.',
        'data' => $user,
    ]);
}


    /**
     * Reject a pending registration.
     */
    public function reject(int $id)
    {
        $user = User::where('id', $id)
            ->where('status', 'pending')
            ->whereIn('role', ['seller', 'buyer', 'rider'])
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Pending registration not found.',
            ], 404);
        }

        $user->update([
            'status' => 'rejected',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Registration rejected successfully.',
            'data' => $user,
        ]);
    }
}