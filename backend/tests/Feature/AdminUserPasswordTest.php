<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_change_a_user_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $target = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
            'password' => 'old-password',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$target->id}", [
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonMissing(['password' => 'new-password']);

        $this->assertTrue(Hash::check('new-password', $target->fresh()->password));
        $this->assertFalse(Hash::check('old-password', $target->fresh()->password));
    }

    public function test_admin_can_update_user_details_without_changing_the_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $target = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
            'password' => 'unchanged-password',
        ]);
        $originalPasswordHash = $target->password;

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$target->id}", ['first_name' => 'Updated'])
            ->assertOk();

        $this->assertSame($originalPasswordHash, $target->fresh()->password);
        $this->assertTrue(Hash::check('unchanged-password', $target->fresh()->password));
    }

    public function test_admin_password_change_requires_a_matching_confirmation_and_minimum_length(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $target = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $originalPasswordHash = $target->password;

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$target->id}", [
                'password' => 'short',
                'password_confirmation' => 'different',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->assertSame($originalPasswordHash, $target->fresh()->password);
    }

    public function test_admin_password_change_rejects_confirmation_without_a_new_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $target = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $originalPasswordHash = $target->password;

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$target->id}", [
                'password_confirmation' => 'new-password',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password_confirmation']);

        $this->assertSame($originalPasswordHash, $target->fresh()->password);
    }
}
