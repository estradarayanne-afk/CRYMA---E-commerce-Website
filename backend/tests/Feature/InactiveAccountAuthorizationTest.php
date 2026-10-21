<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class InactiveAccountAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cannot_edit_another_admin_profile_or_partially_change_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $target = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'first_name' => 'Original',
            'email' => 'protected-admin@example.test',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$target->id}", [
                'first_name' => 'Changed',
                'email' => 'changed-admin@example.test',
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'first_name' => 'Original',
            'email' => 'protected-admin@example.test',
            'status' => 'active',
        ]);
    }

    public function test_admin_cannot_change_another_admin_status_or_partially_change_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $target = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'suspended'])
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $this->assertSame('active', $target->fresh()->status);
    }

    public function test_suspended_and_rejected_users_cannot_use_previously_issued_tokens(): void
    {
        foreach (['pending', 'suspended', 'rejected'] as $status) {
            $user = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
            $plainTextToken = $user->createToken('regression-test')->plainTextToken;
            $user->forceFill(['status' => $status])->save();

            $this->withToken($plainTextToken)
                ->getJson('/api/user')
                ->assertForbidden()
                ->assertJsonPath('success', false)
                ->assertJsonPath('message', 'Unauthorized.');
        }
    }

    public function test_deactivation_through_admin_endpoint_revokes_existing_tokens(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $plainTextToken = $buyer->createToken('regression-test')->plainTextToken;

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$buyer->id}/status", ['status' => 'suspended'])
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        $this->assertDatabaseCount('personal_access_tokens', 0);
        Auth::forgetGuards();
        $this->withToken($plainTextToken)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_active_verified_buyer_keeps_access_and_role_guards_still_apply(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.role', 'buyer');
        $this->getJson('/api/buyer/checkout-data')->assertOk();
        $this->getJson('/api/seller/reviews')->assertForbidden();
        $this->postJson('/api/login', [
            'email' => $buyer->email,
            'password' => 'password',
        ])->assertOk()->assertJsonPath('user.role', 'buyer');

        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/buyer/checkout-data')
            ->assertForbidden();

        $rider = User::factory()->create(['role' => 'rider', 'status' => 'active']);
        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/buyer/checkout-data')
            ->assertForbidden();
    }
}
