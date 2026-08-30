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

    /**
     * Get all users (for admin user management).
     */
    public function users(Request $request)
    {
        $query = User::query()->whereIn('role', ['seller', 'buyer', 'rider']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest()->paginate(15),
        ]);
    }

    /**
     * Update a user's details.
     */
    public function updateUser(Request $request, int $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'first_name'  => ['sometimes', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name'   => ['sometimes', 'string', 'max:100'],
            'email'       => ['sometimes', 'email', 'unique:users,email,' . $id],
            'phone'       => ['nullable', 'string', 'max:20'],
            'role'        => ['sometimes', 'in:buyer,seller,rider'],
        ]);

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data'    => $user,
        ]);
    }

    /**
     * Update a user's status (active / suspended / rejected).
     */
    public function updateStatus(Request $request, int $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'status' => ['required', 'in:active,suspended,rejected,pending'],
        ]);

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'User status updated.',
            'data'    => $user,
        ]);
    }
}