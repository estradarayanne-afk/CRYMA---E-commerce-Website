<?php

namespace Tests\Feature;

use App\Models\BuyerProfile;
use App\Models\CourierProfile;
use App\Models\SellerProfile;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RegistrationApprovalPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_approved_buyer_persists_after_list_reload_and_can_log_in(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = $this->pendingUser('buyer', 'approval-buyer@example.test');
        BuyerProfile::create(['user_id' => $buyer->id, 'sex' => 'prefer_not_to_say', 'birthday' => '1990-01-01']);
        $this->approvedDocument($buyer, 'valid_id');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/registrations/{$buyer->id}/approve")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('users', ['id' => $buyer->id, 'status' => 'active']);

        $this->getJson('/api/admin/registrations')
            ->assertOk()
            ->assertJsonPath('data.total', 0)
            ->assertJsonMissing(['id' => $buyer->id]);

        $this->getJson('/api/admin/users?role=buyer&status=active')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $buyer->id)
            ->assertJsonPath('data.data.0.status', 'active');

        $this->postJson('/api/login', [
            'email' => $buyer->email,
            'password' => 'approved-test-password',
        ])->assertOk()->assertJsonPath('user.role', 'buyer');
    }

    public function test_seller_and_rider_require_their_role_specific_approved_documents(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $seller = $this->pendingUser('seller', 'approval-seller@example.test');
        SellerProfile::create([
            'user_id' => $seller->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
            'business_name' => 'Test Shop',
            'line_of_business' => 'Test goods',
        ]);
        $this->approvedDocument($seller, 'valid_id');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/registrations/{$seller->id}/approve")
            ->assertUnprocessable();
        $this->assertSame('pending', $seller->fresh()->status);

        $this->approvedDocument($seller, 'business_permit');
        $this->patchJson("/api/admin/registrations/{$seller->id}/approve")
            ->assertOk()->assertJsonPath('data.status', 'active');

        $rider = $this->pendingUser('rider', 'approval-rider@example.test');
        $profile = CourierProfile::create([
            'user_id' => $rider->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
        ]);
        Vehicle::create(['courier_profile_id' => $profile->id, 'vehicle_type' => 'motorcycle', 'plate_number' => 'TEST123']);
        $this->approvedDocument($rider, 'valid_id');
        $this->approvedDocument($rider, 'or_cr');

        $this->patchJson("/api/admin/registrations/{$rider->id}/approve")
            ->assertUnprocessable();
        $this->assertSame('pending', $rider->fresh()->status);

        $this->approvedDocument($rider, 'drivers_license');
        $this->patchJson("/api/admin/registrations/{$rider->id}/approve")
            ->assertOk()->assertJsonPath('data.status', 'active');
    }

    public function test_unverified_accounts_and_unauthorized_approvers_remain_restricted(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = $this->pendingUser('buyer', 'unverified-approval@example.test', false);
        BuyerProfile::create(['user_id' => $buyer->id, 'sex' => 'prefer_not_to_say', 'birthday' => '1990-01-01']);
        $this->approvedDocument($buyer, 'valid_id');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/registrations/{$buyer->id}/approve")
            ->assertUnprocessable()
            ->assertJsonPath('success', false);
        $this->assertSame('pending', $buyer->fresh()->status);

        $otherBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->actingAs($otherBuyer, 'sanctum')
            ->patchJson("/api/admin/registrations/{$buyer->id}/approve")
            ->assertForbidden();
        $this->assertSame('pending', $buyer->fresh()->status);
    }

    public function test_admin_user_status_endpoint_persists_validated_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = $this->pendingUser('buyer', 'status-endpoint@example.test');
        BuyerProfile::create(['user_id' => $buyer->id, 'sex' => 'prefer_not_to_say', 'birthday' => '1990-01-01']);
        $this->approvedDocument($buyer, 'valid_id');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$buyer->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('users', ['id' => $buyer->id, 'status' => 'active']);
    }

    private function pendingUser(string $role, string $email, bool $verified = true): User
    {
        return User::forceCreate([
            'first_name' => 'Approval',
            'last_name' => 'Test',
            'email' => $email,
            'phone' => null,
            'password' => Hash::make('approved-test-password'),
            'role' => $role,
            'status' => 'pending',
            'email_verified_at' => $verified ? now() : null,
        ]);
    }

    private function approvedDocument(User $user, string $type): void
    {
        UserDocument::create([
            'user_id' => $user->id,
            'document_type' => $type,
            'file_path' => "registration-documents/{$user->id}/{$type}.pdf",
            'original_file_name' => "{$type}.pdf",
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'status' => 'approved',
        ]);
    }
}
