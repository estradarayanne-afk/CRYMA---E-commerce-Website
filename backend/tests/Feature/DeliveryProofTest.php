<?php

namespace Tests\Feature;

use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\Order;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DeliveryProofTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_assigned_courier_completes_delivery_only_with_valid_private_proof(): void
    {
        [$courier, $profile] = $this->eligibleCourier();
        $order = $this->order(Delivery::OUT_FOR_DELIVERY);
        $area = DeliveryArea::create(['name' => 'Proof test area']);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'courier_profile_id' => $profile->id,
            'delivery_area_id' => $area->id,
            'status' => Delivery::OUT_FOR_DELIVERY,
        ]);

        $this->actingAs($courier, 'sanctum')
            ->patchJson("/api/courier/deliveries/{$delivery->id}/status", [
                'status' => Delivery::DELIVERED,
                'expected_status' => Delivery::OUT_FOR_DELIVERY,
            ])
            ->assertUnprocessable();

        $this->postProof($delivery)->assertUnprocessable()->assertJsonValidationErrors([
            'recipient_full_name', 'photo',
        ]);
        $this->postProof($delivery, [
            'recipient_full_name' => 'Recipient Example',
            'photo' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])->assertUnprocessable();

        $response = $this->postProof($delivery, [
            'expected_status' => Delivery::OUT_FOR_DELIVERY,
            'recipient_full_name' => '  Maria Santos  ',
            'photo' => UploadedFile::fake()->image('delivery.jpg', 400, 300),
        ])->assertOk()
            ->assertJsonPath('data.status', Delivery::DELIVERED)
            ->assertJsonPath('data.proof.recipient_full_name', 'Maria Santos')
            ->assertJsonMissingPath('data.proof.photo_path');

        $this->assertDatabaseHas('delivery_proofs', [
            'delivery_id' => $delivery->id,
            'courier_profile_id' => $profile->id,
            'recipient_full_name' => 'Maria Santos',
        ]);
        $this->assertSame(Delivery::DELIVERED, $order->fresh()->status);
        $this->assertNotNull($delivery->fresh()->delivered_at);
        $proof = $delivery->fresh()->proof;
        Storage::disk('local')->assertExists($proof->photo_path);
        $this->assertDatabaseHas('delivery_events', [
            'delivery_id' => $delivery->id,
            'event_type' => 'delivered_with_proof',
            'actor_id' => $courier->id,
            'new_status' => Delivery::DELIVERED,
        ]);
        $response->assertDontSee($proof->photo_path);

        $this->postProof($delivery, [
            'expected_status' => Delivery::OUT_FOR_DELIVERY,
            'recipient_full_name' => 'Maria Santos',
            'photo' => UploadedFile::fake()->image('duplicate.png'),
        ])->assertStatus(409);
        $this->assertDatabaseCount('delivery_proofs', 1);

        $this->getJson('/api/courier/delivery-history')
            ->assertOk()
            ->assertJsonPath('data.0.proof.recipient_full_name', 'Maria Santos')
            ->assertJsonMissingPath('data.0.proof.photo_path');

        $this->actingAs(User::factory()->create(['role' => 'admin', 'status' => 'active']), 'sanctum')
            ->getJson("/api/admin/deliveries/{$delivery->id}")
            ->assertOk()
            ->assertJsonPath('data.proof.recipient_full_name', 'Maria Santos');

        $this->actingAs(User::factory()->create(['role' => 'logistics', 'status' => 'active']), 'sanctum')
            ->getJson('/api/logistics/operations')
            ->assertOk()
            ->assertJsonPath('data.deliveries.0.proof.recipient_full_name', 'Maria Santos')
            ->assertJsonMissingPath('data.deliveries.0.proof.photo_path');
    }

    public function test_only_assigned_courier_can_submit_or_view_proof_and_staff_access_is_role_limited(): void
    {
        [$courier, $profile] = $this->eligibleCourier();
        [$otherCourier] = $this->eligibleCourier();
        $order = $this->order(Delivery::OUT_FOR_DELIVERY);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'courier_profile_id' => $profile->id,
            'status' => Delivery::OUT_FOR_DELIVERY,
        ]);

        $this->actingAs($otherCourier, 'sanctum')
            ->post("/api/courier/deliveries/{$delivery->id}/proof", $this->proofInput(), ['Accept' => 'application/json'])
            ->assertNotFound();
        $this->actingAs($courier, 'sanctum');
        $this->post("/api/courier/deliveries/{$delivery->id}/proof", $this->proofInput(), ['Accept' => 'application/json'])
            ->assertOk();

        $this->actingAs($otherCourier, 'sanctum')
            ->getJson("/api/courier/deliveries/{$delivery->id}/proof/photo")
            ->assertNotFound();
        $this->actingAs(User::factory()->create(['role' => 'buyer', 'status' => 'active']), 'sanctum')
            ->getJson("/api/admin/deliveries/{$delivery->id}/proof/photo")
            ->assertForbidden();

        $proofResponse = $this->actingAs(User::factory()->create(['role' => 'admin', 'status' => 'active']), 'sanctum')
            ->get("/api/admin/deliveries/{$delivery->id}/proof/photo");
        $proofResponse->assertOk()->assertHeader('x-content-type-options', 'nosniff');
        $this->assertStringContainsString(
            'private',
            $proofResponse->headers->get('Cache-Control')
        );

        $this->actingAs(User::factory()->create(['role' => 'logistics', 'status' => 'active']), 'sanctum')
            ->get("/api/logistics/deliveries/{$delivery->id}/proof/photo")
            ->assertOk();
    }

    public function test_proof_upload_rejects_stale_status_and_invalid_photo(): void
    {
        [$courier, $profile] = $this->eligibleCourier();
        $order = $this->order(Delivery::FAILED);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'courier_profile_id' => $profile->id,
            'status' => Delivery::FAILED,
        ]);
        $this->actingAs($courier, 'sanctum');

        $this->postProof($delivery, $this->proofInput())->assertStatus(409);

        $order->update(['status' => Delivery::OUT_FOR_DELIVERY]);
        $delivery->update(['status' => Delivery::OUT_FOR_DELIVERY]);
        $this->postProof($delivery, $this->proofInput([
            'photo' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ]))->assertUnprocessable()->assertJsonValidationErrors(['photo']);

        $this->assertDatabaseMissing('delivery_proofs', ['delivery_id' => $delivery->id]);
        $this->assertSame(Delivery::OUT_FOR_DELIVERY, $delivery->fresh()->status);
    }

    private function postProof(Delivery $delivery, array $input = [])
    {
        return $this->post("/api/courier/deliveries/{$delivery->id}/proof", $input, ['Accept' => 'application/json']);
    }

    private function proofInput(array $override = []): array
    {
        return [
            'expected_status' => Delivery::OUT_FOR_DELIVERY,
            'recipient_full_name' => 'Recipient Example',
            'photo' => UploadedFile::fake()->image('delivery.jpg', 400, 300),
            ...$override,
        ];
    }

    private function eligibleCourier(): array
    {
        $user = User::factory()->create(['role' => 'rider', 'status' => 'active', 'email_verified_at' => now()]);
        $profile = CourierProfile::create([
            'user_id' => $user->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
        ]);
        foreach (['valid_id', 'or_cr', 'drivers_license'] as $type) {
            UserDocument::create([
                'user_id' => $user->id,
                'document_type' => $type,
                'file_path' => "private/test/{$user->id}-{$type}.pdf",
                'status' => 'approved',
            ]);
        }
        Vehicle::create([
            'courier_profile_id' => $profile->id,
            'vehicle_type' => 'motorcycle',
            'plate_number' => 'TEST'.str_pad((string) $profile->id, 6, '0', STR_PAD_LEFT),
        ]);

        return [$user, $profile];
    }

    private function order(string $status): Order
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        return Order::create([
            'buyer_id' => $buyer->id,
            'delivery_address' => 'Test delivery address',
            'payment_method' => 'cash_on_delivery',
            'subtotal' => 10,
            'shipping_fee' => 0,
            'total_amount' => 10,
            'status' => $status,
        ]);
    }
}
