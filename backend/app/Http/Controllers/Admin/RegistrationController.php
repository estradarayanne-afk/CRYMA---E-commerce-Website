<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
                'logisticsProfile',
            ])
            ->where('status', 'pending')
            ->whereIn('role', ['seller', 'buyer', 'rider', 'logistics']);

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
        ->whereIn('role', ['seller', 'buyer', 'rider', 'logistics'])
        ->first();

    if (!$user) {
        return response()->json([
            'success' => false,
            'message' => 'Pending registration not found.',
        ], 404);
    }

    if (!$user->email_verified_at) {
        return response()->json(['success' => false, 'message' => 'Email verification is required before approval.'], 422);
    }
    $requiredDocuments = match ($user->role) {
        'seller' => ['valid_id', 'business_permit'],
        'rider' => ['valid_id', 'or_cr', 'drivers_license'],
        'logistics' => ['valid_id', 'business_permit'],
        default => ['valid_id'],
    };
    $approvedTypes = UserDocument::where('user_id', $user->id)
        ->where('status', 'approved')->whereIn('document_type', $requiredDocuments)
        ->pluck('document_type')->unique()->all();
    if (array_diff($requiredDocuments, $approvedTypes)) {
        return response()->json(['success' => false, 'message' => 'All required registration documents must be approved first.'], 422);
    }

    // `status` is intentionally not mass assignable on User. Set this
    // admin-authorized field explicitly so it is actually persisted.
    $user->forceFill(['status' => 'active'])->save();
    $user->refresh();

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
            ->whereIn('role', ['seller', 'buyer', 'rider', 'logistics'])
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Pending registration not found.',
            ], 404);
        }

        $user->forceFill(['status' => 'rejected'])->save();
        $user->refresh();

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
        $query = User::query()->whereIn('role', ['seller', 'buyer', 'rider', 'logistics']);

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

        if ($user->role === 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $data = $request->validate([
            'first_name'  => ['sometimes', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name'   => ['sometimes', 'string', 'max:100'],
            'email'       => ['sometimes', 'email', 'unique:users,email,' . $id],
            'phone'       => ['nullable', 'string', 'max:20'],
            'role'        => ['sometimes', 'in:buyer,seller,rider,logistics'],
        ]);

        if (($data['role'] ?? null) === 'logistics' && $user->role !== 'logistics') {
            return response()->json([
                'success' => false,
                'message' => 'Logistics access must be granted through the approved registration workflow.',
            ], 422);
        }

        $user->update($data);
        $user->refresh();

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

        if ($user->role === 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $data = $request->validate([
            'status' => ['required', 'in:active,suspended,rejected,pending'],
            'suspension_reason' => ['required_if:status,suspended', 'nullable', 'string', 'max:1000'],
        ]);

        if ($data['status'] === 'active') {
            if (!$user->email_verified_at) {
                return response()->json(['success' => false, 'message' => 'Email verification is required before activation.'], 422);
            }
            $requiredDocuments = match ($user->role) {
                'seller' => ['valid_id', 'business_permit'],
                'rider' => ['valid_id', 'or_cr', 'drivers_license'],
                'logistics' => ['valid_id', 'business_permit'],
                default => ['valid_id'],
            };
            $approvedTypes = UserDocument::where('user_id', $user->id)
                ->where('status', 'approved')->whereIn('document_type', $requiredDocuments)
                ->pluck('document_type')->unique()->all();
            if (array_diff($requiredDocuments, $approvedTypes)) {
                return response()->json(['success' => false, 'message' => 'All required registration documents must be approved first.'], 422);
            }
        }

        // Status is intentionally excluded from User's mass-assignable fields.
        // Persist it explicitly after the admin authorization and eligibility checks.
        DB::transaction(function () use ($user, $data): void {
            $user->forceFill([
                'status' => $data['status'],
                'suspension_reason' => $data['status'] === 'suspended'
                    ? trim($data['suspension_reason'])
                    : null,
            ])->save();
            if ($data['status'] !== 'active') {
                $user->tokens()->delete();
            }
        });
        $user->refresh();

        return response()->json([
            'success' => true,
            'message' => 'User status updated.',
            'data'    => $user,
        ]);
    }
}
