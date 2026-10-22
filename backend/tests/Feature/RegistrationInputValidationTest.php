<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\CarbonImmutable;
use Carbon\Carbon;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use App\Mail\RegistrationOtpMail;
use App\Models\User;
use Tests\TestCase;

class RegistrationInputValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_factory_matches_the_required_users_schema_and_defaults_to_buyer(): void
    {
        $user = User::factory()->create();

        $this->assertSame('buyer', $user->role);
        $this->assertContains($user->role, ['buyer', 'seller', 'rider']);
        $this->assertSame('pending', $user->status);
        $this->assertNotEmpty($user->first_name);
        $this->assertNotEmpty($user->last_name);
    }

    public function test_user_serialization_hides_password_and_email_otp_metadata(): void
    {
        $user = User::forceCreate([
            'first_name' => 'Test', 'last_name' => 'Buyer',
            'email' => 'hidden-fields@example.com', 'phone' => null,
            'password' => bcrypt('password123'), 'role' => 'buyer', 'status' => 'active',
        ]);
        $user->forceFill([
            'email_otp_hash' => bcrypt('123456'),
            'email_otp_expires_at' => now()->addMinutes(5),
            'email_otp_attempts' => 2,
        ])->save();
        $serialized = $user->toArray();

        foreach (['password', 'remember_token', 'email_otp_hash', 'email_otp_expires_at', 'email_otp_attempts'] as $field) {
            $this->assertArrayNotHasKey($field, $serialized);
        }
    }

    public function test_email_verification_normalizes_email_and_keeps_attempt_limit_and_pending_status(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);

        $user = User::factory()->create([
            'email' => 'verify-case@example.com',
            'status' => 'pending',
            'email_verified_at' => null,
        ]);
        $user->forceFill([
            'email_otp_hash' => Hash::make('123456'),
            'email_otp_expires_at' => now()->addMinutes(10),
            'email_otp_attempts' => 0,
        ])->save();

        $this->postJson('/api/verify-email', [
            'email' => '  VERIFY-CASE@EXAMPLE.COM  ',
            'otp' => '000000',
        ])->assertUnprocessable();

        $this->assertSame(1, $user->fresh()->email_otp_attempts);

        $this->postJson('/api/verify-email', [
            'email' => ' VERIFY-CASE@EXAMPLE.COM ',
            'otp' => '123456',
        ])->assertOk()
            ->assertJsonPath('data.email_verified', true)
            ->assertJsonPath('data.status', 'pending');

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('pending', $user->status);
        $this->assertNull($user->email_otp_hash);
        $this->assertNull($user->email_otp_expires_at);
        $this->assertSame(0, $user->email_otp_attempts);
    }

    public function test_email_verification_rejects_correct_code_after_five_failed_attempts(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);

        $user = User::factory()->create([
            'email' => 'verify-attempts@example.com',
            'status' => 'pending',
            'email_verified_at' => null,
        ]);
        $user->forceFill([
            'email_otp_hash' => Hash::make('123456'),
            'email_otp_expires_at' => now()->addMinutes(10),
            'email_otp_attempts' => 0,
        ])->save();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/verify-email', [
                'email' => $user->email,
                'otp' => '000000',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/verify-email', [
            'email' => $user->email,
            'otp' => '123456',
        ])->assertTooManyRequests();

        $user->refresh();
        $this->assertNull($user->email_verified_at);
        $this->assertSame(5, $user->email_otp_attempts);
    }

    public function test_buyer_cannot_access_seller_management_routes(): void
    {
        $buyer = User::forceCreate([
            'first_name' => 'Test', 'last_name' => 'Buyer',
            'email' => 'buyer-role@example.com', 'phone' => null,
            'password' => bcrypt('password123'), 'role' => 'buyer', 'status' => 'active',
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/seller/products')
            ->assertForbidden();
    }

    public function test_registration_api_enforces_the_complete_eighteenth_birthday(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $today = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $eligibleBirthday = $today->subYears(18)->format('Y-m-d');
        $notYetEligibleBirthday = $today->subYears(18)->addDay()->format('Y-m-d');

        foreach ([$notYetEligibleBirthday, $today->format('Y-m-d'), $today->addDay()->format('Y-m-d'), '2023-02-30', 'bad-date'] as $birthday) {
            $response = $this->postJson('/api/register', $this->buyerPayload($birthday));
            $response->assertUnprocessable()->assertJsonValidationErrors(['birthday']);
        }

        $response = $this->postJson('/api/register', $this->buyerPayload($eligibleBirthday));
        $response->assertUnprocessable()->assertJsonMissingValidationErrors(['birthday']);
    }

    public function test_leap_day_birthday_becomes_eligible_on_march_first_in_a_non_leap_year(): void
    {
        Carbon::setTestNow('2026-02-28 12:00:00 Asia/Manila');
        try {
            $this->postJson('/api/register', $this->buyerPayload('2008-02-29'))
                ->assertUnprocessable()->assertJsonValidationErrors(['birthday']);
            Carbon::setTestNow('2026-03-01 00:01:00 Asia/Manila');
            $this->postJson('/api/register', $this->buyerPayload('2008-02-29'))
                ->assertUnprocessable()->assertJsonMissingValidationErrors(['birthday']);
        } finally {
            Carbon::setTestNow();
        }
    }

    private function buyerPayload(string $birthday): array
    {
        return [
            'first_name' => 'Maria', 'last_name' => 'Santos',
            'email' => 'age-check@example.com', 'phone' => '09123456789',
            'password' => 'password123', 'password_confirmation' => 'password123',
            'terms_accepted' => '1', 'terms_version' => '1.1',
            'privacy_notice_acknowledged' => '1', 'privacy_version' => '1.1',
            'role' => 'buyer', 'sex' => 'female', 'birthday' => $birthday,
            'region' => 'NCR', 'province' => 'Metro Manila', 'municipality' => 'Manila',
            'barangay' => 'Sample', 'street' => 'Rizal Street', 'house_number' => '12',
            'postal_code' => '1000',
        ];
    }

    public function test_registration_rejects_values_over_the_configured_limits(): void
    {
        $response = $this->postJson('/api/register', [
            'first_name' => str_repeat('A', 31),
            'middle_name' => 'ABC',
            'last_name' => str_repeat('B', 31),
            'email' => 'valid@example.com',
            'phone' => '09123456789',
            'password' => str_repeat('a', 129),
            'password_confirmation' => str_repeat('a', 129),
            'role' => 'seller',
            'sex' => 'female',
            'birthday' => '1990-01-01',
            'region' => 'NCR',
            'province' => 'Metro Manila',
            'municipality' => 'Manila',
            'barangay' => 'Sample',
            'street' => str_repeat('S', 101),
            'house_number' => str_repeat('1', 21),
            'postal_code' => '1000',
            'business_name' => str_repeat('B', 101),
            'line_of_business' => 'Unknown Category',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors([
            'first_name', 'middle_name', 'last_name', 'password', 'street',
            'house_number', 'business_name', 'line_of_business', 'valid_id',
            'business_permit',
        ]);
    }

    public function test_registration_accepts_filipino_name_punctuation_and_accented_letters(): void
    {
        $response = $this->postJson('/api/register', [
            'first_name' => str_repeat('Á', 30),
            'middle_name' => 'A.',
            'last_name' => str_repeat('A', 15) . '-' . str_repeat('B', 14),
            'email' => str_repeat('a', 242) . '@example.com',
            'phone' => '+639171234567',
            'password' => str_repeat('p', 128),
            'password_confirmation' => str_repeat('p', 128),
            'role' => 'buyer',
            'sex' => 'female',
            'birthday' => '1990-01-01',
            'region' => 'NCR',
            'province' => 'Metro Manila',
            'municipality' => 'Manila',
            'barangay' => 'Sample',
            'street' => str_repeat('S', 100),
            'house_number' => str_repeat('1', 20),
            'postal_code' => '1000',
        ]);

        $response->assertUnprocessable()->assertJsonMissingValidationErrors([
            'first_name', 'middle_name', 'last_name', 'email', 'phone',
            'password', 'birthday', 'region', 'province', 'municipality',
            'barangay', 'street', 'house_number', 'postal_code',
        ]);
    }

    public function test_registration_rejects_invalid_mobile_and_postal_code_formats(): void
    {
        $response = $this->postJson('/api/register', [
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'email' => 'valid@example.com',
            'phone' => '0912345678',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'buyer',
            'sex' => 'female',
            'birthday' => '1990-01-01',
            'region' => 'NCR',
            'province' => 'Metro Manila',
            'municipality' => 'Manila',
            'barangay' => 'Sample',
            'street' => 'Rizal Street',
            'house_number' => '12-A',
            'postal_code' => '10000',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors(['phone', 'postal_code']);
    }

    public function test_mobile_validation_accepts_and_normalizes_supported_formats_and_rejects_invalid_api_values(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        foreach (['+63 09171234567', '+63 917123456', '+63 917123456a', '91712345678', '+63 917 123 45678'] as $index => $phone) {
            $payload = array_merge($this->buyerPayload('1990-01-01'), [
                'email' => "invalid-mobile-{$index}@example.com", 'phone' => $phone,
            ]);
            $this->postJson('/api/register', $payload)
                ->assertUnprocessable()->assertJsonValidationErrors(['phone']);
        }

        foreach (['+63 9171234567', '09171234567'] as $index => $phone) {
            $payload = array_merge($this->buyerPayload('1990-01-01'), [
                'email' => "valid-mobile-{$index}@example.com", 'phone' => $phone,
            ]);
            $this->postJson('/api/register', $payload)
                ->assertUnprocessable()->assertJsonValidationErrors(['valid_id'])
                ->assertJsonMissingValidationErrors(['phone']);
        }
    }

    public function test_seller_tin_is_optional_validated_encrypted_and_saved_to_the_seller_profile(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        foreach (['12345678', '12345678A', '123-456-789', '12345678901234'] as $index => $tin) {
            $payload = array_merge($this->buyerPayload('1990-01-01'), [
                'email' => "invalid-tin-{$index}@example.com", 'role' => 'seller',
                'business_name' => 'Local Shop', 'line_of_business' => 'Pet Supplies', 'tin' => $tin,
            ]);
            $this->postJson('/api/register', $payload)
                ->assertUnprocessable()->assertJsonValidationErrors(['tin']);
        }

        Storage::fake('local');
        Mail::fake();
        $tin = '123456789012';
        $payload = array_merge($this->buyerPayload('1990-01-01'), [
            'email' => 'seller-tin@example.com', 'phone' => '+63 9171234567', 'role' => 'seller',
            'business_name' => 'Local Shop', 'line_of_business' => 'Pet Supplies', 'tin' => $tin,
            'valid_id' => UploadedFile::fake()->createWithContent('valid-id.pdf', "%PDF-1.4\nvalid id"),
            'business_permit' => UploadedFile::fake()->createWithContent('permit.pdf', "%PDF-1.4\npermit"),
        ]);

        $this->post('/api/register', $payload)->assertCreated();
        $user = User::where('email', 'seller-tin@example.com')->firstOrFail();
        $profile = $user->sellerProfile;
        $this->assertSame($tin, $profile->tin);
        $this->assertSame('+639171234567', $user->phone);
        $this->assertArrayNotHasKey('tin', $profile->toArray());
        $ciphertext = DB::table('seller_profiles')->where('user_id', $user->id)->value('tin');
        $this->assertNotSame($tin, $ciphertext);
        $this->assertDatabaseHas('policy_acceptances', [
            'user_id' => $user->id, 'policy_type' => 'terms', 'policy_version' => '1.1',
        ]);
        $this->assertDatabaseHas('policy_acceptances', [
            'user_id' => $user->id, 'policy_type' => 'privacy_notice', 'policy_version' => '1.1',
        ]);
    }

    public function test_registration_requires_current_policy_acceptance_and_records_it_once(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        Storage::fake('local');
        Mail::fake();
        $payload = array_merge($this->buyerPayload('1990-01-01'), [
            'valid_id' => UploadedFile::fake()->createWithContent('id.pdf', "%PDF-1.4\nverified fixture"),
        ]);

        $missing = $payload;
        unset($missing['terms_accepted'], $missing['privacy_notice_acknowledged']);
        $this->post('/api/register', $missing)->assertUnprocessable()
            ->assertJsonValidationErrors(['terms_accepted', 'privacy_notice_acknowledged']);

        $this->post('/api/register', $payload)->assertCreated();
        $user = User::where('email', $payload['email'])->firstOrFail();
        $this->assertDatabaseCount('policy_acceptances', 2);

        $this->post('/api/register', $payload)->assertUnprocessable()->assertJsonValidationErrors(['email']);
        $this->assertDatabaseCount('policy_acceptances', 2);

        config(['policies.terms.version' => '2.0']);
        $stale = array_merge($this->buyerPayload('1990-01-01'), [
            'email' => 'stale-policy@example.com',
            'valid_id' => UploadedFile::fake()->createWithContent('id.pdf', "%PDF-1.4\nverified fixture"),
        ]);
        $this->post('/api/register', $stale)->assertUnprocessable()->assertJsonValidationErrors(['terms_version']);

        $updated = array_merge($stale, ['terms_version' => '2.0', 'email' => 'updated-policy@example.com']);
        $this->post('/api/register', $updated)->assertCreated();
        $updatedUser = User::where('email', $updated['email'])->firstOrFail();
        $this->assertDatabaseHas('policy_acceptances', [
            'user_id' => $updatedUser->id, 'policy_type' => 'terms', 'policy_version' => '2.0',
        ]);
        $this->assertNotNull($user->policyAcceptances()->where('policy_type', 'terms')->first()->accepted_at);
    }

    public function test_registration_persists_otp_address_and_policy_data_and_sends_verification_mail(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        Storage::fake('local');
        Mail::fake();
        $payload = array_merge($this->buyerPayload('1990-01-01'), [
            'email' => 'registration-schema@example.com',
            'valid_id' => UploadedFile::fake()->createWithContent('id.pdf', "%PDF-1.4\nverified fixture"),
        ]);

        $this->post('/api/register', $payload)->assertCreated();

        $user = User::where('email', $payload['email'])->firstOrFail();
        $user->refresh();
        $this->assertSame('buyer', $user->role);
        $this->assertSame('pending', $user->status);
        $this->assertNull($user->email_verified_at);
        $this->assertNotNull($user->email_otp_hash);
        $this->assertNotNull($user->email_otp_expires_at);
        $this->assertSame(0, $user->email_otp_attempts);
        $this->assertTrue(CarbonImmutable::parse($user->email_otp_expires_at)->isFuture());
        $this->assertSame('NCR', $user->addresses()->firstOrFail()->region);
        $this->assertDatabaseHas('policy_acceptances', [
            'user_id' => $user->id,
            'policy_type' => 'terms',
            'policy_version' => '1.1',
        ]);
        $this->assertDatabaseHas('policy_acceptances', [
            'user_id' => $user->id,
            'policy_type' => 'privacy_notice',
            'policy_version' => '1.1',
        ]);

        Mail::assertSent(RegistrationOtpMail::class, function (RegistrationOtpMail $mail) use ($user): bool {
            return $mail->hasTo($user->email)
                && Hash::check($mail->otp, $user->email_otp_hash);
        });
    }

    public function test_registration_reports_email_delivery_failure_and_keeps_account_available_for_resend(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        Storage::fake('local');
        $payload = array_merge($this->buyerPayload('1990-01-01'), [
            'email' => 'registration-mail-failure@example.com',
            'valid_id' => UploadedFile::fake()->createWithContent('id.pdf', "%PDF-1.4\nverified fixture"),
        ]);
        $mailer = \Mockery::mock();
        Mail::shouldReceive('to')->once()->with($payload['email'])->andReturn($mailer);
        $mailer->shouldReceive('send')->once()->andThrow(new \RuntimeException('SMTP unavailable'));

        $this->post('/api/register', $payload)
            ->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('registration_saved', true);

        $this->assertDatabaseHas('users', [
            'email' => $payload['email'],
            'status' => 'pending',
            'email_verified_at' => null,
        ]);
        $this->assertNotNull(User::where('email', $payload['email'])->firstOrFail()->email_otp_hash);
    }

    public function test_resending_verification_reports_mail_delivery_failure(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $user = User::factory()->create([
            'email' => 'resend-mail-failure@example.com',
            'status' => 'pending',
            'email_verified_at' => null,
        ]);
        $mailer = \Mockery::mock();
        Mail::shouldReceive('to')->once()->with($user->email)->andReturn($mailer);
        $mailer->shouldReceive('send')->once()->andThrow(new \RuntimeException('SMTP unavailable'));

        $this->postJson('/api/resend-verification', ['email' => $user->email])
            ->assertStatus(503)
            ->assertJsonPath('success', false);
    }

    public function test_password_recovery_reports_mail_delivery_failure(): void
    {
        Password::shouldReceive('sendResetLink')
            ->once()
            ->with(['email' => 'reset-mail-failure@example.com'])
            ->andThrow(new \RuntimeException('SMTP unavailable'));

        $this->postJson('/api/forgot-password', ['email' => 'reset-mail-failure@example.com'])
            ->assertStatus(503)
            ->assertJsonPath('success', false);
    }

    public function test_role_specific_documents_cannot_be_omitted_from_api_requests(): void
    {
        $seller = array_merge($this->buyerPayload('1990-01-01'), [
            'email' => 'seller-docs@example.com', 'role' => 'seller',
            'business_name' => 'Local Shop', 'line_of_business' => 'Pet Supplies',
        ]);
        $this->postJson('/api/register', $seller)
            ->assertUnprocessable()->assertJsonValidationErrors(['valid_id', 'business_permit'])
            ->assertJsonMissingValidationErrors(['tin']);

        $courier = array_merge($this->buyerPayload('1990-01-01'), [
            'email' => 'courier-docs@example.com', 'role' => 'rider',
            'vehicle_type' => 'motorcycle', 'plate_number' => 'ABC1234',
        ]);
        $this->postJson('/api/register', $courier)
            ->assertUnprocessable()->assertJsonValidationErrors(['valid_id', 'or_cr', 'drivers_license'])
            ->assertJsonMissingValidationErrors(['tin']);
    }
}
