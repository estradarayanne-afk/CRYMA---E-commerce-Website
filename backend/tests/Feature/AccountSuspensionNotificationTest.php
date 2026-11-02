<?php

namespace Tests\Feature;

use App\Mail\AccountReactivationMail;
use App\Mail\AccountSuspensionMail;
use App\Models\User;
use App\Models\UserDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Tests\TestCase;

class AccountSuspensionNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_seller_and_rider_receive_suspension_notifications(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        foreach (['buyer', 'seller', 'rider'] as $role) {
            $user = User::factory()->create([
                'role' => $role,
                'status' => 'active',
                'first_name' => ucfirst($role).' Example',
                'last_name' => 'Tester',
            ]);

            $this->actingAs($admin, 'sanctum')
                ->patchJson("/api/admin/users/{$user->id}/status", [
                    'status' => 'suspended',
                    'suspension_reason' => 'Fictional policy review',
                ])
                ->assertOk()
                ->assertJsonPath('data.status', 'suspended');

            $this->assertSame('suspended', $user->fresh()->status);
        }

        Mail::assertSent(AccountSuspensionMail::class, 3);
        foreach (['buyer', 'seller', 'rider'] as $role) {
            $user = User::query()->where('role', $role)->firstOrFail();
            Mail::assertSent(AccountSuspensionMail::class, fn (AccountSuspensionMail $mail): bool => $mail->hasTo($user->email)
                && $mail->userName === ucfirst($role).' Example Tester'
                && $mail->reason === 'Fictional policy review'
                && $mail->suspendedAt !== null
                && $mail->envelope()->subject === 'CRYMA Account Suspension Notification'
                && str_contains($mail->render(), 'Your CRYMA Account Has Been Suspended')
                && str_contains($mail->render(), 'Fictional policy review')
            );
        }
    }

    public function test_suspension_without_reason_sends_email_without_reason_section(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$buyer->id}/status", ['status' => 'suspended'])
            ->assertOk();

        Mail::assertSent(AccountSuspensionMail::class, function (AccountSuspensionMail $mail) use ($buyer): bool {
            $this->assertTrue($mail->hasTo($buyer->email));
            $this->assertNull($mail->reason);
            $this->assertStringNotContainsString('Reason for suspension', $mail->render());

            return true;
        });
    }

    public function test_repeated_suspension_request_does_not_send_duplicate_email(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum');
        $this->patchJson("/api/admin/users/{$buyer->id}/status", ['status' => 'suspended'])->assertOk();
        $this->patchJson("/api/admin/users/{$buyer->id}/status", [
            'status' => 'suspended',
            'suspension_reason' => 'Updated follow-up reason',
        ])->assertOk();

        Mail::assertSent(AccountSuspensionMail::class, 1);
        $this->assertSame('suspended', $buyer->fresh()->status);
        $this->assertSame('Updated follow-up reason', $buyer->fresh()->suspension_reason);
    }

    public function test_suspended_account_reactivation_sends_notification_once(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'suspended']);
        UserDocument::create([
            'user_id' => $buyer->id,
            'document_type' => 'valid_id',
            'file_path' => 'fictional/approved-id.pdf',
            'original_file_name' => 'fictional-id.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'status' => 'approved',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$buyer->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->patchJson("/api/admin/users/{$buyer->id}/status", ['status' => 'active'])
            ->assertOk();

        $this->assertSame('active', $buyer->fresh()->status);
        Mail::assertSent(AccountReactivationMail::class, 1);
        Mail::assertSent(AccountReactivationMail::class, function (AccountReactivationMail $mail) use ($buyer): bool {
            return $mail->hasTo($buyer->email)
                && $mail->userName === $buyer->first_name.' '.$buyer->last_name
                && $mail->reactivatedAt !== null
                && $mail->envelope()->subject === 'CRYMA Account Reactivation Notification'
                && str_contains($mail->render(), 'Your CRYMA Account Has Been Reactivated');
        });
    }

    public function test_reactivation_email_failure_does_not_reverse_account_activation(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'suspended']);
        UserDocument::create([
            'user_id' => $buyer->id,
            'document_type' => 'valid_id',
            'file_path' => 'fictional/approved-id.pdf',
            'original_file_name' => 'fictional-id.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'status' => 'approved',
        ]);

        Mail::shouldReceive('to')
            ->once()
            ->with($buyer->email)
            ->andThrow(new RuntimeException('fictional SMTP failure'));
        Log::shouldReceive('warning')
            ->once()
            ->with('Account reactivation notification email delivery failed.', [
                'user_id' => $buyer->id,
                'exception_class' => RuntimeException::class,
            ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$buyer->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertSame('active', $buyer->fresh()->status);
    }

    public function test_mail_failure_is_logged_and_does_not_reverse_suspension(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        Mail::shouldReceive('to')
            ->once()
            ->with($buyer->email)
            ->andThrow(new RuntimeException('fictional SMTP failure'));
        Log::shouldReceive('warning')
            ->once()
            ->with('Account suspension notification email delivery failed.', [
                'user_id' => $buyer->id,
                'exception_class' => RuntimeException::class,
            ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$buyer->id}/status", [
                'status' => 'suspended',
                'suspension_reason' => 'Fictional reason',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        $this->assertSame('suspended', $buyer->fresh()->status);
    }
}
