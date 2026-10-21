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
use Tests\TestCase;

class DeliveryWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_assigns_pickup_only_to_eligible_riders_and_only_for_ready_orders(): void
    {
        $admin = $this->admin();
        $order = $this->order('READY_FOR_PICKUP');
        [, $profile] = $this->eligibleCourier();
        $inactive = $this->eligibleCourier(status: 'suspended')[1];
        $unverified = $this->eligibleCourier(verified: false)[1];
        $missingDocs = $this->eligibleCourier(approvedDocuments: false)[1];
        $noVehicle = $this->eligibleCourier(vehicle: false)[1];

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/orders/{$order->id}/pickup-assignment", ['courier_profile_id' => $inactive->id])->assertUnprocessable();
        $this->postJson("/api/admin/orders/{$order->id}/pickup-assignment", ['courier_profile_id' => $unverified->id])->assertUnprocessable();
        $this->postJson("/api/admin/orders/{$order->id}/pickup-assignment", ['courier_profile_id' => $missingDocs->id])->assertUnprocessable();
        $this->postJson("/api/admin/orders/{$order->id}/pickup-assignment", ['courier_profile_id' => $noVehicle->id])->assertUnprocessable();

        $this->postJson("/api/admin/orders/{$order->id}/pickup-assignment", ['courier_profile_id' => $profile->id])
            ->assertOk()->assertJsonPath('data.status', PickupAssignment::ASSIGNED);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'READY_FOR_PICKUP']);
        $this->assertDatabaseHas('deliveries', ['order_id' => $order->id, 'status' => 'READY_FOR_PICKUP', 'legacy_imported' => false]);
        $this->assertDatabaseHas('pickup_assignments', ['order_id' => $order->id, 'courier_profile_id' => $profile->id, 'assigned_by' => $admin->id]);
        $this->assertDatabaseHas('delivery_events', ['event_type' => 'pickup_assigned', 'actor_id' => $admin->id, 'courier_profile_id' => $profile->id]);

        $notReady = $this->order('PREPARING');
        $this->postJson("/api/admin/orders/{$notReady->id}/pickup-assignment", ['courier_profile_id' => $profile->id])->assertUnprocessable();
    }

    public function test_pickup_rider_only_sees_own_assignments_and_must_collect_before_center_receipt(): void
    {
        $admin = $this->admin();
        [$rider, $profile] = $this->eligibleCourier();
        [$otherRider] = $this->eligibleCourier();
        $order = $this->order('READY_FOR_PICKUP');
        $assignment = $this->assignPickup($admin, $order, $profile);

        $this->actingAs($otherRider, 'sanctum')->getJson("/api/courier/pickups/{$assignment->id}")->assertNotFound();
        $this->getJson('/api/courier/pickups')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($rider, 'sanctum')->patchJson("/api/courier/pickups/{$assignment->id}/status", [
            'status' => 'AT_SORTING_CENTER', 'expected_status' => PickupAssignment::ASSIGNED,
        ])->assertUnprocessable();
        $this->patchJson("/api/courier/pickups/{$assignment->id}/status", [
            'status' => PickupAssignment::PICKED_UP, 'expected_status' => PickupAssignment::ASSIGNED,
        ])->assertUnprocessable();
        $this->patchJson("/api/courier/pickups/{$assignment->id}/status", [
            'status' => PickupAssignment::ACCEPTED, 'expected_status' => PickupAssignment::ASSIGNED,
        ])->assertOk();
        $this->patchJson("/api/courier/pickups/{$assignment->id}/status", [
            'status' => PickupAssignment::PICKED_UP, 'expected_status' => PickupAssignment::ACCEPTED,
        ])->assertOk();
        $this->patchJson("/api/courier/pickups/{$assignment->id}/status", [
            'status' => PickupAssignment::RECEIVED, 'expected_status' => PickupAssignment::PICKED_UP,
        ])->assertOk();

        $this->assertSame(Delivery::AT_SORTING_CENTER, $order->fresh()->status);
        $this->assertNotNull($assignment->fresh()->received_at);
        $this->assertDatabaseHas('delivery_events', ['event_type' => 'sorting_center_received', 'actor_id' => $rider->id, 'new_status' => Delivery::AT_SORTING_CENTER]);
        $this->getJson('/api/courier/pickups')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/courier/pickup-history')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_admin_sorts_parcel_and_assigns_only_a_courier_configured_for_the_area(): void
    {
        $admin = $this->admin();
        [$courier, $profile] = $this->eligibleCourier();
        [, $otherProfile] = $this->eligibleCourier();
        $area = DeliveryArea::create(['name' => 'Admin-configured area', 'is_active' => true]);
        $area->couriers()->attach($profile->id, ['assigned_by' => $admin->id]);
        $order = $this->order(Delivery::AT_SORTING_CENTER);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::AT_SORTING_CENTER, 'legacy_imported' => false]);

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$order->id}/sort-and-assign", [
            'delivery_area_id' => $area->id, 'courier_profile_id' => $otherProfile->id, 'expected_status' => Delivery::AT_SORTING_CENTER,
        ])->assertUnprocessable();
        $this->patchJson("/api/admin/orders/{$order->id}/sort-and-assign", [
            'delivery_area_id' => $area->id, 'courier_profile_id' => $profile->id, 'expected_status' => Delivery::AT_SORTING_CENTER,
        ])->assertOk()->assertJsonPath('data.status', Delivery::ASSIGNED);

        $this->assertSame(Delivery::ASSIGNED, $delivery->fresh()->status);
        $this->assertSame($area->id, $delivery->fresh()->delivery_area_id);
        $this->assertSame($profile->id, $delivery->fresh()->courier_profile_id);
        $this->assertNotNull($delivery->fresh()->sorted_at);
        $this->assertSame(Delivery::ASSIGNED, $order->fresh()->status);
        $this->assertDatabaseHas('delivery_events', ['delivery_id' => $delivery->id, 'event_type' => 'sorted', 'previous_status' => Delivery::AT_SORTING_CENTER, 'new_status' => Delivery::SORTED, 'actor_id' => $admin->id]);
        $this->assertDatabaseHas('delivery_events', ['delivery_id' => $delivery->id, 'event_type' => 'delivery_assigned', 'previous_status' => Delivery::SORTED, 'new_status' => Delivery::ASSIGNED, 'courier_profile_id' => $profile->id]);

        $area->update(['is_active' => false]);
        $second = $this->order(Delivery::SORTED);
        Delivery::create(['order_id' => $second->id, 'status' => Delivery::SORTED]);
        $this->patchJson("/api/admin/orders/{$second->id}/sort-and-assign", [
            'delivery_area_id' => $area->id, 'courier_profile_id' => $profile->id, 'expected_status' => Delivery::SORTED,
        ])->assertUnprocessable();
    }

    public function test_courier_delivery_lifecycle_rejects_skips_failure_without_reason_and_completion(): void
    {
        [$courier, $profile] = $this->eligibleCourier();
        $order = $this->order(Delivery::ASSIGNED);
        $area = DeliveryArea::create(['name' => 'Transit area']);
        $delivery = Delivery::create(['order_id' => $order->id, 'courier_profile_id' => $profile->id, 'delivery_area_id' => $area->id, 'status' => Delivery::ASSIGNED]);
        $this->actingAs($courier, 'sanctum')->patchJson("/api/courier/deliveries/{$delivery->id}/status", ['status' => Delivery::DELIVERED, 'expected_status' => Delivery::ASSIGNED])->assertUnprocessable();
        $this->patchJson("/api/courier/deliveries/{$delivery->id}/status", ['status' => Delivery::COMPLETED, 'expected_status' => Delivery::ASSIGNED])->assertUnprocessable();
        $this->patchJson("/api/courier/deliveries/{$delivery->id}/status", ['status' => Delivery::OUT_FOR_DELIVERY, 'expected_status' => Delivery::ASSIGNED])->assertOk();
        $this->assertNotNull($delivery->fresh()->delivery_picked_up_at);
        $this->patchJson("/api/courier/deliveries/{$delivery->id}/status", ['status' => Delivery::FAILED, 'expected_status' => Delivery::OUT_FOR_DELIVERY, 'reason' => '  '])->assertUnprocessable();
        $this->patchJson("/api/courier/deliveries/{$delivery->id}/status", ['status' => Delivery::FAILED, 'expected_status' => Delivery::OUT_FOR_DELIVERY, 'reason' => 'Recipient unavailable'])->assertOk();
        $this->assertSame(Delivery::FAILED, $order->fresh()->status);
        $this->assertDatabaseHas('delivery_events', ['event_type' => 'failed', 'reason' => 'Recipient unavailable', 'actor_id' => $courier->id]);
    }

    public function test_admin_can_retry_or_return_failed_delivery_but_cannot_cancel_it(): void
    {
        $admin = $this->admin();
        [, $first] = $this->eligibleCourier();
        [, $next] = $this->eligibleCourier();
        $area = DeliveryArea::create(['name' => 'Retry area']);
        $area->couriers()->attach([$first->id => ['assigned_by' => $admin->id], $next->id => ['assigned_by' => $admin->id]]);
        $order = $this->order(Delivery::FAILED);
        $delivery = Delivery::create(['order_id' => $order->id, 'courier_profile_id' => $first->id, 'delivery_area_id' => $area->id, 'status' => Delivery::FAILED, 'failure_reason' => 'Recipient unavailable']);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/orders/{$order->id}/delivery-assignment", [
            'courier_profile_id' => $next->id, 'delivery_area_id' => $area->id, 'expected_courier_profile_id' => $first->id, 'reason' => 'Administrator approved another attempt',
        ])->assertOk()->assertJsonPath('data.status', Delivery::ASSIGNED);
        $this->assertDatabaseHas('delivery_events', ['delivery_id' => $delivery->id, 'event_type' => 'retry_assigned', 'previous_courier_profile_id' => $first->id, 'courier_profile_id' => $next->id]);

        $secondOrder = $this->order(Delivery::FAILED);
        $secondDelivery = Delivery::create(['order_id' => $secondOrder->id, 'status' => Delivery::FAILED]);
        $this->patchJson("/api/admin/orders/{$secondOrder->id}/delivery-resolution", ['status' => 'CANCELLED', 'reason' => 'Not an approved outcome'])->assertUnprocessable();
        $this->patchJson("/api/admin/orders/{$secondOrder->id}/delivery-resolution", ['status' => 'RETURNED', 'reason' => 'Administrator approved return'])->assertOk();
        $this->assertSame('RETURNED', $secondDelivery->fresh()->status);
        $this->assertSame('RETURNED', $secondOrder->fresh()->status);
        $this->assertDatabaseHas('delivery_events', ['delivery_id' => $secondDelivery->id, 'event_type' => 'resolved_return', 'actor_id' => $admin->id]);
    }

    public function test_only_order_owner_can_confirm_receipt_after_delivery_and_confirmation_is_audited(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $otherBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $order = $this->order(Delivery::DELIVERED, $buyer);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::DELIVERED, 'delivered_at' => now()]);
        $this->actingAs($otherBuyer, 'sanctum')->postJson("/api/orders/{$order->id}/confirm-received")->assertNotFound();
        $this->actingAs($buyer, 'sanctum')->postJson("/api/orders/{$order->id}/confirm-received")->assertOk();
        $this->assertSame(Delivery::COMPLETED, $order->fresh()->status);
        $this->assertSame(Delivery::COMPLETED, $delivery->fresh()->status);
        $this->assertSame($buyer->id, $delivery->fresh()->buyer_confirmed_by);
        $this->assertDatabaseHas('delivery_events', ['delivery_id' => $delivery->id, 'event_type' => 'buyer_receipt_confirmed', 'previous_status' => Delivery::DELIVERED, 'new_status' => Delivery::COMPLETED, 'actor_id' => $buyer->id]);
        $this->postJson("/api/orders/{$order->id}/confirm-received")->assertOk();
        $rider = $this->eligibleCourier()[0];
        $this->actingAs($rider, 'sanctum')->postJson("/api/orders/{$order->id}/confirm-received")->assertForbidden();

        $notDelivered = $this->order(Delivery::OUT_FOR_DELIVERY, $buyer);
        Delivery::create(['order_id' => $notDelivered->id, 'status' => Delivery::OUT_FOR_DELIVERY]);
        $this->actingAs($buyer, 'sanctum')->postJson("/api/orders/{$notDelivered->id}/confirm-received")->assertStatus(409);
    }

    public function test_order_review_is_available_only_after_buyer_receipt_confirmation(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $order = $this->order(Delivery::DELIVERED, $buyer);
        $product = $this->product($seller);
        Delivery::create(['order_id' => $order->id, 'status' => Delivery::DELIVERED, 'delivered_at' => now()]);
        \App\Models\OrderItem::create(['order_id' => $order->id, 'product_id' => $product->id, 'seller_id' => $seller->id, 'quantity' => 1, 'unit_price' => 10, 'subtotal' => 10]);

        $this->actingAs($buyer, 'sanctum')->postJson("/api/products/{$product->id}/reviews", ['order_id' => $order->id, 'rating' => 5])->assertUnprocessable();
        $this->postJson("/api/orders/{$order->id}/confirm-received")->assertOk();
        $this->postJson("/api/products/{$product->id}/reviews", ['order_id' => $order->id, 'rating' => 5])->assertCreated();
    }

    public function test_area_configuration_requires_admin_and_pickup_reassignment_requires_expected_state(): void
    {
        $admin = $this->admin();
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->actingAs($buyer, 'sanctum')->postJson('/api/admin/delivery-areas', ['name' => 'Area'])->assertForbidden();
        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/delivery-areas', ['name' => '   '])->assertUnprocessable();
        $areaResponse = $this->postJson('/api/admin/delivery-areas', ['name' => 'North Hub'])->assertCreated();
        $areaId = $areaResponse->json('data.id');
        [$riderOne, $profileOne] = $this->eligibleCourier();
        [, $profileTwo] = $this->eligibleCourier();
        $this->postJson("/api/admin/delivery-areas/{$areaId}/couriers", ['courier_profile_id' => $profileOne->id])->assertOk();
        $this->assertDatabaseHas('courier_delivery_areas', ['delivery_area_id' => $areaId, 'courier_profile_id' => $profileOne->id, 'assigned_by' => $admin->id]);
        $this->deleteJson("/api/admin/delivery-areas/{$areaId}/couriers/{$profileOne->id}")->assertOk();
        $this->assertDatabaseMissing('courier_delivery_areas', ['delivery_area_id' => $areaId, 'courier_profile_id' => $profileOne->id]);
        $order = $this->order('READY_FOR_PICKUP');
        $assignment = $this->assignPickup($admin, $order, $profileOne);

        $this->postJson("/api/admin/orders/{$order->id}/pickup-assignment", ['courier_profile_id' => $profileTwo->id, 'expected_courier_profile_id' => 999, 'reason' => 'Changes'])->assertStatus(409);
        $this->postJson("/api/admin/orders/{$order->id}/pickup-assignment", ['courier_profile_id' => $profileTwo->id, 'expected_courier_profile_id' => $profileOne->id, 'reason' => 'Coverage change'])->assertOk();
        $this->assertSame($profileTwo->id, $assignment->fresh()->courier_profile_id);
        $this->actingAs($riderOne, 'sanctum')->getJson('/api/admin/delivery-areas')->assertForbidden();

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/delivery-areas/{$areaId}", ['is_active' => false])->assertOk();
        $this->assertDatabaseHas('delivery_areas', ['id' => $areaId, 'is_active' => 0]);
    }

    public function test_legacy_delivery_history_is_not_given_a_synthetic_pickup_or_actor(): void
    {
        $admin = $this->admin();
        [, $courier] = $this->eligibleCourier();
        $order = $this->order(Delivery::AT_SORTING_CENTER);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::AT_SORTING_CENTER, 'legacy_imported' => true]);
        $delivery->events()->create(['event_type' => 'legacy_import', 'new_status' => Delivery::AT_SORTING_CENTER, 'reason' => 'Imported legacy order status.', 'created_at' => now()]);
        $area = DeliveryArea::create(['name' => 'Legacy continuation']);
        $area->couriers()->attach($courier->id, ['assigned_by' => $admin->id]);

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$order->id}/sort-and-assign", [
            'delivery_area_id' => $area->id, 'courier_profile_id' => $courier->id, 'expected_status' => Delivery::AT_SORTING_CENTER,
        ])->assertOk();
        $this->assertDatabaseMissing('pickup_assignments', ['order_id' => $order->id]);
        $this->assertDatabaseHas('delivery_events', ['delivery_id' => $delivery->id, 'event_type' => 'legacy_import', 'actor_id' => null, 'new_status' => Delivery::AT_SORTING_CENTER]);
        $this->assertDatabaseHas('delivery_events', ['delivery_id' => $delivery->id, 'event_type' => 'sorted', 'actor_id' => $admin->id]);
        $this->assertTrue($delivery->fresh()->legacy_imported);

        $pickedUp = $this->order(Delivery::PICKED_UP);
        $legacyPickup = Delivery::create(['order_id' => $pickedUp->id, 'status' => Delivery::PICKED_UP, 'legacy_imported' => true]);
        $this->patchJson("/api/admin/orders/{$pickedUp->id}/legacy-sorting-receipt", ['reason' => 'Parcel physically verified by admin at the sorting center'])->assertOk();
        $this->assertSame(Delivery::AT_SORTING_CENTER, $pickedUp->fresh()->status);
        $this->assertDatabaseMissing('pickup_assignments', ['order_id' => $pickedUp->id]);
        $this->assertDatabaseHas('delivery_events', ['delivery_id' => $legacyPickup->id, 'event_type' => 'legacy_sorting_receipt_verified', 'actor_id' => $admin->id, 'previous_status' => Delivery::PICKED_UP, 'new_status' => Delivery::AT_SORTING_CENTER]);

        $inTransit = $this->order(Delivery::OUT_FOR_DELIVERY);
        $legacyTransit = Delivery::create(['order_id' => $inTransit->id, 'status' => Delivery::OUT_FOR_DELIVERY, 'legacy_imported' => true]);
        $area = DeliveryArea::create(['name' => 'Verified legacy route']);
        $area->couriers()->attach($courier->id, ['assigned_by' => $admin->id]);
        $this->postJson("/api/admin/orders/{$inTransit->id}/delivery-assignment", [
            'courier_profile_id' => $courier->id,
            'delivery_area_id' => $area->id,
            'expected_courier_profile_id' => null,
            'reason' => 'Current rider and parcel confirmed by administrator',
        ])->assertOk()->assertJsonPath('data.status', Delivery::OUT_FOR_DELIVERY);
        $this->assertSame(Delivery::OUT_FOR_DELIVERY, $inTransit->fresh()->status);
        $this->assertNull($legacyTransit->fresh()->delivery_picked_up_at);
        $this->assertNotNull($legacyTransit->fresh()->assigned_at);
        $this->assertDatabaseHas('delivery_events', ['delivery_id' => $legacyTransit->id, 'event_type' => 'legacy_current_delivery_reconciled', 'previous_status' => Delivery::OUT_FOR_DELIVERY, 'new_status' => Delivery::OUT_FOR_DELIVERY, 'actor_id' => $admin->id, 'reason' => 'Current rider and parcel confirmed by administrator']);
    }

    public function test_buyer_and_seller_order_responses_include_read_only_delivery_progress(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $seller->sellerProfile()->create([
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
            'business_name' => 'Seller Test Store',
            'line_of_business' => 'Retail',
        ]);
        $order = $this->order(Delivery::DELIVERED, $buyer);
        $area = DeliveryArea::create(['name' => 'Buyer projection area']);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::DELIVERED, 'delivery_area_id' => $area->id, 'delivered_at' => now()]);
        $pickupCourier = $this->eligibleCourier()[1];
        PickupAssignment::create(['order_id' => $order->id, 'delivery_id' => $delivery->id, 'courier_profile_id' => $pickupCourier->id, 'status' => PickupAssignment::RECEIVED]);
        $delivery->events()->create(['event_type' => 'status_changed', 'previous_status' => Delivery::OUT_FOR_DELIVERY, 'new_status' => Delivery::DELIVERED, 'created_at' => now(), 'reason' => 'Private administrative detail']);
        \App\Models\OrderItem::create(['order_id' => $order->id, 'product_id' => $this->product($seller)->id, 'seller_id' => $seller->id, 'quantity' => 1, 'unit_price' => 10, 'subtotal' => 10]);

        $this->actingAs($buyer, 'sanctum')->getJson("/api/orders/{$order->id}")->assertOk()
            ->assertJsonPath('data.delivery_progress.status', Delivery::DELIVERED)
            ->assertJsonPath('data.delivery_progress.pickup.status', PickupAssignment::RECEIVED)
            ->assertJsonPath('data.delivery_progress.delivery_area.name', 'Buyer projection area')
            ->assertJsonMissingPath('data.delivery_progress.events.0.reason');
        $this->actingAs($seller, 'sanctum')->getJson('/api/seller/orders')->assertOk()
            ->assertJsonPath('data.0.delivery_progress.status', Delivery::DELIVERED)
            ->assertJsonPath('data.0.seller.business_name', 'Seller Test Store')
            ->assertJsonPath('data.0.seller.email', $seller->email);
    }

    public function test_generic_admin_status_cannot_bypass_the_logistics_workflow(): void
    {
        $admin = $this->admin();
        $order = $this->order('READY_FOR_PICKUP');
        [, $profile] = $this->eligibleCourier();
        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$order->id}/status", ['status' => Delivery::DELIVERED])->assertUnprocessable();
        $this->postJson("/api/admin/orders/{$order->id}/pickup-assignment", ['courier_profile_id' => $profile->id])->assertOk();
        $this->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'CANCELLED'])->assertStatus(409);
        $this->assertSame('READY_FOR_PICKUP', $order->fresh()->status);
    }

    public function test_delivery_reassignment_is_allowed_only_before_collection_and_stale_competing_updates_conflict(): void
    {
        $admin = $this->admin();
        [$firstCourier, $firstProfile] = $this->eligibleCourier();
        [$secondCourier, $secondProfile] = $this->eligibleCourier();
        $area = DeliveryArea::create(['name' => 'Reassignment area']);
        $area->couriers()->attach([$firstProfile->id => ['assigned_by' => $admin->id], $secondProfile->id => ['assigned_by' => $admin->id]]);
        $order = $this->order(Delivery::ASSIGNED);
        $delivery = Delivery::create(['order_id' => $order->id, 'courier_profile_id' => $firstProfile->id, 'delivery_area_id' => $area->id, 'status' => Delivery::ASSIGNED]);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/orders/{$order->id}/delivery-assignment", [
            'courier_profile_id' => $secondProfile->id, 'delivery_area_id' => $area->id,
            'expected_courier_profile_id' => $firstProfile->id, 'reason' => 'Coverage reassignment',
        ])->assertOk();
        $this->assertSame($secondProfile->id, $delivery->fresh()->courier_profile_id);

        $this->actingAs($secondCourier, 'sanctum')->patchJson("/api/courier/deliveries/{$delivery->id}/status", [
            'status' => Delivery::OUT_FOR_DELIVERY, 'expected_status' => Delivery::ASSIGNED,
        ])->assertOk();
        $this->patchJson("/api/courier/deliveries/{$delivery->id}/status", [
            'status' => Delivery::DELIVERED, 'expected_status' => Delivery::OUT_FOR_DELIVERY,
        ])->assertUnprocessable();
        $this->patchJson("/api/courier/deliveries/{$delivery->id}/status", [
            'status' => Delivery::FAILED, 'expected_status' => Delivery::ASSIGNED, 'reason' => 'Conflicting stale operation',
        ])->assertStatus(409);
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/orders/{$order->id}/delivery-assignment", [
            'courier_profile_id' => $firstProfile->id, 'delivery_area_id' => $area->id,
            'expected_courier_profile_id' => $secondProfile->id, 'reason' => 'Too late to reassign',
        ])->assertUnprocessable();
        $this->assertSame(Delivery::OUT_FOR_DELIVERY, $order->fresh()->status);
    }

    private function assignPickup(User $admin, Order $order, CourierProfile $profile): PickupAssignment
    {
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/orders/{$order->id}/pickup-assignment", ['courier_profile_id' => $profile->id])->assertOk();
        return PickupAssignment::where('order_id', $order->id)->firstOrFail();
    }

    private function eligibleCourier(string $status = 'active', bool $verified = true, bool $approvedDocuments = true, bool $vehicle = true): array
    {
        $user = User::factory()->create(['role' => 'rider', 'status' => $status, 'email_verified_at' => $verified ? now() : null]);
        $profile = CourierProfile::create(['user_id' => $user->id, 'sex' => 'prefer_not_to_say', 'birthday' => '1990-01-01']);
        foreach (['valid_id', 'or_cr', 'drivers_license'] as $type) {
            UserDocument::create(['user_id' => $user->id, 'document_type' => $type, 'file_path' => "private/test/{$user->id}-{$type}.pdf", 'status' => $approvedDocuments ? 'approved' : 'pending']);
        }
        if ($vehicle) Vehicle::create(['courier_profile_id' => $profile->id, 'vehicle_type' => 'motorcycle', 'plate_number' => 'TEST'.str_pad((string) $profile->id, 6, '0', STR_PAD_LEFT)]);
        return [$user, $profile];
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    private function order(string $status, ?User $buyer = null): Order
    {
        $buyer ??= User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        return Order::create(['buyer_id' => $buyer->id, 'delivery_address' => 'Test delivery address', 'payment_method' => 'cash_on_delivery', 'subtotal' => 10, 'shipping_fee' => 0, 'total_amount' => 10, 'status' => $status]);
    }

    private function product(User $seller): \App\Models\Product
    {
        return \App\Models\Product::create(['seller_id' => $seller->id, 'name' => 'Delivery test product', 'description' => 'Fixture', 'price' => 10, 'stock' => 2, 'category' => 'Other', 'status' => 'active']);
    }
}
