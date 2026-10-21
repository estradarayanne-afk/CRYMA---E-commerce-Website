<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\LogisticsProfile;
use App\Models\Order;
use App\Models\User;
use App\Models\UserDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LogisticsRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_logistics_registration_requires_business_name_and_both_documents(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $payload = $this->registrationPayload();

        $this->postJson('/api/register', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['business_name', 'valid_id', 'business_permit']);
    }

    public function test_logistics_application_is_pending_until_admin_approves_required_documents(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        Storage::fake('local');
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $payload = array_merge($this->registrationPayload(), [
            'business_name' => 'North Sorting Center',
            'valid_id' => UploadedFile::fake()->createWithContent('id.pdf', "%PDF-1.4\nidentity"),
            'business_permit' => UploadedFile::fake()->createWithContent('permit.pdf', "%PDF-1.4\npermit"),
        ]);

        $this->post('/api/register', $payload)->assertCreated()
            ->assertJsonPath('data.role', 'logistics')
            ->assertJsonPath('data.status', 'pending');

        $user = User::where('email', $payload['email'])->firstOrFail();
        $this->assertInstanceOf(LogisticsProfile::class, $user->logisticsProfile);
        $this->assertSame('North Sorting Center', $user->logisticsProfile->business_name);
        $this->assertDatabaseHas('user_documents', ['user_id' => $user->id, 'document_type' => 'valid_id', 'status' => 'pending']);
        $this->assertDatabaseHas('user_documents', ['user_id' => $user->id, 'document_type' => 'business_permit', 'status' => 'pending']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/registrations?role=logistics')
            ->assertOk()
            ->assertJsonPath('data.data.0.logistics_profile.business_name', 'North Sorting Center');

        $user->forceFill(['email_verified_at' => now()])->save();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/registrations/{$user->id}/approve")
            ->assertUnprocessable();
        $this->assertSame('pending', $user->fresh()->status);

        UserDocument::where('user_id', $user->id)->update(['status' => 'approved']);
        $this->actingAs($admin, 'sanctum');
        $this->patchJson("/api/admin/registrations/{$user->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.role', 'logistics')
            ->assertJsonPath('data.status', 'active');

        $login = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])
            ->assertOk()
            ->assertJsonPath('user.role', 'logistics');

        $adminQueue = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/logistics');
        $adminQueue->assertOk();
        $this->app['auth']->forgetGuards();
        $dashboard = $this->withToken($login->json('token'))->getJson('/api/logistics/dashboard');
        $dashboard
            ->assertOk()
            ->assertJsonPath('data.pickups_awaiting_assignment', 0)
            ->assertJsonPath('data.incoming_parcels', 0)
            ->assertJsonPath('data.parcels_awaiting_sorting', 0)
            ->assertJsonPath('data.parcels_ready_for_dispatch', 0)
            ->assertJsonPath('data.deliveries_in_progress', 0)
            ->assertJsonPath('data.completed_deliveries', 0)
            ->assertJsonPath('data.failed_deliveries', 0);

        $this->getJson('/api/admin/logistics')->assertForbidden();
        $this->getJson('/api/admin/documents/' . UserDocument::where('user_id', $user->id)->firstOrFail()->id)->assertForbidden();
        $this->getJson('/api/courier/pickups')->assertForbidden();
    }

    public function test_pending_rejected_and_suspended_logistics_accounts_cannot_use_logistics_api(): void
    {
        foreach (['pending', 'rejected', 'suspended'] as $status) {
            $user = $this->logisticsUser("{$status}@example.test", $status);
            $this->actingAs($user, 'sanctum')
                ->getJson('/api/logistics/dashboard')
                ->assertForbidden();

            $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])
                ->assertForbidden();
        }
    }

    public function test_dashboard_endpoint_is_not_available_to_admin_or_courier_roles(): void
    {
        foreach (['admin', 'seller', 'buyer', 'rider'] as $role) {
            $user = User::factory()->create(['role' => $role, 'status' => 'active']);
            $this->actingAs($user, 'sanctum')
                ->getJson('/api/logistics/dashboard')
                ->assertForbidden();
        }
    }

    public function test_admin_can_reject_a_logistics_application_and_rejected_account_cannot_log_in(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $applicant = $this->logisticsUser('rejected-applicant@example.test', 'pending');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/registrations/{$applicant->id}/reject")
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $this->assertSame('rejected', $applicant->fresh()->status);
        $this->postJson('/api/login', ['email' => $applicant->email, 'password' => 'password123'])
            ->assertForbidden();
    }

    public function test_dashboard_counts_are_derived_from_existing_order_and_delivery_statuses(): void
    {
        $user = $this->logisticsUser('metrics@example.test', 'active');
        $this->createOrderWithStatus('READY_FOR_PICKUP');
        $nonQueueReadyOrder = $this->createOrderWithStatus('READY_FOR_PICKUP');
        Delivery::create([
            'order_id' => $nonQueueReadyOrder->id,
            'status' => 'READY_FOR_PICKUP',
            'legacy_imported' => false,
        ]);

        foreach ([
            Delivery::PICKED_UP,
            Delivery::AT_SORTING_CENTER,
            Delivery::SORTED,
            Delivery::OUT_FOR_DELIVERY,
            Delivery::DELIVERED,
            Delivery::COMPLETED,
            Delivery::FAILED,
        ] as $status) {
            $order = $this->createOrderWithStatus($status);
            Delivery::create(['order_id' => $order->id, 'status' => $status]);
        }

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/logistics/dashboard')
            ->assertOk()
            ->assertJsonPath('data.pickups_awaiting_assignment', 1)
            ->assertJsonPath('data.incoming_parcels', 1)
            ->assertJsonPath('data.parcels_awaiting_sorting', 1)
            ->assertJsonPath('data.parcels_ready_for_dispatch', 1)
            ->assertJsonPath('data.deliveries_in_progress', 1)
            ->assertJsonPath('data.completed_deliveries', 2)
            ->assertJsonPath('data.failed_deliveries', 1);
    }

    public function test_admin_cannot_grant_logistics_role_outside_registration_approval(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$buyer->id}", ['role' => 'logistics'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Logistics access must be granted through the approved registration workflow.');
        $this->assertSame('buyer', $buyer->fresh()->role);
    }

    private function registrationPayload(): array
    {
        return [
            'first_name' => 'Logistics',
            'middle_name' => 'A',
            'last_name' => 'Applicant',
            'email' => 'logistics-application@example.test',
            'phone' => '09123456789',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'terms_accepted' => '1',
            'terms_version' => '1.1',
            'privacy_notice_acknowledged' => '1',
            'privacy_version' => '1.1',
            'role' => 'logistics',
            'sex' => 'female',
            'birthday' => '1990-01-01',
            'region' => 'NCR',
            'province' => 'Metro Manila',
            'municipality' => 'Manila',
            'barangay' => 'Sample',
            'street' => 'Rizal Street',
            'house_number' => '12',
            'postal_code' => '1000',
        ];
    }

    private function logisticsUser(string $email, string $status): User
    {
        $user = User::forceCreate([
            'first_name' => 'Logistics',
            'last_name' => 'Staff',
            'email' => $email,
            'password' => Hash::make('password123'),
            'role' => 'logistics',
            'status' => $status,
            'email_verified_at' => now(),
        ]);
        LogisticsProfile::create([
            'user_id' => $user->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
            'business_name' => 'Test Sorting Center',
        ]);

        return $user;
    }

    private function createOrderWithStatus(string $status): Order
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        return Order::create([
            'buyer_id' => $buyer->id,
            'delivery_address' => 'Test address',
            'payment_method' => 'cash_on_delivery',
            'subtotal' => 100,
            'shipping_fee' => 0,
            'total_amount' => 100,
            'status' => $status,
        ]);
    }
}
