<?php

namespace Tests\Feature;

use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\Order;
use App\Models\PickupAssignment;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LogisticsOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_logistics_can_assign_pickup_and_confirm_collected_parcel_receipt(): void
    {
        $logistics = $this->logisticsUser();
        [, $courierProfile] = $this->eligibleCourier();
        $order = $this->order('READY_FOR_PICKUP');

        $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/operations')
            ->assertOk()
            ->assertJsonPath('data.pickup_orders.0.id', $order->id);

        $this->postJson("/api/logistics/orders/{$order->id}/pickup-assignment", [
            'courier_profile_id' => $courierProfile->id,
        ])->assertOk();
        $assignment = PickupAssignment::where('order_id', $order->id)->firstOrFail();
        $this->assertSame($logistics->id, $assignment->assigned_by);

        $assignment->update([
            'status' => PickupAssignment::PICKED_UP,
            'picked_up_at' => now(),
        ]);
        Delivery::where('order_id', $order->id)->update(['status' => Delivery::PICKED_UP, 'picked_up_at' => now()]);
        $order->update(['status' => Delivery::PICKED_UP]);

        $this->patchJson("/api/logistics/orders/{$order->id}/sorting-receipt", [
            'expected_status' => Delivery::PICKED_UP,
        ])->assertOk()->assertJsonPath('message', 'Sorting-center receipt confirmed.');

        $this->assertSame(PickupAssignment::RECEIVED, $assignment->fresh()->status);
        $this->assertNotNull($assignment->fresh()->received_at);
        $this->assertSame(Delivery::AT_SORTING_CENTER, $order->fresh()->status);
        $this->assertDatabaseHas('delivery_events', [
            'delivery_id' => $assignment->delivery_id,
            'actor_id' => $logistics->id,
            'event_type' => 'sorting_center_received',
            'new_status' => Delivery::AT_SORTING_CENTER,
        ]);
        $this->patchJson("/api/logistics/orders/{$order->id}/sorting-receipt", [
            'expected_status' => Delivery::PICKED_UP,
        ])->assertStatus(409);
    }

    public function test_logistics_can_sort_and_assign_only_to_eligible_courier_in_configured_area(): void
    {
        $logistics = $this->logisticsUser();
        [$courier, $courierProfile] = $this->eligibleCourier();
        [, $otherProfile] = $this->eligibleCourier();
        $area = DeliveryArea::create(['name' => 'Logistics delivery area', 'is_active' => true]);
        $area->couriers()->attach($courierProfile->id, ['assigned_by' => $logistics->id]);
        $order = $this->order(Delivery::AT_SORTING_CENTER);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::AT_SORTING_CENTER]);

        $this->actingAs($logistics, 'sanctum')
            ->patchJson("/api/logistics/orders/{$order->id}/sort-and-assign", [
                'delivery_area_id' => $area->id,
                'courier_profile_id' => $otherProfile->id,
                'expected_status' => Delivery::AT_SORTING_CENTER,
            ])->assertUnprocessable();

        $this->patchJson("/api/logistics/orders/{$order->id}/sort-and-assign", [
            'delivery_area_id' => $area->id,
            'courier_profile_id' => $courierProfile->id,
            'expected_status' => Delivery::AT_SORTING_CENTER,
        ])->assertOk();

        $this->assertSame(Delivery::ASSIGNED, $delivery->fresh()->status);
        $this->assertSame($courierProfile->id, $delivery->fresh()->courier_profile_id);
        $this->assertSame(Delivery::ASSIGNED, $order->fresh()->status);
        $this->assertDatabaseHas('delivery_events', [
            'delivery_id' => $delivery->id,
            'actor_id' => $logistics->id,
            'event_type' => 'delivery_assigned',
            'courier_profile_id' => $courierProfile->id,
        ]);
    }

    public function test_logistics_can_monitor_failed_deliveries_and_record_a_return(): void
    {
        $logistics = $this->logisticsUser();
        $order = $this->order(Delivery::FAILED);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'status' => Delivery::FAILED,
            'failure_reason' => 'Buyer unavailable.',
        ]);
        $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/operations')
            ->assertOk()
            ->assertJsonFragment(['failure_reason' => 'Buyer unavailable.']);

        $this->patchJson("/api/logistics/orders/{$order->id}/delivery-resolution", [
            'status' => 'RETURNED',
            'reason' => 'Parcel returned to the sorting center after failed delivery.',
        ])->assertOk()->assertJsonPath('data.status', 'RETURNED');

        $this->assertSame('RETURNED', $order->fresh()->status);
        $this->assertSame('RETURNED', $delivery->fresh()->status);
        $this->assertDatabaseHas('delivery_events', [
            'delivery_id' => $delivery->id,
            'actor_id' => $logistics->id,
            'event_type' => 'resolved_return',
            'new_status' => 'RETURNED',
        ]);
    }

    public function test_logistics_can_view_own_profile_edit_safe_fields_and_change_password(): void
    {
        $logistics = $this->logisticsUser();
        $token = $logistics->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/logistics/profile')
            ->assertOk()
            ->assertJsonPath('data.role', 'logistics')
            ->assertJsonMissingPath('data.password');

        $this->patchJson('/api/logistics/profile', [
            'first_name' => 'Logistics',
            'last_name' => 'Operator',
            'phone' => '+639171234567',
        ])->assertOk()
            ->assertJsonPath('data.first_name', 'Logistics')
            ->assertJsonPath('data.phone', '+639171234567');

        $this->patchJson('/api/logistics/account/password', [
            'current_password' => 'password',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertOk();
        $this->assertTrue(Hash::check('NewPassword123!', $logistics->fresh()->password));

        $this->postJson('/api/logout')->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $logistics->id]);
    }

    public function test_logistics_operations_and_account_routes_are_not_available_to_other_roles(): void
    {
        foreach (['admin', 'rider', 'seller', 'buyer'] as $role) {
            $user = User::factory()->create(['role' => $role, 'status' => 'active']);
            $this->actingAs($user, 'sanctum')
                ->getJson('/api/logistics/operations')
                ->assertForbidden();
            $this->getJson('/api/logistics/profile')->assertForbidden();
            $this->patchJson('/api/logistics/account/password', [])->assertForbidden();
        }
    }

    public function test_admin_logistics_routes_remain_admin_only_and_available(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $logistics = $this->logisticsUser();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/logistics')->assertOk();
        $this->actingAs($logistics, 'sanctum')->getJson('/api/admin/logistics')->assertForbidden();
        $this->getJson('/api/admin/delivery-areas')->assertForbidden();
    }

    private function logisticsUser(): User
    {
        return User::factory()->create([
            'role' => 'logistics',
            'status' => 'active',
            'email_verified_at' => now(),
            'password' => 'password',
        ]);
    }

    private function eligibleCourier(): array
    {
        $user = User::factory()->create([
            'role' => 'rider',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $profile = CourierProfile::create([
            'user_id' => $user->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
        ]);
        foreach (['valid_id', 'or_cr', 'drivers_license'] as $type) {
            UserDocument::create([
                'user_id' => $user->id,
                'document_type' => $type,
                'file_path' => "registration-documents/{$user->id}/{$type}.pdf",
                'status' => 'approved',
            ]);
        }
        Vehicle::create([
            'courier_profile_id' => $profile->id,
            'vehicle_type' => 'motorcycle',
            'plate_number' => 'AREA' . str_pad((string) $profile->id, 6, '0', STR_PAD_LEFT),
        ]);

        return [$user, $profile];
    }

    private function order(string $status): Order
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        return Order::create([
            'buyer_id' => $buyer->id,
            'delivery_address' => 'Test delivery destination',
            'payment_method' => 'cash_on_delivery',
            'subtotal' => 100,
            'shipping_fee' => 0,
            'total_amount' => 100,
            'status' => $status,
        ]);
    }
}
