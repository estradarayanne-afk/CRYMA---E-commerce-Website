<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    public function test_updateUser_ignores_role_field_and_leaves_role_unchanged(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->create([
            'role'   => 'buyer',
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$buyer->id}", [
                'role' => 'seller',
            ])
            ->assertOk();

        // Response should succeed but role must not have changed.
        $this->assertSame('buyer', $response->json('data.role'));
        $this->assertSame('buyer', $buyer->fresh()->role);
    }

    public function test_updateUser_still_updates_legitimate_fields(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->create([
            'first_name' => 'Old',
            'last_name'  => 'Name',
            'role'       => 'buyer',
            'status'     => 'active',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$buyer->id}", [
                'first_name' => 'New',
                'last_name'  => 'Name',
            ])
            ->assertOk();

        $this->assertSame('New', $response->json('data.first_name'));
        $this->assertSame('New', $buyer->fresh()->first_name);
        // Role is still unchanged.
        $this->assertSame('buyer', $buyer->fresh()->role);
    }

    public function test_updateUser_cannot_change_role_to_rider_via_patch(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$buyer->id}", ['role' => 'rider'])
            ->assertOk();

        // Even with a 200, role must remain buyer.
        $this->assertSame('buyer', $buyer->fresh()->role);
    }

    public function test_updateUser_cannot_target_admin_accounts(): void
    {
        $admin       = $this->admin();
        $otherAdmin  = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$otherAdmin->id}", [
                'first_name' => 'Hacked',
            ])
            ->assertForbidden();

        $this->assertNotSame('Hacked', $otherAdmin->fresh()->first_name);
    }
}
