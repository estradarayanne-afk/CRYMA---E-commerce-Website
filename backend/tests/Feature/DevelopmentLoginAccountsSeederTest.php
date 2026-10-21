<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\CourierEligibility;
use Database\Seeders\DevelopmentLoginAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class DevelopmentLoginAccountsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_login_ready_development_accounts_and_is_idempotent(): void
    {
        Storage::fake('local');
        $seeder = new DevelopmentLoginAccountsSeeder();

        $seeder->run();

        $expected = [
            'admin@cryma.com' => 'admin',
            'buyer@cryma.com' => 'buyer',
            'seller@cryma.com' => 'seller',
            'pickup@cryma.com' => 'rider',
            'delivery@cryma.com' => 'rider',
        ];
        $this->assertDatabaseCount('users', count($expected));

        foreach ($expected as $email => $role) {
            $user = User::where('email', $email)->firstOrFail();
            $this->assertSame($role, $user->role);
            $this->assertSame('active', $user->status);
            $this->assertNotNull($user->email_verified_at);
            $this->assertTrue(Hash::check('crymashop123', $user->password));

            $response = $this->postJson('/api/login', ['email' => $email, 'password' => 'crymashop123']);
            $response->assertOk()->assertJsonPath('user.role', $role);
        }

        $this->assertDatabaseHas('buyer_profiles', ['user_id' => User::where('email', 'buyer@cryma.com')->value('id')]);
        $this->assertDatabaseHas('seller_profiles', ['user_id' => User::where('email', 'seller@cryma.com')->value('id')]);
        $this->assertSame(2, app(CourierEligibility::class)->profiles()->count());
        $this->assertSame(9, \App\Models\UserDocument::count());
        foreach (\App\Models\UserDocument::all() as $document) {
            $this->assertStringStartsWith('registration-documents/'.$document->user_id.'/', $document->file_path);
            Storage::disk('local')->assertExists($document->file_path);
        }

        $this->withToken(User::where('email', 'buyer@cryma.com')->first()->createToken('test')->plainTextToken)
            ->getJson('/api/courier/pickups')->assertForbidden();
        $this->withToken(User::where('email', 'pickup@cryma.com')->first()->createToken('test')->plainTextToken)
            ->getJson('/api/admin/logistics')->assertForbidden();

        $seeder->run();
        $this->assertDatabaseCount('users', count($expected));
        $this->assertSame(9, \App\Models\UserDocument::count());
    }

    public function test_existing_role_accounts_are_reported_and_never_modified_or_duplicated(): void
    {
        Storage::fake('local');
        $existingBuyer = User::forceCreate([
            'first_name' => 'Existing',
            'last_name' => 'Buyer',
            'email' => 'existing-buyer@example.test',
            'password' => Hash::make('unchanged-password'),
            'role' => 'buyer',
            'status' => 'pending',
            'email_verified_at' => null,
        ]);

        (new DevelopmentLoginAccountsSeeder())->run();

        $this->assertSame(1, User::where('role', 'buyer')->count());
        $this->assertDatabaseMissing('users', ['email' => 'buyer@cryma.com']);
        $existingBuyer->refresh();
        $this->assertSame('pending', $existingBuyer->status);
        $this->assertNull($existingBuyer->email_verified_at);
        $this->assertTrue(Hash::check('unchanged-password', $existingBuyer->password));
        $this->assertSame(2, User::where('role', 'rider')->count());
    }

    public function test_it_refuses_to_run_outside_local_development_or_testing(): void
    {
        $this->app['env'] = 'production';
        try {
            $this->expectException(RuntimeException::class);
            (new DevelopmentLoginAccountsSeeder())->run();
        } finally {
            $this->app['env'] = 'testing';
        }
    }
}
