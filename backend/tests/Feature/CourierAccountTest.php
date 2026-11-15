<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\CourierProfile;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
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

    public function test_courier_account_returns_registered_details_and_private_license_photo(): void
    {
        Storage::fake('local');
        [$courier, $profile] = $this->courier();
        $courier->forceFill(['middle_name' => 'Dela'])->save();
        Address::create([
            'user_id' => $courier->id,
            'region' => 'NCR',
            'province' => '',
            'municipality' => 'Makati City',
            'barangay' => 'Poblacion',
            'street' => 'Example Street',
            'house_number' => '12',
            'postal_code' => '1200',
        ]);
        Vehicle::create([
            'courier_profile_id' => $profile->id,
            'vehicle_type' => 'motorcycle',
            'plate_number' => 'ABC-1234',
        ]);

        $file = UploadedFile::fake()->image('drivers-license.png', 64, 64);
        $path = $file->store("registration-documents/{$courier->id}", 'local');
        $courier->documents()->create([
            'document_type' => 'drivers_license',
            'file_path' => $path,
            'original_file_name' => 'drivers-license.png',
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'status' => 'approved',
        ]);

        $this->actingAs($courier, 'sanctum')
            ->getJson('/api/courier/account')
            ->assertOk()
            ->assertJsonPath('data.user.middle_name', 'Dela')
            ->assertJsonPath('data.profile.birthday', '1990-01-01')
            ->assertJsonPath('data.address.municipality', 'Makati City')
            ->assertJsonPath('data.vehicles.0.plate_number', 'ABC-1234')
            ->assertJsonPath('data.drivers_license.status', 'approved')
            ->assertJsonPath('data.ewallet_qr_available', false)
            ->assertJsonMissingPath('data.drivers_license.file_path')
            ->assertJsonMissingPath('data.ewallet_qr_path');

        $response = $this->get('/api/courier/account/drivers-license')
            ->assertOk();
        $this->assertStringContainsString(
            'no-store',
            $response->headers->get('Cache-Control'),
        );
        $this->assertStringContainsString(
            'private',
            $response->headers->get('Cache-Control'),
        );
        $this->assertStringStartsWith('image/', $response->headers->get('Content-Type'));
        $this->assertNotEmpty($response->streamedContent());

        [$otherCourier] = $this->courier();
        $this->actingAs($otherCourier, 'sanctum')
            ->get('/api/courier/account/drivers-license')
            ->assertNotFound();
    }

    public function test_courier_can_save_replace_and_view_a_private_ewallet_qr_image(): void
    {
        Storage::fake('local');
        [$courier, $profile] = $this->courier();
        $this->actingAs($courier, 'sanctum');

        $this->post('/api/courier/account/ewallet-qr', [
            'qr_image' => UploadedFile::fake()->image('wallet-qr.png', 64, 64),
        ])->assertOk()
            ->assertJsonPath('data.ewallet_qr_available', true);

        $firstPath = $profile->fresh()->ewallet_qr_path;
        $this->assertIsString($firstPath);
        Storage::disk('local')->assertExists($firstPath);

        $qrResponse = $this->get('/api/courier/account/ewallet-qr')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString(
            'no-store',
            $qrResponse->headers->get('Cache-Control'),
        );
        $this->assertStringContainsString(
            'private',
            $qrResponse->headers->get('Cache-Control'),
        );

        [$otherCourier] = $this->courier();
        $this->actingAs($otherCourier, 'sanctum')
            ->get('/api/courier/account/ewallet-qr')
            ->assertNotFound();
        $this->actingAs($courier, 'sanctum');

        $this->post('/api/courier/account/ewallet-qr', [
            'qr_image' => UploadedFile::fake()->image('new-wallet-qr.png', 64, 64),
        ])->assertOk();

        $secondPath = $profile->fresh()->ewallet_qr_path;
        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('local')->assertMissing($firstPath);
        Storage::disk('local')->assertExists($secondPath);

        $this->post('/api/courier/account/ewallet-qr', [
            'qr_image' => UploadedFile::fake()->create('wallet-qr.pdf', 100, 'application/pdf'),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('qr_image');
    }

    public function test_only_active_riders_can_access_the_courier_account_endpoints(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
        ]);
        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/courier/account')
            ->assertForbidden();

        $pendingRider = User::factory()->create([
            'role' => 'rider',
            'status' => 'pending',
        ]);
        $this->actingAs($pendingRider, 'sanctum')
            ->getJson('/api/courier/account')
            ->assertForbidden();
    }

    /**
     * @return array{User, CourierProfile}
     */
    private function courier(): array
    {
        $courier = User::factory()->create([
            'role' => 'rider',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $profile = CourierProfile::create([
            'user_id' => $courier->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
        ]);

        return [$courier, $profile];
    }
}
