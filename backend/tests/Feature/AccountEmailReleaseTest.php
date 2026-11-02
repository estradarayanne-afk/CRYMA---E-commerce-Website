<?php

namespace Tests\Feature;

use App\Mail\RegistrationOtpMail;
use App\Models\Commission;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PolicyAcceptance;
use App\Models\Product;
use App\Models\User;
use App\Models\UserDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AccountEmailReleaseTest extends TestCase
{
    use RefreshDatabase;

    private const AUTHORIZED_EMAILS = ['rayannesheesh@gmail.com', 'estradarayanne@gmail.com'];

    public function test_admin_can_archive_rejected_account_release_email_and_preserve_history_for_new_otp_registration(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $oldBuyer = $this->user(self::AUTHORIZED_EMAILS[0], 'buyer', 'rejected');
        $seller = $this->user('history-seller@example.test', 'seller', 'active');
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Historical fixture product',
            'description' => 'Synthetic test data',
            'price' => 100,
            'stock' => 1,
            'category' => 'Test',
            'status' => 'inactive',
        ]);
        $order = Order::create([
            'buyer_id' => $oldBuyer->id,
            'subtotal' => 100,
            'shipping_fee' => 5,
            'total_amount' => 105,
            'status' => 'COMPLETED',
        ]);
        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'seller_id' => $seller->id,
            'quantity' => 1,
            'unit_price' => 100,
            'subtotal' => 100,
        ]);
        $commission = Commission::create([
            'order_id' => $order->id,
            'seller_id' => $seller->id,
            'order_amount' => 100,
            'commission_rate' => 10,
            'commission_amount' => 10,
            'seller_earnings' => 90,
            'status' => 'paid',
        ]);
        $acceptance = PolicyAcceptance::create([
            'user_id' => $oldBuyer->id,
            'policy_type' => 'terms',
            'policy_version' => '1.1',
            'accepted_at' => now(),
        ]);
        $document = UserDocument::create([
            'user_id' => $oldBuyer->id,
            'document_type' => 'valid_id',
            'file_path' => "synthetic/{$oldBuyer->id}/id.pdf",
            'original_file_name' => 'fictional-id.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 32,
            'status' => 'approved',
        ]);
        DB::table('password_reset_tokens')->insert([
            'email' => $oldBuyer->email,
            'token' => 'synthetic-reset-token',
            'created_at' => now(),
        ]);
        DB::table('sessions')->insert([
            'id' => 'synthetic-session',
            'user_id' => $oldBuyer->id,
            'payload' => 'synthetic-payload',
            'last_activity' => now()->timestamp,
        ]);
        $oldBuyer->createToken('synthetic-token');

        Mail::fake();
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$oldBuyer->id}/release-email", [
                'email_confirmation' => $oldBuyer->email,
                'reason_code' => 'incorrect_rejection',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user_id', $oldBuyer->id);

        Mail::assertNothingOutgoing();
        $oldBuyer->refresh();
        $this->assertNotNull($oldBuyer->account_archived_at);
        $this->assertSame('rejected', $oldBuyer->status);
        $this->assertStringEndsWith('@accounts.invalid', $oldBuyer->email);
        $this->assertNull($oldBuyer->email_otp_hash);
        $this->assertSame(0, $oldBuyer->email_otp_attempts);
        $this->assertDatabaseHas('account_email_releases', [
            'user_id' => $oldBuyer->id,
            'released_by' => $admin->id,
            'original_email' => self::AUTHORIZED_EMAILS[0],
            'reason_code' => 'incorrect_rejection',
        ]);
        $this->assertSame(self::AUTHORIZED_EMAILS[0], DB::table('account_email_releases')->where('user_id', $oldBuyer->id)->value('original_email'));
        $this->assertNotSame($oldBuyer->email, DB::table('account_email_releases')->where('user_id', $oldBuyer->id)->value('email_fingerprint'));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => self::AUTHORIZED_EMAILS[0]]);
        $this->assertDatabaseMissing('sessions', ['id' => 'synthetic-session']);
        $this->assertSame(0, $oldBuyer->tokens()->count());

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'buyer_id' => $oldBuyer->id, 'total_amount' => 105]);
        $this->assertDatabaseHas('order_items', ['id' => $item->id, 'order_id' => $order->id, 'seller_id' => $seller->id]);
        $this->assertDatabaseHas('commissions', ['id' => $commission->id, 'order_id' => $order->id, 'seller_id' => $seller->id, 'status' => 'paid']);
        $this->assertDatabaseHas('policy_acceptances', ['id' => $acceptance->id, 'user_id' => $oldBuyer->id]);
        $this->assertDatabaseHas('user_documents', ['id' => $document->id, 'user_id' => $oldBuyer->id]);

        Storage::fake('local');
        $this->post('/api/register', $this->buyerPayload(self::AUTHORIZED_EMAILS[0]))
            ->assertCreated();
        $newBuyer = User::query()->where('email', self::AUTHORIZED_EMAILS[0])->firstOrFail();
        $this->assertNotSame($oldBuyer->id, $newBuyer->id);
        $this->assertSame('pending', $newBuyer->status);
        $this->assertNull($newBuyer->email_verified_at);
        $this->assertNotNull($newBuyer->email_otp_hash);
        Mail::assertSent(RegistrationOtpMail::class, fn (RegistrationOtpMail $mail): bool => $mail->hasTo(self::AUTHORIZED_EMAILS[0]));

        $this->postJson('/api/verify-email', [
            'email' => $newBuyer->email,
            'otp' => $this->sentOtp(self::AUTHORIZED_EMAILS[0]),
        ])->assertOk()->assertJsonPath('data.email_verified', true);

        $this->postJson('/api/login', ['email' => $newBuyer->email, 'password' => 'NewBuyerPassword123'])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/documents/'.$newBuyer->documents()->firstOrFail()->id.'/approve')
            ->assertOk();
        $this->patchJson("/api/admin/registrations/{$newBuyer->id}/approve")
            ->assertOk()->assertJsonPath('data.status', 'active');
        $this->postJson('/api/login', ['email' => $newBuyer->email, 'password' => 'NewBuyerPassword123'])
            ->assertOk()->assertJsonPath('user.role', 'buyer')->assertJsonStructure(['token', 'user']);
    }

    public function test_release_is_admin_only_and_refuses_active_suspended_or_open_order_accounts(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $active = $this->user(self::AUTHORIZED_EMAILS[0], 'buyer', 'active');
        $pending = $this->user(self::AUTHORIZED_EMAILS[1], 'buyer', 'pending');
        $openOrder = Order::create([
            'buyer_id' => $pending->id,
            'subtotal' => 10,
            'shipping_fee' => 0,
            'total_amount' => 10,
            'status' => 'PENDING',
        ]);

        $this->postJson("/api/admin/users/{$active->id}/release-email", [
            'email_confirmation' => $active->email,
            'reason_code' => 'other_approved_reason',
        ])->assertUnauthorized();

        $this->actingAs($admin, 'sanctum');
        $this->postJson("/api/admin/users/{$active->id}/release-email", [
            'email_confirmation' => $active->email,
            'reason_code' => 'other_approved_reason',
        ])->assertStatus(409);
        $active->forceFill(['status' => 'suspended'])->save();
        $this->postJson("/api/admin/users/{$active->id}/release-email", [
            'email_confirmation' => $active->email,
            'reason_code' => 'other_approved_reason',
        ])->assertStatus(409);

        $this->postJson("/api/admin/users/{$pending->id}/release-email", [
            'email_confirmation' => $pending->email,
            'reason_code' => 'applicant_requested',
        ])->assertStatus(409);

        $this->assertSame('suspended', $active->fresh()->status);
        $this->assertSame('pending', $pending->fresh()->status);
        $this->assertDatabaseHas('orders', ['id' => $openOrder->id, 'buyer_id' => $pending->id]);
        $this->assertDatabaseCount('account_email_releases', 0);
    }

    public function test_release_requires_matching_email_and_a_valid_reason(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $candidate = $this->user(self::AUTHORIZED_EMAILS[0], 'buyer', 'rejected');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$candidate->id}/release-email", [
                'email_confirmation' => 'different@example.test',
                'reason_code' => 'applicant_requested',
            ])->assertStatus(422);

        $this->postJson("/api/admin/users/{$candidate->id}/release-email", [
            'email_confirmation' => $candidate->email,
            'reason_code' => 'not-an-approved-reason',
        ])->assertUnprocessable();

        $this->assertNull($candidate->fresh()->account_archived_at);
        $this->assertDatabaseCount('account_email_releases', 0);
    }

    public function test_release_rejects_every_email_outside_the_two_address_allowlist(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $candidate = $this->user('unapproved-release@example.test', 'buyer', 'rejected');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$candidate->id}/release-email", [
                'email_confirmation' => $candidate->email,
                'reason_code' => 'applicant_requested',
            ])->assertForbidden();

        $this->assertSame('unapproved-release@example.test', $candidate->fresh()->email);
        $this->assertNull($candidate->fresh()->account_archived_at);
        $this->assertDatabaseCount('account_email_releases', 0);
    }

    public function test_archived_account_cannot_be_activated_and_unrelated_users_can_still_login(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $archived = $this->user(self::AUTHORIZED_EMAILS[0], 'buyer', 'rejected');
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$archived->id}/release-email", [
                'email_confirmation' => $archived->email,
                'reason_code' => 'incorrect_rejection',
            ])->assertOk();

        $this->patchJson("/api/admin/users/{$archived->id}/status", ['status' => 'active'])->assertStatus(409);
        $this->patchJson("/api/admin/registrations/{$archived->id}/approve")->assertNotFound();
        $this->patchJson("/api/admin/users/{$archived->id}", ['first_name' => 'Changed'])->assertStatus(409);

        $unrelated = $this->user('unrelated-login@example.test', 'buyer', 'active');
        $this->postJson('/api/login', ['email' => $unrelated->email, 'password' => 'NewBuyerPassword123'])
            ->assertOk()->assertJsonPath('user.id', $unrelated->id);
    }

    public function test_release_refuses_multiple_case_insensitive_account_matches(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $first = $this->user(self::AUTHORIZED_EMAILS[0], 'buyer', 'rejected');
        $second = $this->user('RayanneSheesh@gmail.com', 'buyer', 'pending');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$first->id}/release-email", [
                'email_confirmation' => $first->email,
                'reason_code' => 'duplicate_registration',
            ])
            ->assertStatus(409);

        $this->assertNull($first->fresh()->account_archived_at);
        $this->assertNull($second->fresh()->account_archived_at);
        $this->assertDatabaseCount('account_email_releases', 0);
    }

    public function test_archived_accounts_cannot_login_verify_resend_otp_or_reset_password(): void
    {
        // Rate-limit counters are covered elsewhere; isolate this feature test
        // from process-shared limiter state so it asserts the archived-account path.
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $archived = $this->user(self::AUTHORIZED_EMAILS[0], 'buyer', 'rejected');
        $passwordHash = $archived->password;

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$archived->id}/release-email", [
                'email_confirmation' => $archived->email,
                'reason_code' => 'applicant_requested',
            ])->assertOk();

        $archived->refresh();
        Mail::fake();

        $this->postJson('/api/login', ['email' => $archived->email, 'password' => 'NewBuyerPassword123'])
            ->assertUnauthorized();
        $this->postJson('/api/resend-verification', ['email' => $archived->email])
            ->assertOk()->assertJsonPath('success', true);
        $this->postJson('/api/verify-email', ['email' => $archived->email, 'otp' => '123456'])
            ->assertStatus(422);
        $this->postJson('/api/forgot-password', ['email' => $archived->email])
            ->assertOk()->assertJsonPath('success', true);

        $token = Password::createToken($archived);
        $this->postJson('/api/reset-password', [
            'email' => $archived->email,
            'token' => $token,
            'password' => 'ChangedPassword123',
            'password_confirmation' => 'ChangedPassword123',
        ])->assertStatus(422);

        Mail::assertNothingOutgoing();
        $this->assertSame($passwordHash, $archived->fresh()->password);
    }

    public function test_password_recovery_for_archived_account_is_generic_and_never_changes_its_password(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $archived = $this->user(self::AUTHORIZED_EMAILS[1], 'buyer', 'rejected');
        $originalPassword = $archived->password;

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$archived->id}/release-email", [
                'email_confirmation' => $archived->email,
                'reason_code' => 'applicant_requested',
            ])->assertOk();

        $archived->refresh();
        Mail::fake();
        $this->postJson('/api/forgot-password', ['email' => $archived->email])
            ->assertOk()
            ->assertJsonPath('success', true);

        $token = Password::createToken($archived);
        $this->postJson('/api/reset-password', [
            'email' => $archived->email,
            'token' => $token,
            'password' => 'ChangedPassword123',
            'password_confirmation' => 'ChangedPassword123',
        ])->assertStatus(422);

        Mail::assertNothingOutgoing();
        $this->assertSame($originalPassword, $archived->fresh()->password);
    }

    public function test_release_refuses_unsettled_or_incomplete_payouts_but_allows_a_fully_settled_payout(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $settledSeller = $this->user(self::AUTHORIZED_EMAILS[0], 'seller', 'rejected');
        $legacyPaidSeller = $this->user(self::AUTHORIZED_EMAILS[1], 'seller', 'rejected');
        $buyer = $this->user('commission-buyer@example.test', 'buyer', 'active');

        $commissionFor = function (User $seller, string $status, bool $completePayout, bool $partialPayout = false) use ($buyer, $admin): Commission {
            $order = Order::create([
                'buyer_id' => $buyer->id,
                'subtotal' => 100,
                'shipping_fee' => 0,
                'total_amount' => 100,
                'status' => 'COMPLETED',
            ]);
            $product = Product::create([
                'seller_id' => $seller->id,
                'name' => 'Synthetic historical product',
                'description' => 'Synthetic fixture',
                'price' => 100,
                'stock' => 0,
                'category' => 'Test',
                'status' => 'inactive',
            ]);
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'seller_id' => $seller->id,
                'quantity' => 1,
                'unit_price' => 100,
                'subtotal' => 100,
            ]);
            return Commission::create([
                'order_id' => $order->id,
                'seller_id' => $seller->id,
                'order_amount' => 100,
                'commission_rate' => 10,
                'commission_amount' => 10,
                'seller_earnings' => 90,
                'status' => $status,
                'payout_method' => $completePayout ? 'bank_transfer' : null,
                'payout_reference' => $completePayout ? 'SYNTHETIC-REFERENCE' : ($partialPayout ? 'INCOMPLETE-REFERENCE' : null),
                'paid_by' => $completePayout ? $admin->id : null,
                'paid_at' => $completePayout ? now() : null,
                'payout_amount' => $completePayout ? 90 : null,
            ]);
        };

        $settledCommission = $commissionFor($settledSeller, 'pending', false);
        $legacyCommission = $commissionFor($legacyPaidSeller, 'paid', false, true);

        $this->actingAs($admin, 'sanctum');
        $this->assertReleaseBlocked($settledSeller);
        $settledCommission->update([
            'status' => 'paid', 'payout_method' => 'bank_transfer', 'payout_reference' => 'SYNTHETIC-REFERENCE',
            'paid_by' => $admin->id, 'paid_at' => now(), 'payout_amount' => 90,
        ]);
        $this->postJson("/api/admin/users/{$settledSeller->id}/release-email", [
            'email_confirmation' => $settledSeller->email,
            'reason_code' => 'applicant_requested',
        ])->assertOk();

        $this->assertReleaseBlocked($legacyPaidSeller);
        $legacyCommission->update([
            'payout_method' => null, 'payout_reference' => null, 'paid_by' => null, 'paid_at' => null, 'payout_amount' => null,
        ]);
        $this->postJson("/api/admin/users/{$legacyPaidSeller->id}/release-email", [
            'email_confirmation' => $legacyPaidSeller->email,
            'reason_code' => 'applicant_requested',
        ])->assertOk();

        $this->assertDatabaseCount('account_email_releases', 2);
        $this->assertDatabaseCount('commissions', 2);
    }

    public function test_release_refuses_a_rider_with_an_open_delivery_assignment(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $rider = $this->user(self::AUTHORIZED_EMAILS[0], 'rider', 'rejected');
        $buyer = $this->user('delivery-buyer@example.test', 'buyer', 'active');
        $profileId = DB::table('courier_profiles')->insertGetId([
            'user_id' => $rider->id,
            'sex' => 'female',
            'birthday' => '1990-01-01',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'subtotal' => 10,
            'shipping_fee' => 0,
            'total_amount' => 10,
            'status' => 'AT_SORTING_CENTER',
        ]);
        DB::table('deliveries')->insert([
            'order_id' => $order->id,
            'courier_profile_id' => $profileId,
            'status' => 'AT_SORTING_CENTER',
            'legacy_imported' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$rider->id}/release-email", [
                'email_confirmation' => $rider->email,
                'reason_code' => 'applicant_requested',
            ])->assertStatus(409);

        $this->assertNull($rider->fresh()->account_archived_at);
        $this->assertDatabaseCount('account_email_releases', 0);
    }

    public function test_release_refuses_active_seller_vouchers_and_redeemable_buyer_claims(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $seller = $this->user('voucher-seller@example.test', 'seller', 'rejected');
        $buyer = $this->user('voucher-buyer@example.test', 'buyer', 'rejected');
        $now = now();
        $sellerVoucherId = DB::table('vouchers')->insertGetId([
            'code' => 'SYNTHETIC-SELLER-'.strtoupper(substr(uniqid(), -6)),
            'seller_id' => $seller->id,
            'discount_type' => 'fixed',
            'discount_value' => 5,
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $buyerVoucherId = DB::table('vouchers')->insertGetId([
            'code' => 'SYNTHETIC-BUYER-'.strtoupper(substr(uniqid(), -6)),
            'discount_type' => 'fixed',
            'discount_value' => 5,
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        DB::table('voucher_claims')->insert([
            'voucher_id' => $buyerVoucherId,
            'buyer_id' => $buyer->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->actingAs($admin, 'sanctum');
        foreach ([$seller, $buyer] as $user) {
            $user = $this->assignAuthorizedTestEmail($user);
            $this->postJson("/api/admin/users/{$user->id}/release-email", [
                'email_confirmation' => $user->email,
                'reason_code' => 'applicant_requested',
            ])->assertStatus(409);
            $this->assertNull($user->fresh()->account_archived_at);
        }

        $this->assertDatabaseHas('vouchers', ['id' => $sellerVoucherId, 'seller_id' => $seller->id, 'is_active' => true]);
        $this->assertDatabaseCount('account_email_releases', 0);
    }

    public function test_release_refuses_open_refunds_and_disputes(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = $this->user('refund-buyer@example.test', 'buyer', 'rejected');
        $seller = $this->user('refund-seller@example.test', 'seller', 'active');
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'subtotal' => 25,
            'shipping_fee' => 0,
            'total_amount' => 25,
            'status' => 'COMPLETED',
        ]);
        DB::table('refund_requests')->insert([
            'order_id' => $order->id,
            'buyer_id' => $buyer->id,
            'requested_amount' => 25,
            'reason' => 'Synthetic open refund fixture',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin, 'sanctum');
        $this->assertReleaseBlocked($buyer);

        $complainant = $this->user('dispute-party@example.test', 'buyer', 'rejected');
        DB::table('complaints')->insert([
            'complainant_id' => $complainant->id,
            'respondent_id' => $seller->id,
            'order_id' => $order->id,
            'category' => 'order_issue',
            'subject' => 'Synthetic dispute fixture',
            'description' => 'Synthetic open dispute fixture',
            'status' => 'under_review',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertReleaseBlocked($complainant);
    }

    public function test_release_refuses_unremitted_cod_even_when_order_is_completed(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = $this->user('cod-buyer@example.test', 'buyer', 'rejected');
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'subtotal' => 45,
            'shipping_fee' => 0,
            'total_amount' => 45,
            'status' => 'COMPLETED',
        ]);
        DB::table('cod_collections')->insert([
            'order_id' => $order->id,
            'expected_amount' => 45,
            'status' => 'collected',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin, 'sanctum');
        $this->assertReleaseBlocked($buyer);

        $rider = $this->user('cod-rider@example.test', 'rider', 'rejected');
        $profileId = $this->courierProfileId($rider);
        $riderOrder = Order::create([
            'buyer_id' => $buyer->id,
            'subtotal' => 30,
            'shipping_fee' => 0,
            'total_amount' => 30,
            'status' => 'COMPLETED',
        ]);
        DB::table('cod_collections')->insert([
            'order_id' => $riderOrder->id,
            'courier_profile_id' => $profileId,
            'expected_amount' => 30,
            'collected_amount' => 30,
            'status' => 'collected',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertReleaseBlocked($rider);
    }

    public function test_release_refuses_active_courier_area_and_pickup_assignments(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->actingAs($admin, 'sanctum');

        $areaRider = $this->user('area-rider@example.test', 'rider', 'rejected');
        $areaProfileId = $this->courierProfileId($areaRider);
        $areaId = DB::table('delivery_areas')->insertGetId([
            'name' => 'Synthetic active area '.uniqid(),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('courier_delivery_areas')->insert([
            'delivery_area_id' => $areaId,
            'courier_profile_id' => $areaProfileId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertReleaseBlocked($areaRider);

        $pickupRider = $this->user('pickup-rider@example.test', 'rider', 'rejected');
        $pickupProfileId = $this->courierProfileId($pickupRider);
        $buyer = $this->user('pickup-buyer@example.test', 'buyer', 'active');
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'subtotal' => 15,
            'shipping_fee' => 0,
            'total_amount' => 15,
            'status' => 'DELIVERED',
        ]);
        $deliveryId = DB::table('deliveries')->insertGetId([
            'order_id' => $order->id,
            'courier_profile_id' => null,
            'status' => 'DELIVERED',
            'legacy_imported' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('pickup_assignments')->insert([
            'order_id' => $order->id,
            'delivery_id' => $deliveryId,
            'courier_profile_id' => $pickupProfileId,
            'status' => 'ASSIGNED_TO_PICKUP_RIDER',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertReleaseBlocked($pickupRider);
    }

    public function test_release_refuses_return_courier_and_hub_transfer_responsibilities(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->actingAs($admin, 'sanctum');
        $fromHubId = DB::table('logistics_hubs')->insertGetId([
            'name' => 'Synthetic from hub '.uniqid(), 'code' => 'FROM-'.strtoupper(substr(uniqid(), -8)),
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $toHubId = DB::table('logistics_hubs')->insertGetId([
            'name' => 'Synthetic to hub '.uniqid(), 'code' => 'TO-'.strtoupper(substr(uniqid(), -8)),
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $rider = $this->user('return-rider@example.test', 'rider', 'rejected');
        $profileId = $this->courierProfileId($rider);
        $buyer = $this->user('return-buyer@example.test', 'buyer', 'active');
        $seller = $this->user('return-seller@example.test', 'seller', 'active');
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'subtotal' => 20,
            'shipping_fee' => 0,
            'total_amount' => 20,
            'status' => 'COMPLETED',
        ]);
        $refundId = DB::table('refund_requests')->insertGetId([
            'order_id' => $order->id,
            'buyer_id' => $buyer->id,
            'requested_amount' => 20,
            'reason' => 'Synthetic completed refund fixture',
            'status' => 'refunded',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $returnId = DB::table('return_shipments')->insertGetId([
            'refund_request_id' => $refundId,
            'order_id' => $order->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'pickup_courier_profile_id' => $profileId,
            'status' => 'awaiting_pickup',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertReleaseBlocked($rider);

        DB::table('return_shipments')->where('id', $returnId)->update(['status' => 'seller_received']);
        DB::table('hub_transfers')->insert([
            'return_shipment_id' => $returnId,
            'from_hub_id' => $fromHubId,
            'to_hub_id' => $toHubId,
            'courier_profile_id' => $profileId,
            'status' => 'in_transit',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertReleaseBlocked($rider);

        DB::table('hub_transfers')->where('courier_profile_id', $profileId)->update(['status' => 'arrived']);
        $openReturnBuyer = $this->user('open-return-buyer@example.test', 'buyer', 'rejected');
        $openReturnOrder = Order::create([
            'buyer_id' => $openReturnBuyer->id,
            'subtotal' => 12,
            'shipping_fee' => 0,
            'total_amount' => 12,
            'status' => 'COMPLETED',
        ]);
        $openRefundId = DB::table('refund_requests')->insertGetId([
            'order_id' => $openReturnOrder->id,
            'buyer_id' => $openReturnBuyer->id,
            'requested_amount' => 12,
            'reason' => 'Synthetic open return fixture',
            'status' => 'refunded',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('return_shipments')->insert([
            'refund_request_id' => $openRefundId,
            'order_id' => $openReturnOrder->id,
            'buyer_id' => $openReturnBuyer->id,
            'seller_id' => $seller->id,
            'status' => 'awaiting_pickup',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertReleaseBlocked($openReturnBuyer);

    }

    public function test_release_refuses_logistics_accounts_with_open_transfers_they_assigned(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $logistics = $this->user(self::AUTHORIZED_EMAILS[0], 'logistics', 'rejected');
        $fromHubId = DB::table('logistics_hubs')->insertGetId([
            'name' => 'Synthetic logistics from hub', 'code' => 'LOG-FROM-'.strtoupper(substr(uniqid(), -8)),
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $toHubId = DB::table('logistics_hubs')->insertGetId([
            'name' => 'Synthetic logistics to hub', 'code' => 'LOG-TO-'.strtoupper(substr(uniqid(), -8)),
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('hub_transfers')->insert([
            'from_hub_id' => $fromHubId,
            'to_hub_id' => $toHubId,
            'assigned_by' => $logistics->id,
            'status' => 'in_transit',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin, 'sanctum');
        $this->assertReleaseBlocked($logistics);
    }

    public function test_release_refuses_active_seller_products_and_seller_side_open_orders(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $seller = $this->user('active-product-seller@example.test', 'seller', 'rejected');
        Product::create([
            'seller_id' => $seller->id,
            'name' => 'Synthetic active listing',
            'description' => 'Synthetic fixture',
            'price' => 10,
            'stock' => 1,
            'category' => 'Test',
            'status' => 'active',
            'review_status' => 'approved',
        ]);
        $this->actingAs($admin, 'sanctum');
        $this->assertReleaseBlocked($seller);

        Product::where('seller_id', $seller->id)->update(['status' => 'inactive']);
        $buyer = $this->user('seller-order-buyer@example.test', 'buyer', 'active');
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Synthetic inactive listing',
            'description' => 'Synthetic fixture',
            'price' => 10,
            'stock' => 0,
            'category' => 'Test',
            'status' => 'inactive',
        ]);
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'subtotal' => 10,
            'shipping_fee' => 0,
            'total_amount' => 10,
            'status' => 'PROCESSING',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'seller_id' => $seller->id,
            'quantity' => 1,
            'unit_price' => 10,
            'subtotal' => 10,
        ]);
        $this->assertReleaseBlocked($seller);
    }

    public function test_released_email_has_an_explanatory_eligibility_field_in_admin_users(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $eligible = $this->user(self::AUTHORIZED_EMAILS[0], 'buyer', 'rejected');
        $blocked = $this->user(self::AUTHORIZED_EMAILS[1], 'buyer', 'rejected');
        Order::create([
            'buyer_id' => $blocked->id,
            'subtotal' => 10,
            'shipping_fee' => 0,
            'total_amount' => 10,
            'status' => 'PENDING',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users')->assertOk();
        $rows = collect($response->json('data.data'))->keyBy('id');
        $this->assertTrue($rows[$eligible->id]['can_release_email']);
        $this->assertNull($rows[$eligible->id]['email_release_block_reason']);
        $this->assertFalse($rows[$blocked->id]['can_release_email']);
        $this->assertStringContainsString('open orders', strtolower($rows[$blocked->id]['email_release_block_reason']));
    }

    private function user(string $email, string $role, string $status): User
    {
        return User::forceCreate([
            'first_name' => 'Synthetic',
            'last_name' => 'Account',
            'email' => $email,
            'phone' => '+639171234567',
            'password' => Hash::make('NewBuyerPassword123'),
            'role' => $role,
            'status' => $status,
            'email_verified_at' => $status === 'pending' ? null : now(),
        ]);
    }

    private function assertReleaseBlocked(User $user): void
    {
        $user = $this->assignAuthorizedTestEmail($user);
        $this->postJson("/api/admin/users/{$user->id}/release-email", [
            'email_confirmation' => $user->email,
            'reason_code' => 'applicant_requested',
        ])->assertStatus(409);
        $this->assertNull($user->fresh()->account_archived_at);
    }

    private function assignAuthorizedTestEmail(User $user): User
    {
        if (in_array($user->email, self::AUTHORIZED_EMAILS, true)) {
            return $user;
        }

        foreach (self::AUTHORIZED_EMAILS as $email) {
            $owner = User::query()->where('email', $email)->first();
            if ($owner === null || $owner->is($user)) {
                $user->forceFill(['email' => $email])->save();
                return $user->refresh();
            }
        }

        throw new \LogicException('This test has more release candidates than the authorized email allowlist permits.');
    }

    private function courierProfileId(User $rider): int
    {
        return DB::table('courier_profiles')->insertGetId([
            'user_id' => $rider->id,
            'sex' => 'female',
            'birthday' => '1990-01-01',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function buyerPayload(string $email): array
    {
        return [
            'first_name' => 'New',
            'last_name' => 'Buyer',
            'email' => $email,
            'phone' => '+639171234567',
            'password' => 'NewBuyerPassword123',
            'password_confirmation' => 'NewBuyerPassword123',
            'role' => 'buyer',
            'sex' => 'female',
            'birthday' => '1990-01-01',
            'terms_accepted' => '1',
            'terms_version' => '1.1',
            'privacy_notice_acknowledged' => '1',
            'privacy_version' => '1.1',
            'region' => 'NCR',
            'province' => 'Metro Manila',
            'municipality' => 'Manila',
            'barangay' => 'Synthetic',
            'street' => 'Test Street',
            'house_number' => '1',
            'postal_code' => '1000',
            'valid_id' => UploadedFile::fake()->createWithContent('synthetic-id.pdf', "%PDF-1.4\nsynthetic fixture"),
        ];
    }

    private function sentOtp(string $email): string
    {
        $otp = null;
        Mail::assertSent(RegistrationOtpMail::class, function (RegistrationOtpMail $mail) use ($email, &$otp): bool {
            if (!$mail->hasTo($email)) return false;
            $otp = $mail->otp;
            return true;
        });

        return (string) $otp;
    }
}
