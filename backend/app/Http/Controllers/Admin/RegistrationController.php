<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\AccountEmailReleaseController;
use App\Mail\AccountReactivationMail;
use App\Mail\AccountSuspensionMail;
use App\Models\User;
use App\Models\UserDocument;
use App\Support\CourierNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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
    $result = DB::transaction(function () use ($id): array {
        $user = User::query()->lockForUpdate()->whereKey($id)
            ->where('status', 'pending')
            ->whereIn('role', ['seller', 'buyer', 'rider', 'logistics'])
            ->first();

        if (!$user) {
            return ['error' => ['success' => false, 'message' => 'Pending registration not found.'], 'status' => 404];
        }

        if ($user->account_archived_at !== null) {
            return ['error' => ['success' => false, 'message' => 'Archived accounts cannot be activated.'], 'status' => 409];
        }
        if (!$user->email_verified_at) {
            return ['error' => ['success' => false, 'message' => 'Email verification is required before approval.'], 'status' => 422];
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
            return ['error' => ['success' => false, 'message' => 'All required registration documents must be approved first.'], 'status' => 422];
        }

        // `status` is intentionally not mass assignable on User.
        $user->forceFill(['status' => 'active'])->save();

        return ['user' => $user->refresh()];
    });

    if (isset($result['error'])) {
        return response()->json($result['error'], $result['status']);
    }

    $user = $result['user'];

        // Notify the courier that their account has been approved.
        if ($user->role === 'rider') {
            CourierNotifier::notify(
                $user,
                'Courier account approved',
                'Your Courier application has been approved. You can now sign in and start accepting deliveries.',
                ['type' => 'registration_approved'],
            );
        }

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

        // Notify the courier their application was rejected.
        if ($user->role === 'rider') {
            CourierNotifier::notify(
                $user,
                'Courier application not approved',
                'Your Courier application was not approved at this time. Please contact support for assistance.',
                ['type' => 'registration_rejected'],
            );
        }

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
        $query = User::query()->whereIn('role', ['seller', 'buyer', 'rider', 'logistics', 'hub_staff']);

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

        $users = $query->latest()->paginate(15);
        $eligibilityController = app(AccountEmailReleaseController::class);
        $users->getCollection()->transform(function (User $user) use ($eligibilityController): User {
            if ($user->account_archived_at !== null) {
                $user->setAttribute('email', '[released]');
            }

            $eligibility = $eligibilityController->eligibility($user);
            $user->setAttribute('can_release_email', $eligibility['eligible']);
            $user->setAttribute('email_release_block_reason', $eligibility['reason']);

            return $user;
        });

        return response()->json([
            'success' => true,
            'data' => $users,
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

        if ($user->account_archived_at !== null) {
            return response()->json(['success' => false, 'message' => 'Archived accounts cannot be edited.'], 409);
        }

        $data = $request->validate([
            'first_name'  => ['sometimes', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name'   => ['sometimes', 'string', 'max:100'],
            'email'       => ['sometimes', 'email', 'unique:users,email,' . $id],
            'phone'       => ['nullable', 'string', 'max:20'],
            'role'        => ['sometimes', 'in:buyer,seller,rider,logistics'],
            'password'    => ['sometimes', 'required', 'string', 'min:8', 'max:128', 'confirmed'],
            'password_confirmation' => [
                'sometimes',
                'required_with:password',
                'string',
                function ($attribute, $value, $fail) use ($request) {
                    if (! $request->filled('password')) {
                        $fail('A new password is required when confirming a password.');
                    }
                },
            ],
        ]);

        unset($data['password_confirmation']);

        if (($data['role'] ?? null) === 'logistics' && $user->role !== 'logistics') {
            return response()->json([
                'success' => false,
                'message' => 'Logistics access must be granted through the approved registration workflow.',
            ], 422);
        }

        $user = DB::transaction(function () use ($id, $data): User {
            $user = User::query()->lockForUpdate()->findOrFail($id);
            abort_if($user->account_archived_at !== null, 409, 'Archived accounts cannot be edited.');
            $user->update($data);
            return $user->refresh();
        });

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

        if ($user->account_archived_at !== null) {
            return response()->json(['success' => false, 'message' => 'Archived accounts cannot change status.'], 409);
        }

        $data = $request->validate([
            'status' => ['required', 'in:active,suspended,rejected,pending'],
            'suspension_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($data['status'] === 'active') {
            if (!$user->email_verified_at) {
                return response()->json(['success' => false, 'message' => 'Email verification is required before activation.'], 422);
            }
            $requiredDocuments = match ($user->role) {
                'seller' => ['valid_id', 'business_permit'],
                'rider' => ['valid_id', 'or_cr', 'drivers_license'],
                'logistics' => ['valid_id', 'business_permit'],
                'hub_staff' => [],
                default => ['valid_id'],
            };
            $approvedTypes = UserDocument::where('user_id', $user->id)
                ->where('status', 'approved')->whereIn('document_type', $requiredDocuments)
                ->pluck('document_type')->unique()->all();
            if (array_diff($requiredDocuments, $approvedTypes)) {
                return response()->json(['success' => false, 'message' => 'All required registration documents must be approved first.'], 422);
            }
        }

        // Persist the status and revoke tokens atomically. Only a transition into
        // suspended triggers a notification, so retries do not send duplicates.
        $statusNotification = DB::transaction(function () use ($id, $data): ?array {
            $user = User::query()->lockForUpdate()->findOrFail($id);

            if ($user->role === 'admin') {
                abort(403, 'Unauthorized.');
            }
            abort_if($user->account_archived_at !== null, 409, 'Archived accounts cannot change status.');

            $wasSuspended = $user->status === 'suspended';
            $suspendedAt = now();

            // Status is intentionally excluded from User's mass-assignable fields.
            $user->forceFill([
                'status' => $data['status'],
                'suspension_reason' => $data['status'] === 'suspended'
                    ? (trim((string) ($data['suspension_reason'] ?? '')) ?: null)
                    : null,
            ])->save();

            if ($data['status'] !== 'active') {
                $user->tokens()->delete();
            }

            $notificationKind = match (true) {
                $data['status'] === 'suspended' && !$wasSuspended => 'suspended',
                $data['status'] === 'active' && $wasSuspended => 'reactivated',
                default => null,
            };

            if ($notificationKind === null) {
                return null;
            }

            return [
                'kind' => $notificationKind,
                'user' => $user,
                'occurred_at' => $suspendedAt,
            ];
        });

        if ($statusNotification !== null) {
            /** @var User $notifiedUser */
            $notifiedUser = $statusNotification['user'];
            $userName = trim($notifiedUser->first_name.' '.$notifiedUser->last_name) ?: 'there';

            try {
                $mail = $statusNotification['kind'] === 'suspended'
                    ? new AccountSuspensionMail(
                        userName: $userName,
                        reason: $notifiedUser->suspension_reason,
                        suspendedAt: $statusNotification['occurred_at'],
                    )
                    : new AccountReactivationMail(
                        userName: $userName,
                        reactivatedAt: $statusNotification['occurred_at'],
                    );

                Mail::to($notifiedUser->email)->send($mail);
            } catch (\Throwable $exception) {
                // Delivery failures must never undo a committed status change.
                $event = $statusNotification['kind'] === 'suspended' ? 'suspension' : 'reactivation';
                Log::warning("Account {$event} notification email delivery failed.", [
                    'user_id' => $notifiedUser->id,
                    'exception_class' => $exception::class,
                ]);
            }
        }

        $user = User::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'User status updated.',
            'data'    => $user,
        ]);
    }
}
