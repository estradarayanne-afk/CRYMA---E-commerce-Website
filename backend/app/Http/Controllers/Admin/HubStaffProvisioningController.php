<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\RegistrationOtpMail;
use App\Models\HubStaffAuditEvent;
use App\Models\HubStaffProfile;
use App\Models\LogisticsHub;
use App\Models\LogisticsProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Throwable;

class HubStaffProvisioningController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:120'],
            'status' => ['sometimes', 'nullable', Rule::in(['all', 'active', 'pending', 'suspended'])],
            'hub_id' => ['sometimes', 'nullable', 'integer', Rule::exists('logistics_hubs', 'id')],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);
        $query = User::query()->where('role', 'hub_staff')
            ->with('hubStaffProfile.hub:id,name,code,is_active,address,psgc_code,location_label')
            ->orderBy('last_name')->orderBy('first_name');

        if (filled($validated['search'] ?? null)) {
            $search = trim($validated['search']);
            $query->where(function ($users) use ($search) {
                $users->where('first_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('hubStaffProfile.hub', function ($hubs) use ($search) {
                        $hubs->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%")
                            ->orWhere('location_label', 'like', "%{$search}%")
                            ->orWhere('psgc_code', 'like', "%{$search}%");
                    });
            });
        }

        if (($validated['status'] ?? 'all') !== 'all') {
            $query->where('status', $validated['status']);
        }
        if (filled($validated['hub_id'] ?? null)) {
            $query->whereHas('hubStaffProfile', fn ($profiles) => $profiles->where('hub_id', $validated['hub_id']));
        }

        $rows = $query->paginate($validated['per_page'] ?? 12)->withQueryString()
            ->through(fn (User $user) => $this->serialize($user));

        $hubStaff = User::query()->where('role', 'hub_staff');
        $summary = [
            'active' => (clone $hubStaff)->where('status', 'active')->count(),
            'pending' => (clone $hubStaff)->where('status', 'pending')->count(),
            'suspended' => (clone $hubStaff)->where('status', 'suspended')->count(),
            'unassigned_hubs' => LogisticsHub::query()->where('is_active', true)
                ->whereDoesntHave('hubStaffProfiles', fn ($profiles) => $profiles->whereHas('user', fn ($users) => $users->where('status', 'active')))
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $rows,
            'meta' => ['summary' => $summary],
        ]);
    }

    public function logisticsManagers()
    {
        $rows = User::query()->where('role', 'logistics')
            ->whereNull('account_archived_at')
            ->with('logisticsProfile')
            ->orderBy('last_name')->orderBy('first_name')->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'status' => $user->status,
                'can_manage_hub_staff' => (bool) $user->logisticsProfile?->can_manage_hub_staff,
            ]);

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function store(Request $request)
    {
        $values = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:8', 'max:128', 'confirmed'],
            'hub_id' => ['required', 'integer', Rule::exists('logistics_hubs', 'id')->where('is_active', true)],
        ]);
        $otp = (string) random_int(100000, 999999);

        $user = DB::transaction(function () use ($request, $values, $otp): User {
            $hub = LogisticsHub::query()->whereKey($values['hub_id'])->lockForUpdate()->firstOrFail();
            abort_unless($hub->is_active, 422, 'Assign Hub Staff to an active hub.');

            $user = User::forceCreate([
                'first_name' => trim($values['first_name']),
                'middle_name' => isset($values['middle_name']) ? trim($values['middle_name']) : null,
                'last_name' => trim($values['last_name']),
                'email' => mb_strtolower(trim($values['email'])),
                'phone' => $values['phone'] ?? null,
                'password' => Hash::make($values['password']),
                'role' => 'hub_staff',
                'status' => 'pending',
                'email_otp_hash' => Hash::make($otp),
                'email_otp_expires_at' => now()->addMinutes(10),
                'email_otp_attempts' => 0,
            ]);

            HubStaffProfile::create([
                'user_id' => $user->id,
                'hub_id' => $hub->id,
                'assigned_by' => $request->user()->id,
                'assigned_at' => now(),
            ]);

            HubStaffAuditEvent::create([
                'subject_user_id' => $user->id,
                'actor_id' => $request->user()->id,
                'event_type' => 'hub_staff_created',
                'to_hub_id' => $hub->id,
                'created_at' => now(),
            ]);

            return $user->load('hubStaffProfile.hub:id,name,code,is_active,address,psgc_code,location_label');
        });

        try {
            Mail::to($user->email)->send(new RegistrationOtpMail($otp));
        } catch (Throwable $exception) {
            Log::warning('Hub Staff verification email delivery failed.', [
                'user_id' => $user->id,
                'exception_class' => $exception::class,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'The account was created pending email verification, but the verification email could not be sent. Use the resend-verification endpoint to retry.',
            ], 503);
        }

        return response()->json(['success' => true, 'message' => 'Hub Staff account created. Email verification is required before activation.', 'data' => $this->serialize($user)], 201);
    }

    public function show(int $id)
    {
        $user = User::query()->where('role', 'hub_staff')->with('hubStaffProfile.hub:id,name,code,is_active,address,psgc_code,location_label')->findOrFail($id);
        $events = HubStaffAuditEvent::query()->where('subject_user_id', $user->id)
            ->with(['actor:id,first_name,last_name', 'fromHub:id,name,code', 'toHub:id,name,code'])
            ->latest('created_at')->get();

        return response()->json([
            'success' => true,
            'data' => $this->serialize($user),
            'audit_events' => $events->map(fn (HubStaffAuditEvent $event) => [
                'event_type' => $event->event_type,
                'actor' => $event->actor ? trim($event->actor->first_name.' '.$event->actor->last_name) : null,
                'from_hub' => $event->fromHub?->only(['id', 'name', 'code']),
                'to_hub' => $event->toHub?->only(['id', 'name', 'code']),
                'created_at' => $event->created_at,
            ]),
        ]);
    }

    public function reassign(Request $request, int $id)
    {
        $values = $request->validate([
            'hub_id' => ['required', 'integer', Rule::exists('logistics_hubs', 'id')->where('is_active', true)],
        ]);

        $user = DB::transaction(function () use ($request, $id, $values): User {
            $user = User::query()->where('role', 'hub_staff')->whereKey($id)->lockForUpdate()->firstOrFail();
            $profile = HubStaffProfile::query()->where('user_id', $user->id)->lockForUpdate()->firstOrFail();
            $hub = LogisticsHub::query()->whereKey($values['hub_id'])->lockForUpdate()->firstOrFail();
            abort_unless($hub->is_active, 422, 'Assign Hub Staff to an active hub.');
            $previousHubId = (int) $profile->hub_id;

            if ($previousHubId !== (int) $hub->id) {
                $profile->update(['hub_id' => $hub->id, 'assigned_by' => $request->user()->id, 'assigned_at' => now()]);
                HubStaffAuditEvent::create([
                    'subject_user_id' => $user->id,
                    'actor_id' => $request->user()->id,
                    'event_type' => 'hub_staff_reassigned',
                    'from_hub_id' => $previousHubId,
                    'to_hub_id' => $hub->id,
                    'created_at' => now(),
                ]);
            }

            return $user->load('hubStaffProfile.hub:id,name,code,is_active,address,psgc_code,location_label');
        });

        return response()->json(['success' => true, 'message' => 'Hub Staff assignment updated.', 'data' => $this->serialize($user)]);
    }

    public function suspend(Request $request, int $id)
    {
        $user = DB::transaction(function () use ($request, $id): User {
            $user = User::query()->where('role', 'hub_staff')->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_if($user->account_archived_at !== null, 409, 'Archived accounts cannot change status.');

            if ($user->status !== 'suspended') {
                $user->forceFill(['status' => 'suspended'])->save();
                $user->tokens()->delete();
                HubStaffAuditEvent::create([
                    'subject_user_id' => $user->id,
                    'actor_id' => $request->user()->id,
                    'event_type' => 'hub_staff_suspended',
                    'from_hub_id' => $user->hubStaffProfile?->hub_id,
                    'created_at' => now(),
                ]);
            }

            return $user->load('hubStaffProfile.hub:id,name,code,is_active,address,psgc_code,location_label');
        });

        return response()->json(['success' => true, 'message' => 'Hub Staff account suspended.', 'data' => $this->serialize($user)]);
    }

    public function activate(Request $request, int $id)
    {
        $user = DB::transaction(function () use ($request, $id): User {
            $user = User::query()->where('role', 'hub_staff')->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_if($user->account_archived_at !== null, 409, 'Archived accounts cannot be activated.');
            abort_unless($user->email_verified_at !== null, 422, 'Email verification is required before activation.');
            $profile = HubStaffProfile::query()->where('user_id', $user->id)->lockForUpdate()->first();
            $hub = $profile ? LogisticsHub::query()->whereKey($profile->hub_id)->lockForUpdate()->first() : null;
            abort_unless($hub?->is_active, 422, 'An active hub assignment is required before activation.');

            if ($user->status !== 'active') {
                $user->forceFill(['status' => 'active'])->save();
                HubStaffAuditEvent::create([
                    'subject_user_id' => $user->id,
                    'actor_id' => $request->user()->id,
                    'event_type' => 'hub_staff_activated',
                    'to_hub_id' => $profile->hub_id,
                    'created_at' => now(),
                ]);
            }

            return $user->load('hubStaffProfile.hub:id,name,code,is_active,address,psgc_code,location_label');
        });

        return response()->json(['success' => true, 'message' => 'Hub Staff account activated.', 'data' => $this->serialize($user)]);
    }

    public function grantCapability(Request $request, int $id)
    {
        $profile = DB::transaction(function () use ($request, $id): LogisticsProfile {
            $user = User::query()->where('role', 'logistics')->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($user->status === 'active' && ! $user->account_archived_at, 422, 'Capability can only be granted to an active Logistics account.');
            $profile = LogisticsProfile::query()->where('user_id', $user->id)->lockForUpdate()->firstOrFail();
            $profile->update([
                'can_manage_hub_staff' => true,
                'hub_staff_capability_granted_by' => $request->user()->id,
                'hub_staff_capability_granted_at' => now(),
                'hub_staff_capability_revoked_by' => null,
                'hub_staff_capability_revoked_at' => null,
            ]);
            HubStaffAuditEvent::create([
                'subject_user_id' => $user->id,
                'actor_id' => $request->user()->id,
                'event_type' => 'logistics_hub_staff_capability_granted',
                'created_at' => now(),
            ]);

            return $profile->fresh();
        });

        return response()->json(['success' => true, 'message' => 'Hub Staff provisioning capability granted.', 'data' => $this->serializeCapability($profile)]);
    }

    public function revokeCapability(Request $request, int $id)
    {
        $profile = DB::transaction(function () use ($request, $id): LogisticsProfile {
            $user = User::query()->where('role', 'logistics')->whereKey($id)->lockForUpdate()->firstOrFail();
            $profile = LogisticsProfile::query()->where('user_id', $user->id)->lockForUpdate()->firstOrFail();

            if ($profile->can_manage_hub_staff) {
                $profile->update([
                    'can_manage_hub_staff' => false,
                    'hub_staff_capability_revoked_by' => $request->user()->id,
                    'hub_staff_capability_revoked_at' => now(),
                ]);
                HubStaffAuditEvent::create([
                    'subject_user_id' => $user->id,
                    'actor_id' => $request->user()->id,
                    'event_type' => 'logistics_hub_staff_capability_revoked',
                    'created_at' => now(),
                ]);
            }

            return $profile->fresh();
        });

        return response()->json(['success' => true, 'message' => 'Hub Staff provisioning capability revoked.', 'data' => $this->serializeCapability($profile)]);
    }

    public function assignment(Request $request)
    {
        $profile = $request->user()->hubStaffProfile;
        $hub = $profile?->hub;

        abort_unless($profile && $hub && $hub->is_active, 403, 'An active Hub Staff account and active hub assignment are required.');

        return response()->json(['success' => true, 'data' => ['hub' => $hub->only(['id', 'name', 'code'])]]);
    }

    private function serialize(User $user): array
    {
        $profile = $user->hubStaffProfile;

        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'status' => $user->status,
            'email_verified_at' => $user->email_verified_at,
            'hub' => $profile?->hub?->only(['id', 'name', 'code', 'is_active', 'address', 'psgc_code', 'location_label']),
            'assigned_by' => $profile?->assigned_by,
            'assigned_at' => $profile?->assigned_at,
        ];
    }

    private function serializeCapability(LogisticsProfile $profile): array
    {
        return [
            'user_id' => $profile->user_id,
            'can_manage_hub_staff' => $profile->can_manage_hub_staff,
            'granted_by' => $profile->hub_staff_capability_granted_by,
            'granted_at' => $profile->hub_staff_capability_granted_at,
            'revoked_by' => $profile->hub_staff_capability_revoked_by,
            'revoked_at' => $profile->hub_staff_capability_revoked_at,
        ];
    }
}
