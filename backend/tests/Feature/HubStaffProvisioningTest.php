<?php

namespace Tests\Feature;

use App\Mail\RegistrationOtpMail;
use App\Models\HubStaffProfile;
use App\Models\LogisticsHub;
use App\Models\LogisticsProfile;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class HubStaffProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_rejects_hub_staff_role(): void
    {
        $this->postJson('/api/register', ['role' => 'hub_staff'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);
        $this->assertDatabaseMissing('users', ['role' => 'hub_staff']);
    }

    public function test_admin_can_create_view_reassign_and_suspend_hub_staff_without_exposing_password(): void
    {
        Mail::fake();
        $admin = $this->admin();
        $firstHub = $this->hub('FIRST-HUB');
        $secondHub = $this->hub('SECOND-HUB');

        $created = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/hub-staff', $this->staffPayload($firstHub->id))
            ->assertCreated()
            ->assertJsonPath('data.role', 'hub_staff')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.email_verified_at', null)
            ->assertJsonPath('data.hub.id', $firstHub->id)
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.password_hash');

        $staff = User::where('email', 'hubstaff@example.test')->firstOrFail();
        $this->assertTrue(Hash::check('password123', $staff->password));
        $this->assertSame($staff->id, $staff->hubStaffProfile->user_id);
        $this->assertSame($firstHub->id, $staff->hubStaffProfile->hub_id);
        $this->assertNull($staff->email_verified_at);
        $this->assertDatabaseHas('hub_staff_audit_events', [
            'subject_user_id' => $staff->id,
            'actor_id' => $admin->id,
            'event_type' => 'hub_staff_created',
            'to_hub_id' => $firstHub->id,
        ]);

        $this->getJson("/api/admin/hub-staff/{$staff->id}")
            ->assertOk()->assertJsonPath('data.hub.id', $firstHub->id)
            ->assertJsonPath('audit_events.0.event_type', 'hub_staff_created');
        $this->getJson('/api/admin/hub-staff')->assertOk()->assertJsonPath('data.0.id', $staff->id);
        $this->patchJson("/api/admin/hub-staff/{$staff->id}/activate")->assertUnprocessable();

        $otp = null;
        Mail::assertSent(RegistrationOtpMail::class, function (RegistrationOtpMail $mail) use (&$otp): bool {
            $otp = $mail->otp;

            return true;
        });
        $this->postJson('/api/verify-email', ['email' => $staff->email, 'otp' => $otp])->assertOk();
        $this->patchJson("/api/admin/hub-staff/{$staff->id}/activate")
            ->assertOk()->assertJsonPath('data.status', 'active');
        $this->patchJson("/api/admin/users/{$staff->id}", ['role' => 'logistics'])
            ->assertOk()
            ->assertJsonPath('data.role', 'hub_staff'); // role field is silently ignored
        $this->patchJson("/api/admin/users/{$staff->id}", ['role' => 'hub_staff'])
            ->assertOk()
            ->assertJsonPath('data.role', 'hub_staff'); // role field is silently ignored

        $this->patchJson("/api/admin/hub-staff/{$staff->id}/hub", ['hub_id' => $secondHub->id])
            ->assertOk()->assertJsonPath('data.hub.id', $secondHub->id);
        $this->assertDatabaseHas('hub_staff_audit_events', [
            'subject_user_id' => $staff->id,
            'actor_id' => $admin->id,
            'event_type' => 'hub_staff_reassigned',
            'from_hub_id' => $firstHub->id,
            'to_hub_id' => $secondHub->id,
        ]);

        $this->patchJson("/api/admin/hub-staff/{$staff->id}/suspend")
            ->assertOk()->assertJsonPath('data.status', 'suspended');
        $this->assertDatabaseHas('hub_staff_audit_events', [
            'subject_user_id' => $staff->id,
            'actor_id' => $admin->id,
            'event_type' => 'hub_staff_suspended',
        ]);
        $this->assertSame(0, $staff->tokens()->count());
        $this->patchJson("/api/admin/users/{$staff->id}/status", ['status' => 'active'])
            ->assertOk()->assertJsonPath('data.status', 'active');
        $this->assertSame($staff->id, $created->json('data.id'));
    }

    public function test_authorized_logistics_can_manage_hub_staff_but_cannot_grant_capabilities(): void
    {
        $manager = $this->logistics(true);
        $targetLogistics = $this->logistics(false);
        $hub = $this->hub('MANAGER-HUB');

        $this->actingAs($manager, 'sanctum')->getJson('/api/logistics/profile')
            ->assertOk()->assertJsonPath('data.can_manage_hub_staff', true);

        $response = $this->actingAs($manager, 'sanctum')->postJson('/api/logistics/hub-staff', $this->staffPayload($hub->id))
            ->assertCreated()->assertJsonPath('data.hub.id', $hub->id);
        $staff = User::findOrFail($response->json('data.id'));

        $this->actingAs($manager, 'sanctum')
            ->patchJson("/api/logistics/hub-staff/{$staff->id}/hub", ['hub_id' => $this->hub('MANAGER-HUB-2')->id])
            ->assertOk();
        $this->patchJson("/api/logistics/hub-staff/{$staff->id}/suspend")->assertOk();

        $this->putJson("/api/admin/logistics-users/{$targetLogistics->id}/hub-staff-capability")->assertForbidden();
        $this->assertFalse($targetLogistics->fresh()->logisticsProfile->can_manage_hub_staff);
    }

    public function test_inactive_logistics_account_cannot_use_its_provisioning_capability(): void
    {
        $manager = $this->logistics(true);
        $manager->forceFill(['status' => 'suspended'])->save();

        $this->actingAs($manager, 'sanctum')
            ->getJson('/api/logistics/hub-staff')
            ->assertForbidden();
    }

    public function test_ordinary_logistics_cannot_list_create_reassign_or_suspend_hub_staff(): void
    {
        $ordinary = $this->logistics(false);
        $staff = $this->staff($this->hub('ORDINARY-HUB'));

        $this->actingAs($ordinary, 'sanctum')->getJson('/api/logistics/hub-staff')->assertForbidden();
        $this->postJson('/api/logistics/hub-staff', $this->staffPayload($this->hub('ORDINARY-HUB-2')->id))->assertForbidden();
        $this->patchJson("/api/logistics/hub-staff/{$staff->id}/hub", ['hub_id' => $this->hub('ORDINARY-HUB-3')->id])->assertForbidden();
        $this->patchJson("/api/logistics/hub-staff/{$staff->id}/suspend")->assertForbidden();
    }

    public function test_only_admin_can_grant_and_revoke_logistics_capability_and_both_actions_are_audited(): void
    {
        $admin = $this->admin();
        $manager = $this->logistics(false);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/logistics-users/{$manager->id}/hub-staff-capability")
            ->assertOk()->assertJsonPath('data.can_manage_hub_staff', true)
            ->assertJsonPath('data.granted_by', $admin->id);
        $this->assertDatabaseHas('hub_staff_audit_events', [
            'subject_user_id' => $manager->id,
            'actor_id' => $admin->id,
            'event_type' => 'logistics_hub_staff_capability_granted',
        ]);

        $manager->forceFill(['status' => 'suspended'])->save();
        $this->deleteJson("/api/admin/logistics-users/{$manager->id}/hub-staff-capability")
            ->assertOk()->assertJsonPath('data.can_manage_hub_staff', false)
            ->assertJsonPath('data.revoked_by', $admin->id);
        $this->assertDatabaseHas('hub_staff_audit_events', [
            'subject_user_id' => $manager->id,
            'actor_id' => $admin->id,
            'event_type' => 'logistics_hub_staff_capability_revoked',
        ]);
        $this->getJson('/api/admin/hub-staff/logistics-managers')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $manager->id,
                'can_manage_hub_staff' => false,
            ]);
        $this->actingAs($manager, 'sanctum')->getJson('/api/logistics/hub-staff')->assertForbidden();
    }

    public function test_non_logistics_targets_cannot_receive_provisioning_capability(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/logistics-users/{$buyer->id}/hub-staff-capability")
            ->assertNotFound();
        $this->assertDatabaseMissing('hub_staff_audit_events', ['subject_user_id' => $buyer->id]);
    }

    public function test_missing_or_inactive_hub_assignment_fails_closed_and_inactive_account_is_denied(): void
    {
        $unassigned = User::factory()->create(['role' => 'hub_staff', 'status' => 'active']);
        $this->actingAs($unassigned, 'sanctum')->getJson('/api/hub-staff/assignment')->assertForbidden();

        $inactiveHubStaff = $this->staff($this->hub('INACTIVE-ASSIGNMENT'));
        $inactiveHubStaff->hubStaffProfile->hub->update(['is_active' => false]);
        $this->actingAs($inactiveHubStaff, 'sanctum')->getJson('/api/hub-staff/assignment')->assertForbidden();

        $inactiveAccount = $this->staff($this->hub('INACTIVE-ACCOUNT'));
        $inactiveAccount->forceFill(['status' => 'suspended'])->save();
        $this->actingAs($inactiveAccount, 'sanctum')->getJson('/api/hub-staff/assignment')->assertForbidden();
    }

    public function test_assignment_rejects_nonexistent_and_inactive_hubs_and_database_prevents_duplicate_profiles(): void
    {
        $admin = $this->admin();
        $staff = $this->staff($this->hub('VALID-ASSIGNMENT'));
        $inactive = $this->hub('INACTIVE-DESTINATION', false);

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/hub-staff/{$staff->id}/hub", ['hub_id' => 999999])->assertUnprocessable();
        $this->patchJson("/api/admin/hub-staff/{$staff->id}/hub", ['hub_id' => $inactive->id])->assertUnprocessable();

        $this->expectException(QueryException::class);
        HubStaffProfile::create([
            'user_id' => $staff->id,
            'hub_id' => $inactive->id,
            'assigned_at' => now(),
        ]);
    }

    public function test_non_admin_roles_cannot_access_admin_provisioning_and_existing_logistics_routes_stay_separate(): void
    {
        $manager = $this->logistics(true);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->actingAs($buyer, 'sanctum')->getJson('/api/admin/hub-staff')->assertForbidden();

        $this->actingAs($manager, 'sanctum')->getJson('/api/logistics/dashboard')->assertOk();
        $this->getJson('/api/admin/hub-staff')->assertForbidden();
    }

    public function test_existing_seller_buyer_and_rider_roles_cannot_use_hub_staff_provisioning_routes(): void
    {
        foreach (['seller', 'buyer', 'rider'] as $role) {
            $user = User::factory()->create(['role' => $role, 'status' => 'active']);
            $this->actingAs($user, 'sanctum')->getJson('/api/admin/hub-staff')->assertForbidden();
            $this->getJson('/api/logistics/hub-staff')->assertForbidden();
            $this->getJson('/api/hub-staff/assignment')->assertForbidden();
        }
    }

    public function test_hub_staff_index_supports_search_filters_pagination_and_global_summary(): void
    {
        $admin = $this->admin();
        $taguigHub = $this->hub('TAGUIG-HUB');
        $taguigHub->update(['location_label' => 'Taguig City']);
        $baguioHub = $this->hub('BAGUIO-HUB');
        $baguioHub->update(['location_label' => 'Baguio City']);
        $taguigStaff = $this->staff($taguigHub);
        $baguioStaff = $this->staff($baguioHub);
        $baguioStaff->forceFill(['status' => 'pending'])->save();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/hub-staff?search=Taguig&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.current_page', 1)
            ->assertJsonPath('data.last_page', 1)
            ->assertJsonPath('data.data.0.id', $taguigStaff->id)
            ->assertJsonPath('meta.summary.active', 1)
            ->assertJsonPath('meta.summary.pending', 1)
            ->assertJsonPath('meta.summary.unassigned_hubs', 0);

        $this->getJson("/api/admin/hub-staff?status=pending&hub_id={$baguioHub->id}&per_page=1")
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $baguioStaff->id);

        $this->getJson('/api/admin/hub-staff?per_page=1&page=2')
            ->assertOk()
            ->assertJsonPath('data.total', 2)
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonCount(1, 'data.data');
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    private function logistics(bool $authorized): User
    {
        $user = User::forceCreate([
            'first_name' => 'Logistics', 'last_name' => 'Manager',
            'email' => uniqid('logistics-', true).'@example.test',
            'password' => Hash::make('password123'), 'role' => 'logistics',
            'status' => 'active', 'email_verified_at' => now(),
        ]);
        LogisticsProfile::create([
            'user_id' => $user->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
            'business_name' => 'Logistics Operations',
            'can_manage_hub_staff' => $authorized,
        ]);

        return $user;
    }

    private function staff(LogisticsHub $hub): User
    {
        $user = User::factory()->create(['role' => 'hub_staff', 'status' => 'active']);
        HubStaffProfile::create([
            'user_id' => $user->id,
            'hub_id' => $hub->id,
            'assigned_at' => now(),
        ]);

        return $user;
    }

    private function hub(string $code, bool $active = true): LogisticsHub
    {
        return LogisticsHub::create([
            'name' => $code,
            'code' => $code,
            'is_active' => $active,
        ]);
    }

    private function staffPayload(int $hubId): array
    {
        return [
            'first_name' => 'Hub',
            'last_name' => 'Staff',
            'email' => 'hubstaff@example.test',
            'phone' => '09123456789',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'hub_id' => $hubId,
        ];
    }
}
