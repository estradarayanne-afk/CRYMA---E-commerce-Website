<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LegacyAccountLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function beforeRefreshingDatabase(): void
    {
        $sqliteDatabase = config('database.connections.sqlite.database');
        $databaseUrl = config('database.connections.sqlite.url');

        if (
            app()->environment() !== 'testing'
            || config('database.default') !== 'sqlite'
            || $sqliteDatabase !== ':memory:'
            || ($databaseUrl !== null && $databaseUrl !== '')
        ) {
            throw new \LogicException('LegacyAccountLoginTest requires testing with isolated in-memory SQLite and no database URL.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_active_pre_otp_accounts_with_existing_password_hashes_can_login_for_each_role(): void
    {
        foreach (['buyer', 'seller', 'rider', 'admin'] as $index => $role) {
            $email = "legacy-{$role}@example.test";
            $hash = Hash::make('ExistingAccountPassword123!');
            $user = User::factory()->create([
                'email' => $email,
                'email_verified_at' => null,
                'password' => $hash,
                'role' => $role,
                'status' => 'active',
            ]);
            $user->forceFill(['email_otp_hash' => null])->save();

            $this->postJson('/api/login', [
                'email' => strtoupper($email),
                'password' => 'ExistingAccountPassword123!',
            ])->assertOk()
                ->assertJsonPath('user.id', $user->id)
                ->assertJsonPath('user.role', $role)
                ->assertJsonStructure(['token', 'user']);

            $this->assertSame($hash, $user->fresh()->password, "Login changed the existing password hash for {$role}.");
        }
    }

    public function test_invalid_credentials_and_nonexistent_accounts_are_rejected(): void
    {
        $hash = Hash::make('ExistingAccountPassword123!');
        $user = User::factory()->create([
            'email' => 'existing-legacy@example.test',
            'email_verified_at' => null,
            'password' => $hash,
            'status' => 'active',
        ]);
        $user->forceFill(['email_otp_hash' => null])->save();

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'IncorrectPassword123!',
        ])->assertUnauthorized();

        $this->postJson('/api/login', [
            'email' => 'missing-account@example.test',
            'password' => 'AnyPassword123!',
        ])->assertUnauthorized();
    }

    public function test_new_unverified_accounts_remain_blocked_even_if_marked_active(): void
    {
        $user = User::factory()->create([
            'email' => 'new-unverified@example.test',
            'email_verified_at' => null,
            'password' => 'NewAccountPassword123!',
            'status' => 'active',
        ]);
        $user->forceFill(['email_otp_hash' => Hash::make('123456')])->save();

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'NewAccountPassword123!',
        ])->assertForbidden()
            ->assertJsonPath('email_verified', false);
    }

    public function test_pending_or_suspended_legacy_accounts_remain_blocked(): void
    {
        foreach (['pending', 'suspended'] as $status) {
            $user = User::factory()->create([
                'email_verified_at' => null,
                'password' => 'LegacyAccountPassword123!',
                'status' => $status,
            ]);
            $user->forceFill(['email_otp_hash' => null])->save();

            $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'LegacyAccountPassword123!',
            ])->assertForbidden();
        }
    }
}
