<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CourierAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_courier_can_update_permitted_profile_fields_without_changing_role_or_eligibility(): void
    {
        $courier = User::factory()->create([
            'role' => 'rider',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($courier, 'sanctum')
            ->patchJson('/api/account/profile', [
                'first_name' => 'Updated',
                'last_name' => 'Courier',
                'phone' => '09171234567',
                'role' => 'admin',
                'status' => 'suspended',
                'email_verified_at' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.first_name', 'Updated')
            ->assertJsonPath('data.role', 'rider')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.email_verified_at', $courier->email_verified_at->toISOString());

        $this->assertDatabaseHas('users', [
            'id' => $courier->id,
            'role' => 'rider',
            'status' => 'active',
            'first_name' => 'Updated',
        ]);
    }

    public function test_pending_rejected_and_suspended_couriers_cannot_access_courier_operations(): void
    {
        foreach (['pending', 'rejected', 'suspended'] as $status) {
            $courier = User::factory()->create([
                'role' => 'rider',
                'status' => $status,
                'email_verified_at' => now(),
            ]);

            $this->actingAs($courier, 'sanctum')
                ->getJson('/api/courier/pickups')
                ->assertForbidden();
        }
    }

    public function test_courier_can_change_password_and_log_out(): void
    {
        $courier = User::factory()->create([
            'role' => 'rider',
            'status' => 'active',
            'password' => Hash::make('OldPassword123!'),
        ]);

        $this->actingAs($courier, 'sanctum')
            ->patchJson('/api/account/password', [
                'current_password' => 'OldPassword123!',
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('NewPassword123!', $courier->fresh()->password));

        $token = $courier->createToken('courier-test')->plainTextToken;
        $this->app['auth']->forgetGuards();
        $this->withToken($token)
            ->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logout successful.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
