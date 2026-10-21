<?php

namespace Tests\Feature;

use App\Mail\CourierApplicationDecisionMail;
use App\Models\CourierProfile;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LogisticsRiderManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_active_logistics_users_can_view_pending_rider_applications(): void
    {
        $logistics = $this->logisticsUser();
        $pendingRider = $this->rider();
        $this->rider(status: 'active');
        User::factory()->create(['role' => 'seller', 'status' => 'pending']);

        $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/riders')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $pendingRider->id)
            ->assertJsonMissingPath('data.data.0.documents.0.file_path');

        $this->actingAs(User::factory()->create(['role' => 'admin', 'status' => 'active']), 'sanctum')
            ->getJson('/api/logistics/riders')
            ->assertForbidden();
        $this->actingAs($this->rider(status: 'active'), 'sanctum')
            ->getJson('/api/logistics/riders')
            ->assertForbidden();
        $this->actingAs($this->logisticsUser(status: 'suspended'), 'sanctum')
            ->getJson('/api/logistics/riders')
            ->assertForbidden();
    }

    public function test_logistics_can_review_only_pending_rider_documents(): void
    {
        Storage::fake('local');
        $logistics = $this->logisticsUser();
        [$rider, $documents] = $this->riderWithDocuments();
        $document = $documents['valid_id'];
        Storage::disk('local')->put($document->file_path, 'private id document');

        $this->actingAs($logistics, 'sanctum')
            ->get("/api/logistics/riders/{$rider->id}/documents/{$document->id}")
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->patchJson("/api/logistics/riders/{$rider->id}/documents/{$document->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->patchJson("/api/logistics/riders/{$rider->id}/documents/{$documents['or_cr']->id}/reject", [
            'rejection_reason' => 'The registration number is not readable.',
        ])->assertOk()->assertJsonPath('data.rejection_reason', 'The registration number is not readable.');

        $seller = User::factory()->create(['role' => 'seller', 'status' => 'pending']);
        $sellerDocument = UserDocument::create([
            'user_id' => $seller->id,
            'document_type' => 'valid_id',
            'file_path' => 'registration-documents/' . $seller->id . '/other.pdf',
            'original_file_name' => 'other.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 10,
            'status' => 'pending',
        ]);
        $this->getJson("/api/logistics/riders/{$seller->id}/documents/{$sellerDocument->id}")->assertNotFound();
    }

    public function test_application_approval_requires_email_and_all_documents_and_sends_notification(): void
    {
        Mail::fake();
        $logistics = $this->logisticsUser();
        [$rider, $documents] = $this->riderWithDocuments(verified: false);

        $this->actingAs($logistics, 'sanctum')
            ->patchJson("/api/logistics/riders/{$rider->id}/approve")
            ->assertUnprocessable();
        $this->assertSame('pending', $rider->fresh()->status);

        $rider->forceFill(['email_verified_at' => now()])->save();
        $this->patchJson("/api/logistics/riders/{$rider->id}/approve")->assertUnprocessable();

        foreach ($documents as $document) {
            $document->update(['status' => 'approved']);
        }

        $this->patchJson("/api/logistics/riders/{$rider->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('notification_sent', true);
        Mail::assertSent(CourierApplicationDecisionMail::class, fn ($mail) =>
            $mail->approved && $mail->hasTo($rider->email));
    }

    public function test_rejection_requires_a_reason_and_sends_it_in_the_email_notification(): void
    {
        Mail::fake();
        $logistics = $this->logisticsUser();
        $rider = $this->rider();
        $this->actingAs($logistics, 'sanctum');

        $this->patchJson("/api/logistics/riders/{$rider->id}/reject", ['rejection_reason' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('rejection_reason');
        $this->assertSame('pending', $rider->fresh()->status);

        $reason = 'The submitted driver license could not be verified.';
        $this->patchJson("/api/logistics/riders/{$rider->id}/reject", ['rejection_reason' => $reason])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('notification_sent', true);

        Mail::assertSent(CourierApplicationDecisionMail::class, fn ($mail) =>
            !$mail->approved
            && $mail->rejectionReason === $reason
            && str_contains($mail->render(), $reason)
            && $mail->hasTo($rider->email));
        $this->assertDatabaseHas('users', ['id' => $rider->id, 'status' => 'rejected']);
        $this->actingAs($rider, 'sanctum')->getJson('/api/courier/pickups')->assertForbidden();
    }

    public function test_pending_rejected_inactive_or_ineligible_riders_cannot_use_courier_operations(): void
    {
        foreach (['pending', 'rejected', 'suspended'] as $status) {
            [$rider] = $this->riderWithDocuments(status: $status, approvedDocuments: true);
            $this->actingAs($rider, 'sanctum')->getJson('/api/courier/pickups')->assertForbidden();
        }

        [$activeWithoutApprovedDocuments] = $this->riderWithDocuments(status: 'active', approvedDocuments: false);
        $this->actingAs($activeWithoutApprovedDocuments, 'sanctum')
            ->getJson('/api/courier/pickups')
            ->assertForbidden();
    }

    private function logisticsUser(string $status = 'active'): User
    {
        return User::factory()->create([
            'role' => 'logistics',
            'status' => $status,
            'email_verified_at' => now(),
        ]);
    }

    private function rider(string $status = 'pending'): User
    {
        return User::factory()->create([
            'role' => 'rider',
            'status' => $status,
            'email_verified_at' => now(),
        ]);
    }

    private function riderWithDocuments(
        string $status = 'pending',
        bool $verified = true,
        bool $approvedDocuments = false,
    ): array {
        $rider = User::factory()->create([
            'role' => 'rider',
            'status' => $status,
            'email_verified_at' => $verified ? now() : null,
        ]);
        $profile = CourierProfile::create([
            'user_id' => $rider->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
        ]);
        Vehicle::create([
            'courier_profile_id' => $profile->id,
            'vehicle_type' => 'motorcycle',
            'plate_number' => 'TEST' . str_pad((string) $profile->id, 6, '0', STR_PAD_LEFT),
        ]);

        $documents = [];
        foreach (['valid_id', 'or_cr', 'drivers_license'] as $type) {
            $documents[$type] = UserDocument::create([
                'user_id' => $rider->id,
                'document_type' => $type,
                'file_path' => "registration-documents/{$rider->id}/{$type}.pdf",
                'original_file_name' => "{$type}.pdf",
                'mime_type' => 'application/pdf',
                'file_size' => 128,
                'status' => $approvedDocuments ? 'approved' : 'pending',
            ]);
        }

        return [$rider, $documents];
    }
}
