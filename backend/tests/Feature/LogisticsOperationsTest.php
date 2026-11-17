<?php

namespace Tests\Feature;

use App\Mail\AccountReactivationMail;
use App\Mail\AccountSuspensionMail;
use App\Models\Address;
use App\Models\CourierPresence;
use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\GeographicLocation;
use App\Models\HubTransfer;
use App\Models\HubTransferShipment;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PickupAssignment;
use App\Models\Product;
use App\Models\SellerPickupAddress;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LogisticsOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_logistics_queue_exposes_courier_availability_and_active_delivery_workload(): void
    {
        $logistics = $this->logisticsUser();
        [, $availableProfile] = $this->eligibleCourier();
        [, $busyProfile] = $this->eligibleCourier();
        CourierPresence::create([
            'courier_profile_id' => $availableProfile->id,
            'is_available' => true,
            'latitude' => 10.3157,
            'longitude' => 123.8854,
            'location_updated_at' => now(),
        ]);
        CourierPresence::create([
            'courier_profile_id' => $busyProfile->id,
            'is_available' => false,
        ]);

        foreach ([Delivery::ASSIGNED, Delivery::OUT_FOR_DELIVERY] as $status) {
            $order = $this->order($status);
            Delivery::create([
                'order_id' => $order->id,
                'courier_profile_id' => $busyProfile->id,
                'status' => $status,
            ]);
        }

        $couriers = $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/operations')
            ->assertOk()
            ->json('data.eligible_delivery_couriers');
        $courierById = collect($couriers)->keyBy('id');

        $this->assertTrue($courierById[$availableProfile->id]['is_available']);
        $this->assertSame(0, $courierById[$availableProfile->id]['active_delivery_count']);
        $this->assertFalse($courierById[$busyProfile->id]['is_available']);
        $this->assertSame(2, $courierById[$busyProfile->id]['active_delivery_count']);
    }

    public function test_logistics_can_assign_pickup_and_confirm_collected_parcel_receipt(): void
    {
        $logistics = $this->logisticsUser();
        [$courierUser, $courierProfile] = $this->eligibleCourier();
        CourierPresence::create([
            'courier_profile_id' => $courierProfile->id,
            'is_available' => true,
        ]);
        $order = $this->orderWithPickupAddress('READY_FOR_PICKUP');
        Delivery::create([
            'order_id' => $order->id,
            'status' => 'READY_FOR_PICKUP',
            'legacy_imported' => false,
        ]);

        $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/operations')
            ->assertOk()
            ->assertJsonPath('data.pickup_orders.0.id', $order->id);

        $this->requestPickupFromSeller($order);
        $this->actingAs($logistics, 'sanctum');
        $this->postJson("/api/logistics/orders/{$order->id}/pickup-decision", ['decision' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.status', PickupAssignment::ACCEPTED_BY_LOGISTICS);
        $this->postJson("/api/logistics/orders/{$order->id}/pickup-assignment", [
            'courier_profile_id' => $courierProfile->id,
            'scheduled_at' => now()->addDay()->toISOString(),
        ])->assertOk();
        $assignment = PickupAssignment::where('order_id', $order->id)->firstOrFail();
        $courierNotifications = $this->actingAs($courierUser, 'sanctum')
            ->getJson('/api/courier/notifications')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 1)
            ->assertJsonPath('data.notifications.0.data.notification_type', 'parcel_assigned')
            ->assertJsonPath('data.notifications.0.data.task_type', 'pickup')
            ->assertJsonPath('data.notifications.0.data.task_id', $assignment->id)
            ->assertJsonPath('data.notifications.0.data.order_id', $order->id)
            ->json('data.notifications.0.id');
        $this->patchJson("/api/courier/notifications/{$courierNotifications}/read")
            ->assertOk();
        $this->getJson('/api/courier/notifications')
            ->assertJsonPath('data.unread_count', 0);
        $this->actingAs($logistics, 'sanctum');
        $hub = $assignment->targetHub;
        $this->assertSame($logistics->id, $assignment->assigned_by);
        $this->assertNotNull($hub);
        $this->assertSame($hub->id, $assignment->target_hub_id);
        $this->assertStringContainsString('Luyang', $assignment->pickup_address);
        $this->assertStringContainsString('6005', $assignment->pickup_address);

        $assignment->update([
            'status' => PickupAssignment::PICKED_UP,
            'picked_up_at' => now(),
        ]);
        Delivery::where('order_id', $order->id)->update(['status' => Delivery::PICKED_UP, 'picked_up_at' => now()]);
        $order->update(['status' => Delivery::PICKED_UP]);
        $inactiveHub = LogisticsHub::create(['name' => 'Inactive Test Hub', 'code' => 'INACTIVE-TEST', 'is_active' => false]);

        $this->patchJson("/api/logistics/orders/{$order->id}/sorting-receipt", [
            'expected_status' => Delivery::PICKED_UP,
        ])->assertUnprocessable();
        $this->patchJson("/api/logistics/orders/{$order->id}/sorting-receipt", [
            'expected_status' => Delivery::PICKED_UP,
            'hub_id' => $inactiveHub->id,
            'parcel_code' => Delivery::where('order_id', $order->id)->value('parcel_code'),
        ])->assertUnprocessable();
        $parcelCode = Delivery::where('order_id', $order->id)->value('parcel_code');
        $this->patchJson("/api/logistics/orders/{$order->id}/sorting-receipt", ['expected_status' => Delivery::PICKED_UP, 'hub_id' => $hub->id, 'parcel_code' => 'CRYMA-PCL-AAAAAAAAAAAAAAAAAAAA'])->assertNotFound();
        $this->patchJson("/api/logistics/orders/{$order->id}/sorting-receipt", ['expected_status' => Delivery::PICKED_UP, 'hub_id' => $hub->id])->assertUnprocessable();
        $this->patchJson("/api/logistics/orders/{$order->id}/sorting-receipt", ['expected_status' => Delivery::PICKED_UP, 'hub_id' => $hub->id, 'parcel_code' => 'malformed'])->assertUnprocessable();
        $wrongHub = LogisticsHub::query()->where('is_active', true)->whereKeyNot($hub->id)->firstOrFail();
        $this->patchJson("/api/logistics/orders/{$order->id}/sorting-receipt", [
            'expected_status' => Delivery::PICKED_UP,
            'hub_id' => $wrongHub->id,
            'parcel_code' => $parcelCode,
        ])->assertUnprocessable();

        $this->patchJson("/api/logistics/orders/{$order->id}/sorting-receipt", [
            'expected_status' => Delivery::PICKED_UP,
            'hub_id' => $hub->id,
            'parcel_code' => $parcelCode,
        ])->assertOk()->assertJsonPath('message', 'Sorting-center receipt confirmed.');

        $this->assertSame(PickupAssignment::RECEIVED, $assignment->fresh()->status);
        $this->assertNotNull($assignment->fresh()->received_at);
        $this->assertSame(Delivery::AT_SORTING_CENTER, $order->fresh()->status);
        $this->assertSame($hub->id, Delivery::where('order_id', $order->id)->value('current_hub_id'));
        $this->assertDatabaseHas('delivery_events', [
            'delivery_id' => $assignment->delivery_id,
            'actor_id' => $logistics->id,
            'event_type' => 'sorting_center_received',
            'new_status' => Delivery::AT_SORTING_CENTER,
        ]);
        $this->patchJson("/api/logistics/orders/{$order->id}/sorting-receipt", [
            'expected_status' => Delivery::PICKED_UP,
            'hub_id' => $hub->id,
            'parcel_code' => $parcelCode,
        ])->assertStatus(409);
    }

    public function test_logistics_can_assign_pickups_to_eligible_global_riders_without_presence(): void
    {
        $logistics = $this->logisticsUser('Talisay');
        [, $localProfile] = $this->eligibleCourier();
        CourierPresence::create(['courier_profile_id' => $localProfile->id, 'is_available' => true]);
        [, $unavailableProfile] = $this->eligibleCourier();
        [$outsideRider, $outsideProfile] = $this->eligibleCourier('Talisay');
        CourierPresence::create(['courier_profile_id' => $outsideProfile->id, 'is_available' => true]);
        [, $inactiveProfile] = $this->eligibleCourier('Carmen', 'suspended');
        $order = $this->orderWithPickupAddress('READY_FOR_PICKUP');
        $outsideOrder = $this->orderWithPickupAddress('READY_FOR_PICKUP');

        $response = $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/operations')
            ->assertOk();
        $pickupCouriers = $response->json('data.eligible_pickup_couriers');

        $this->assertEqualsCanonicalizing(
            [$localProfile->id, $unavailableProfile->id, $outsideProfile->id],
            array_column($pickupCouriers, 'id'),
        );
        $this->assertEqualsCanonicalizing(
            [$order->id, $outsideOrder->id],
            array_column($response->json('data.pickup_orders'), 'id'),
        );
        $this->requestPickupFromSeller($order);
        $this->actingAs($logistics, 'sanctum');
        $this->postJson("/api/logistics/orders/{$order->id}/pickup-assignment", [
            'courier_profile_id' => $unavailableProfile->id,
            'scheduled_at' => now()->addDay()->toISOString(),
        ])->assertUnprocessable();
        $this->postJson("/api/logistics/orders/{$order->id}/pickup-assignment", [
            'courier_profile_id' => $inactiveProfile->id,
            'scheduled_at' => now()->addDay()->toISOString(),
        ])->assertUnprocessable();
        $this->postJson("/api/logistics/orders/{$order->id}/pickup-decision", ['decision' => 'accepted'])->assertOk();
        $assignmentResponse = $this->postJson("/api/logistics/orders/{$order->id}/pickup-assignment", [
            'courier_profile_id' => $unavailableProfile->id,
            'scheduled_at' => now()->addDay()->toISOString(),
        ]);
        $assignmentResponse->assertOk()->assertJsonPath('data.status', PickupAssignment::ASSIGNED);
        $this->assertDatabaseHas('pickup_assignments', [
            'order_id' => $order->id,
            'courier_profile_id' => $unavailableProfile->id,
            'assigned_by' => $logistics->id,
        ]);
        $this->postJson("/api/logistics/orders/{$order->id}/pickup-assignment", [
            'courier_profile_id' => $outsideProfile->id,
            'expected_courier_profile_id' => $unavailableProfile->id,
            'scheduled_at' => now()->addDays(2)->toISOString(),
        ])->assertOk()->assertJsonPath('data.courier_profile_id', $outsideProfile->id);

        $this->requestPickupFromSeller($outsideOrder);
        $this->actingAs($logistics, 'sanctum')
            ->postJson("/api/logistics/orders/{$outsideOrder->id}/pickup-decision", ['decision' => 'accepted'])
            ->assertOk();
        $outsideAssignment = $this->postJson("/api/logistics/orders/{$outsideOrder->id}/pickup-assignment", [
            'courier_profile_id' => $outsideProfile->id,
            'scheduled_at' => now()->addDay()->toISOString(),
        ]);
        $outsideAssignment->assertOk()->assertJsonPath('data.status', PickupAssignment::ASSIGNED);
        $pickupTasks = $this->actingAs($outsideRider, 'sanctum')
            ->getJson('/api/courier/pickups')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->json('data');
        $outsidePickupTask = collect($pickupTasks)->firstWhere('order_id', $outsideOrder->id);
        $this->assertNotNull($outsidePickupTask);
        $this->assertSame($outsideAssignment->json('data.id'), $outsidePickupTask['id']);
        $this->assertSame($outsideAssignment->json('data.target_hub_id'), $outsidePickupTask['target_hub']['id']);
    }

    public function test_logistics_can_sort_and_assign_only_to_eligible_courier_in_configured_area(): void
    {
        $logistics = $this->logisticsUser();
        [$courier, $courierProfile] = $this->eligibleCourier();
        [, $otherProfile] = $this->eligibleCourier();
        $hub = LogisticsHub::where('is_active', true)->firstOrFail();
        $area = DeliveryArea::create(['name' => 'Logistics delivery area', 'is_active' => true, 'hub_id' => $hub->id]);
        $area->couriers()->attach($courierProfile->id, ['assigned_by' => $logistics->id]);
        $otherHub = LogisticsHub::create(['name' => 'Different sorting hub', 'code' => 'OTHER-SORT-HUB', 'is_active' => true]);
        $otherArea = DeliveryArea::create(['name' => 'Other hub delivery area', 'is_active' => true, 'hub_id' => $otherHub->id]);
        $otherArea->couriers()->attach($courierProfile->id, ['assigned_by' => $logistics->id]);
        $order = $this->order(Delivery::AT_SORTING_CENTER);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::AT_SORTING_CENTER, 'current_hub_id' => $hub->id]);

        $this->actingAs($logistics, 'sanctum')
            ->patchJson("/api/logistics/orders/{$order->id}/sort-and-assign", [
                'delivery_area_id' => $area->id,
                'courier_profile_id' => $courierProfile->id,
                'expected_status' => Delivery::AT_SORTING_CENTER,
            ])->assertUnprocessable();

        $this->patchJson("/api/logistics/orders/{$order->id}/scan", [
            'expected_status' => Delivery::AT_SORTING_CENTER,
            'parcel_code' => 'CRYMA-PCL-WRONGCODE00000000',
        ])->assertUnprocessable();
        $this->patchJson("/api/logistics/orders/{$order->id}/scan", [
            'expected_status' => Delivery::AT_SORTING_CENTER,
            'parcel_code' => $delivery->parcel_code,
        ])->assertOk()->assertJsonPath('message', 'Parcel scanned. Its destination area is matched from the saved delivery address; resolve any routing exception before dispatch.');
        $this->postJson('/api/logistics/parcels/scan', ['parcel_code' => 'CRYMA-PCL-AAAAAAAAAAAAAAAAAAAA'])->assertNotFound();
        $this->postJson('/api/logistics/parcels/scan', ['parcel_code' => $delivery->parcel_code])->assertOk();
        $this->patchJson("/api/logistics/orders/{$order->id}/sort-and-assign", ['delivery_area_id' => $otherArea->id, 'courier_profile_id' => $courierProfile->id, 'expected_status' => Delivery::AT_SORTING_CENTER])->assertStatus(409);
        $this->patchJson("/api/logistics/orders/{$order->id}/scan", ['expected_status' => Delivery::AT_SORTING_CENTER])->assertUnprocessable();
        $this->patchJson("/api/logistics/orders/{$order->id}/scan", [
            'expected_status' => Delivery::AT_SORTING_CENTER,
            'parcel_code' => $delivery->parcel_code,
        ])->assertOk();
        $this->assertSame(1, $delivery->events()->where('event_type', 'parcel_scanned')->count());
        $this->assertDatabaseHas('delivery_events', [
            'delivery_id' => $delivery->id,
            'actor_id' => $logistics->id,
            'event_type' => 'parcel_scanned',
            'previous_status' => Delivery::AT_SORTING_CENTER,
            'new_status' => Delivery::AT_SORTING_CENTER,
        ]);

        $this->patchJson("/api/logistics/orders/{$order->id}/sort-and-assign", [
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
        $this->actingAs($courier, 'sanctum')
            ->getJson('/api/courier/notifications')
            ->assertOk()
            ->assertJsonPath('data.notifications.0.data.task_type', 'delivery')
            ->assertJsonPath('data.notifications.0.data.task_id', $delivery->id)
            ->assertJsonPath('data.notifications.0.data.order_id', $order->id);
        $this->getJson('/api/courier/deliveries')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $delivery->id);
    }

    public function test_parcel_flow_lists_all_hub_inventory_and_marks_transfer_requirements(): void
    {
        $logistics = $this->logisticsUser();
        $origin = LogisticsHub::where('is_active', true)->firstOrFail();
        $destination = LogisticsHub::create(['name' => 'Inventory destination hub', 'code' => 'INVENTORY-DEST', 'is_active' => true]);
        $destinationArea = DeliveryArea::create(['name' => 'Inventory destination area', 'is_active' => true, 'hub_id' => $destination->id]);
        $originArea = DeliveryArea::create(['name' => 'Inventory origin area', 'is_active' => true, 'hub_id' => $origin->id]);
        $transferDelivery = null;

        for ($i = 0; $i < 101; $i++) {
            $order = $this->order(Delivery::AT_SORTING_CENTER);
            $delivery = Delivery::create([
                'order_id' => $order->id,
                'status' => Delivery::AT_SORTING_CENTER,
                'current_hub_id' => $origin->id,
                'delivery_area_id' => $destinationArea->id,
            ]);
            $transferDelivery ??= $delivery;
        }

        $localOrder = $this->order(Delivery::SORTED);
        $localDelivery = Delivery::create([
            'order_id' => $localOrder->id,
            'status' => Delivery::SORTED,
            'current_hub_id' => $origin->id,
            'delivery_area_id' => $originArea->id,
        ]);

        $response = $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/parcel-flow')
            ->assertOk();
        $deliveries = collect($response->json('data.deliveries'))->keyBy('id');

        $this->assertCount(102, $deliveries);
        $this->assertTrue($deliveries[$transferDelivery->id]['requires_transfer']);
        $this->assertFalse($deliveries[$localDelivery->id]['requires_transfer']);
    }

    public function test_logistics_can_assign_a_scanned_parcel_for_global_direct_delivery(): void
    {
        $logistics = $this->logisticsUser();
        [$courier, $courierProfile] = $this->eligibleCourier('Talisay');
        [$replacementCourier, $replacementProfile] = $this->eligibleCourier('Talisay');
        CourierPresence::create(['courier_profile_id' => $courierProfile->id, 'is_available' => true]);
        $hub = LogisticsHub::where('is_active', true)->firstOrFail();
        $order = $this->order(Delivery::AT_SORTING_CENTER);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'status' => Delivery::AT_SORTING_CENTER,
            'current_hub_id' => $hub->id,
        ]);
        $this->actingAs($logistics, 'sanctum');
        $courierAvailability = collect($this->getJson('/api/logistics/parcel-flow')
            ->assertOk()
            ->json('data.couriers'))
            ->keyBy('id');
        $this->assertTrue($courierAvailability[$courierProfile->id]['is_available']);
        $this->assertFalse($courierAvailability[$replacementProfile->id]['is_available']);

        $this->postJson("/api/logistics/orders/{$order->id}/direct-delivery", [
            'courier_profile_id' => $courierProfile->id,
            'expected_status' => Delivery::AT_SORTING_CENTER,
        ])->assertUnprocessable();

        $this->patchJson("/api/logistics/orders/{$order->id}/scan", [
            'expected_status' => Delivery::AT_SORTING_CENTER,
            'parcel_code' => $delivery->parcel_code,
        ])->assertOk();

        $this->postJson("/api/logistics/orders/{$order->id}/direct-delivery", [
            'courier_profile_id' => $replacementProfile->id,
            'expected_status' => Delivery::AT_SORTING_CENTER,
        ])->assertUnprocessable();

        $this->postJson("/api/logistics/orders/{$order->id}/direct-delivery", [
            'courier_profile_id' => $courierProfile->id,
            'expected_status' => Delivery::AT_SORTING_CENTER,
        ])->assertOk()
            ->assertJsonPath('message', 'Parcel assigned for direct delivery to the buyer.')
            ->assertJsonPath('data.status', Delivery::ASSIGNED)
            ->assertJsonPath('data.courier_profile_id', $courierProfile->id);

        $this->assertSame(Delivery::ASSIGNED, $order->fresh()->status);
        $this->assertDatabaseHas('delivery_events', [
            'delivery_id' => $delivery->id,
            'actor_id' => $logistics->id,
            'hub_id' => $hub->id,
            'event_type' => 'direct_delivery_assigned',
            'new_status' => Delivery::ASSIGNED,
            'courier_profile_id' => $courierProfile->id,
        ]);
        $this->actingAs($courier, 'sanctum')
            ->getJson('/api/courier/notifications')
            ->assertOk()
            ->assertJsonPath('data.notifications.0.data.task_type', 'delivery')
            ->assertJsonPath('data.notifications.0.data.task_id', $delivery->id)
            ->assertJsonPath('data.notifications.0.data.order_id', $order->id);
        $this->getJson('/api/courier/deliveries')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $delivery->id);

        CourierPresence::where('courier_profile_id', $courierProfile->id)->update(['is_available' => false]);
        CourierPresence::create(['courier_profile_id' => $replacementProfile->id, 'is_available' => true]);
        $this->actingAs($logistics, 'sanctum');
        $this->postJson("/api/logistics/orders/{$order->id}/direct-delivery", [
            'courier_profile_id' => $replacementProfile->id,
            'expected_status' => Delivery::ASSIGNED,
            'expected_courier_profile_id' => 999999,
        ])->assertStatus(409);
        $this->postJson("/api/logistics/orders/{$order->id}/direct-delivery", [
            'courier_profile_id' => $replacementProfile->id,
            'expected_status' => Delivery::ASSIGNED,
            'expected_courier_profile_id' => $courierProfile->id,
        ])->assertOk()
            ->assertJsonPath('message', 'Direct delivery rider assignment updated.')
            ->assertJsonPath('data.courier_profile_id', $replacementProfile->id);

        $this->assertDatabaseHas('delivery_events', [
            'delivery_id' => $delivery->id,
            'event_type' => 'direct_delivery_reassigned',
            'previous_courier_profile_id' => $courierProfile->id,
            'courier_profile_id' => $replacementProfile->id,
        ]);
        $this->actingAs($courier, 'sanctum')->getJson('/api/courier/deliveries')
            ->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($replacementCourier, 'sanctum')->getJson('/api/courier/deliveries')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.parcel_code', $delivery->parcel_code);
    }

    public function test_bulk_shipment_inventory_uses_the_seller_and_buyer_municipality_hubs(): void
    {
        $logistics = $this->logisticsUser();
        $region = GeographicLocation::create(['code' => '9100000000', 'name' => 'Bulk Route Region', 'level' => 'Reg']);
        $originMunicipality = GeographicLocation::create([
            'code' => '9100000100',
            'name' => 'Bulk Origin Municipality',
            'level' => 'Mun',
            'parent_code' => $region->code,
        ]);
        $destinationMunicipality = GeographicLocation::create([
            'code' => '9100000200',
            'name' => 'Bulk Destination Municipality',
            'level' => 'Mun',
            'parent_code' => $region->code,
        ]);
        $destinationBarangay = GeographicLocation::create([
            'code' => '9100000201',
            'name' => 'Bulk Destination Barangay',
            'level' => 'Bgy',
            'parent_code' => $destinationMunicipality->code,
        ]);
        $origin = LogisticsHub::create([
            'name' => 'Bulk origin hub',
            'code' => 'BULK-ORIGIN',
            'psgc_code' => $originMunicipality->code,
            'is_active' => true,
        ]);
        $destination = LogisticsHub::create([
            'name' => 'Bulk destination hub',
            'code' => 'BULK-DEST',
            'psgc_code' => $destinationMunicipality->code,
            'is_active' => true,
        ]);
        DeliveryArea::create([
            'name' => 'Bulk destination area',
            'psgc_code' => $destinationMunicipality->code,
            'hub_id' => $destination->id,
            'is_active' => true,
        ]);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        SellerPickupAddress::create([
            'user_id' => $seller->id,
            'recipient_name' => 'Bulk Seller',
            'phone' => '+639171234567',
            'region' => 'Bulk Route Region',
            'municipality' => 'Bulk Origin Municipality',
            'barangay' => 'Seller Barangay',
            'street' => 'Market Road',
            'house_number' => '18',
            'postal_code' => '6005',
        ]);
        $order = $this->order(Delivery::SORTED);
        $order->update(['delivery_psgc_code' => $destinationBarangay->code]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Bulk route product',
            'description' => 'Synthetic fixture',
            'price' => 10,
            'stock' => 1,
            'category' => 'Other',
            'status' => 'active',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'seller_id' => $seller->id,
            'quantity' => 1,
            'unit_price' => 10,
            'subtotal' => 10,
        ]);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'status' => Delivery::SORTED,
            'current_hub_id' => $origin->id,
        ]);

        $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/parcel-flow')
            ->assertOk()
            ->assertJsonPath('data.deliveries.0.seller_origin.municipality', $originMunicipality->name)
            ->assertJsonPath('data.deliveries.0.seller_origin.hub.id', $origin->id)
            ->assertJsonPath('data.deliveries.0.buyer_destination.municipality', $destinationMunicipality->name)
            ->assertJsonPath('data.deliveries.0.buyer_destination.hub.id', $destination->id)
            ->assertJsonPath('data.deliveries.0.bulk_shipment_available', true);

        $this->postJson('/api/logistics/hub-transfer-shipments', [
            'delivery_ids' => [$delivery->id],
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
            'carrier_code' => 'manual',
            'carrier_name' => 'Manual carrier',
            'tracking_reference' => 'BULK-ROUTE-TRACK',
            'shipment_reference' => 'BULK-ROUTE-01',
        ])->assertCreated();
        $this->assertSame($destination->id, $delivery->fresh()->deliveryArea?->hub_id);

        $this->assertDatabaseHas('hub_transfers', [
            'delivery_id' => $delivery->id,
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
            'shipment_reference' => 'BULK-ROUTE-01',
        ]);

        Address::create([
            'user_id' => $logistics->id,
            'is_default' => true,
            'psgc_code' => $destinationMunicipality->code,
            'region' => $region->name,
            'province' => 'Bulk Route Province',
            'municipality' => $destinationMunicipality->name,
            'barangay' => $destinationBarangay->name,
        ]);
        $this->patchJson('/api/logistics/hub-transfer-shipments/BULK-ROUTE-01/dispatch')
            ->assertOk();
        $this->patchJson('/api/logistics/hub-transfer-shipments/BULK-ROUTE-01/receive', [
            'tracking_reference' => 'BULK-ROUTE-TRACK',
        ])->assertOk();
        $this->getJson('/api/logistics/operations')
            ->assertOk()
            ->assertJsonPath('data.sorting_orders.0.delivery.delivery_area.hub_id', $destination->id);
    }

    public function test_logistics_receives_all_incoming_bulk_parcels_by_tracking_reference_at_their_municipality_hub(): void
    {
        $region = GeographicLocation::create(['code' => '9200000000', 'name' => 'Arrival Region', 'level' => 'Reg']);
        $municipality = GeographicLocation::create([
            'code' => '9200000100',
            'name' => 'Arrival Municipality',
            'level' => 'Mun',
            'parent_code' => $region->code,
        ]);
        $logistics = User::factory()->create([
            'role' => 'logistics',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        Address::create([
            'user_id' => $logistics->id,
            'is_default' => true,
            'psgc_code' => $municipality->code,
            'region' => $region->name,
            'province' => 'Arrival Province',
            'municipality' => $municipality->name,
            'barangay' => 'Arrival Barangay',
        ]);
        $origin = LogisticsHub::create(['name' => 'Arrival origin', 'code' => 'ARRIVAL-ORIGIN', 'is_active' => true]);
        $destination = LogisticsHub::create([
            'name' => 'Arrival destination',
            'code' => 'ARRIVAL-DEST',
            'psgc_code' => $municipality->code,
            'is_active' => true,
        ]);
        $deliveries = collect([1, 2])->map(function () use ($origin) {
            $order = $this->order(Delivery::SORTED);

            return Delivery::create([
                'order_id' => $order->id,
                'status' => Delivery::SORTED,
                'current_hub_id' => $origin->id,
            ]);
        });

        $this->actingAs($logistics, 'sanctum')->postJson('/api/logistics/hub-transfer-shipments', [
            'delivery_ids' => $deliveries->pluck('id')->all(),
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
            'carrier_code' => 'manual',
            'carrier_name' => 'Manual carrier',
            'tracking_reference' => 'ARRIVAL-TRACK-01',
            'shipment_reference' => 'ARRIVAL-SHIPMENT-01',
        ])->assertCreated();
        $this->patchJson('/api/logistics/hub-transfer-shipments/ARRIVAL-SHIPMENT-01/dispatch')
            ->assertOk();
        $items = $this->getJson('/api/logistics/parcel-flow')
            ->assertOk()
            ->assertJsonPath('data.current_user_hub.id', $destination->id)
            ->assertJsonPath('data.incoming_shipments.0.shipment_reference', 'ARRIVAL-SHIPMENT-01')
            ->assertJsonCount(2, 'data.incoming_shipments.0.items');
        $this->assertSame(2, count($items->json('data.incoming_shipments.0.items')));

        $this->patchJson('/api/logistics/hub-transfer-shipments/ARRIVAL-SHIPMENT-01/receive', [
            'tracking_reference' => 'WRONG-TRACK',
        ])->assertUnprocessable();
        $this->assertSame(2, HubTransfer::where('shipment_reference', 'ARRIVAL-SHIPMENT-01')->where('status', 'in_transit')->count());

        $otherMunicipality = GeographicLocation::create([
            'code' => '9200000200',
            'name' => 'Other Arrival Municipality',
            'level' => 'Mun',
            'parent_code' => $region->code,
        ]);
        $otherLogistics = User::factory()->create([
            'role' => 'logistics',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        Address::create([
            'user_id' => $otherLogistics->id,
            'is_default' => true,
            'psgc_code' => $otherMunicipality->code,
            'region' => $region->name,
            'province' => 'Arrival Province',
            'municipality' => $otherMunicipality->name,
            'barangay' => 'Other Arrival Barangay',
        ]);
        LogisticsHub::create([
            'name' => 'Other arrival hub',
            'code' => 'ARRIVAL-OTHER',
            'psgc_code' => $otherMunicipality->code,
            'is_active' => true,
        ]);
        $this->actingAs($otherLogistics, 'sanctum')
            ->patchJson('/api/logistics/hub-transfer-shipments/ARRIVAL-SHIPMENT-01/receive', [
                'tracking_reference' => 'ARRIVAL-TRACK-01',
            ])
            ->assertNotFound();
        $this->assertSame(2, HubTransfer::where('shipment_reference', 'ARRIVAL-SHIPMENT-01')->where('status', 'in_transit')->count());

        $this->actingAs($logistics, 'sanctum');
        $this->patchJson('/api/logistics/hub-transfer-shipments/ARRIVAL-SHIPMENT-01/receive', [
            'tracking_reference' => 'ARRIVAL-TRACK-01',
        ])->assertOk()
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.items.0.status', 'arrived');
        $this->assertSame(2, HubTransfer::where('shipment_reference', 'ARRIVAL-SHIPMENT-01')->where('status', 'arrived')->count());
        $this->assertSame(2, Delivery::whereIn('id', $deliveries->pluck('id'))->where('current_hub_id', $destination->id)->count());
    }

    public function test_logistics_auto_routes_a_saved_barangay_to_its_delivery_hub(): void
    {
        $logistics = $this->logisticsUser();
        [, $transferCourier] = $this->eligibleCourier();
        $origin = LogisticsHub::create(['name' => 'Origin route hub', 'code' => 'ORIGIN-ROUTE', 'is_active' => true]);
        $destination = LogisticsHub::create(['name' => 'Destination route hub', 'code' => 'DEST-ROUTE', 'is_active' => true]);
        $region = GeographicLocation::create(['code' => '9900000000', 'name' => 'Route Test Region', 'level' => 'Reg']);
        $municipality = GeographicLocation::create(['code' => '9900000100', 'name' => 'Route Test Municipality', 'level' => 'Mun', 'parent_code' => $region->code]);
        $barangay = GeographicLocation::create(['code' => '9900000101', 'name' => 'Route Test Barangay', 'level' => 'Bgy', 'parent_code' => $municipality->code]);
        $area = DeliveryArea::create([
            'name' => 'Mapped route area',
            'psgc_code' => $municipality->code,
            'hub_id' => $destination->id,
            'is_active' => true,
        ]);
        $order = $this->order(Delivery::AT_SORTING_CENTER);
        $order->update(['delivery_psgc_code' => $barangay->code]);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'status' => Delivery::AT_SORTING_CENTER,
            'current_hub_id' => $origin->id,
        ]);

        $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/operations')
            ->assertOk()
            ->assertJsonPath('data.sorting_orders.0.destination_route.status', 'mapped')
            ->assertJsonPath('data.sorting_orders.0.destination_route.area.id', $area->id);

        $this->patchJson("/api/logistics/orders/{$order->id}/scan", [
            'expected_status' => Delivery::AT_SORTING_CENTER,
            'parcel_code' => $delivery->parcel_code,
        ])->assertOk();

        $this->patchJson("/api/logistics/orders/{$order->id}/sort-and-assign", [
            'expected_status' => Delivery::AT_SORTING_CENTER,
        ])->assertOk()
            ->assertJsonPath('message', 'Parcel sorted and automatically routed. Create a transfer to its destination hub before assigning final-mile delivery.');

        $this->assertSame(Delivery::SORTED, $delivery->fresh()->status);
        $this->assertSame($area->id, $delivery->fresh()->delivery_area_id);
        $this->assertNull($delivery->fresh()->courier_profile_id);

        $this->postJson('/api/logistics/hub-transfers', [
            'shipment_type' => 'delivery',
            'shipment_id' => $delivery->id,
            'courier_profile_id' => $transferCourier->id,
        ])->assertCreated()
            ->assertJsonPath('data.from_hub_id', $origin->id)
            ->assertJsonPath('data.to_hub_id', $destination->id);
    }

    public function test_unmapped_parcel_stays_in_routing_exception_queue_without_a_guessed_destination(): void
    {
        $logistics = $this->logisticsUser();
        $hub = LogisticsHub::create(['name' => 'Unmapped route hub', 'code' => 'UNMAPPED-ROUTE', 'is_active' => true]);
        $region = GeographicLocation::create(['code' => '9800000000', 'name' => 'Unmapped Test Region', 'level' => 'Reg']);
        $municipality = GeographicLocation::create(['code' => '9800000100', 'name' => 'Unmapped Test Municipality', 'level' => 'Mun', 'parent_code' => $region->code]);
        $barangay = GeographicLocation::create(['code' => '9800000101', 'name' => 'Unmapped Test Barangay', 'level' => 'Bgy', 'parent_code' => $municipality->code]);
        $order = $this->order(Delivery::AT_SORTING_CENTER);
        $order->update(['delivery_psgc_code' => $barangay->code]);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'status' => Delivery::AT_SORTING_CENTER,
            'current_hub_id' => $hub->id,
        ]);

        $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/operations')
            ->assertOk()
            ->assertJsonPath('data.sorting_orders.0.destination_route.status', 'unmapped');

        $this->patchJson("/api/logistics/orders/{$order->id}/scan", [
            'expected_status' => Delivery::AT_SORTING_CENTER,
            'parcel_code' => $delivery->parcel_code,
        ])->assertOk();

        $this->patchJson("/api/logistics/orders/{$order->id}/sort-and-assign", [
            'expected_status' => Delivery::AT_SORTING_CENTER,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'This parcel needs a routing exception review. Map its destination address to an active delivery area first.');

        $this->assertSame(Delivery::AT_SORTING_CENTER, $delivery->fresh()->status);
        $this->assertNull($delivery->fresh()->delivery_area_id);
    }

    public function test_manual_routing_exception_is_retained_for_hub_transfer_and_requires_a_note(): void
    {
        $logistics = $this->logisticsUser();
        [, $transferCourier] = $this->eligibleCourier();
        $origin = LogisticsHub::create(['name' => 'Manual route origin', 'code' => 'MANUAL-ORIGIN', 'is_active' => true]);
        $destination = LogisticsHub::create(['name' => 'Manual route destination', 'code' => 'MANUAL-DEST', 'is_active' => true]);
        $region = GeographicLocation::create(['code' => '9700000000', 'name' => 'Manual Route Region', 'level' => 'Reg']);
        $municipality = GeographicLocation::create(['code' => '9700000100', 'name' => 'Manual Route Municipality', 'level' => 'Mun', 'parent_code' => $region->code]);
        $barangay = GeographicLocation::create(['code' => '9700000101', 'name' => 'Manual Route Barangay', 'level' => 'Bgy', 'parent_code' => $municipality->code]);
        $area = DeliveryArea::create([
            'name' => 'Manually reviewed area',
            'hub_id' => $destination->id,
            'is_active' => true,
        ]);
        $order = $this->order(Delivery::AT_SORTING_CENTER);
        $order->update(['delivery_psgc_code' => $barangay->code]);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'status' => Delivery::AT_SORTING_CENTER,
            'current_hub_id' => $origin->id,
        ]);

        $this->actingAs($logistics, 'sanctum');
        $this->postJson('/api/logistics/parcels/scan', [
            'parcel_code' => $delivery->parcel_code,
        ])->assertOk();
        $this->patchJson("/api/logistics/orders/{$order->id}/sort-and-assign", [
            'delivery_area_id' => $area->id,
            'expected_status' => Delivery::AT_SORTING_CENTER,
            'reason' => 'Address reviewed and confirmed with the recipient.',
        ])->assertOk();

        $this->getJson('/api/logistics/parcel-flow')
            ->assertOk()
            ->assertJsonPath('data.deliveries.0.destination_route.status', 'manual_route')
            ->assertJsonPath('data.deliveries.0.destination_route.source_status', 'unmapped')
            ->assertJsonPath('data.deliveries.0.destination_route.area.id', $area->id);

        $payload = [
            'shipment_type' => 'delivery',
            'shipment_id' => $delivery->id,
            'courier_profile_id' => $transferCourier->id,
        ];
        $this->postJson('/api/logistics/hub-transfers', $payload)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Add a note when manually resolving an unmapped or ambiguous destination.');

        $this->postJson('/api/logistics/hub-transfers', [
            ...$payload,
            'note' => 'Manual destination confirmed from the address.',
        ])->assertCreated()
            ->assertJsonPath('data.to_hub_id', $destination->id);
    }

    public function test_third_party_hub_shipment_tracks_and_receives_each_parcel_with_individual_verification(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $base = '/api/admin';
        $origin = LogisticsHub::create(['name' => 'Carrier origin', 'code' => 'CARRIER-ORIGIN', 'is_active' => true]);
        $destination = LogisticsHub::create(['name' => 'Carrier destination', 'code' => 'CARRIER-DEST', 'is_active' => true]);
        $deliveries = collect([1, 2])->map(function () use ($origin) {
            $order = $this->order(Delivery::SORTED);
            return Delivery::create([
                'order_id' => $order->id,
                'status' => Delivery::SORTED,
                'current_hub_id' => $origin->id,
            ]);
        });

        $created = $this->actingAs($admin, 'sanctum')->postJson("{$base}/hub-transfer-shipments", [
            'delivery_ids' => $deliveries->pluck('id')->all(),
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
            'carrier_code' => 'flash_express',
            'carrier_name' => 'Flash Express',
            'tracking_reference' => 'FX-TRACK-123',
            'shipment_reference' => 'BULK-001',
        ])->assertCreated()
            ->assertJsonPath('data.shipment_reference', 'BULK-001')
            ->assertJsonPath('data.carrier_code', 'flash_express')
            ->assertJsonPath('data.origin_hub.id', $origin->id)
            ->assertJsonPath('data.destination_hub.id', $destination->id)
            ->assertJsonCount(2, 'data.items');
        $items = $created->json('data.items');
        $this->assertSame(2, HubTransfer::where('shipment_reference', 'BULK-001')->count());
        $this->assertSame(2, HubTransfer::where('shipment_reference', 'BULK-001')->where('transport_mode', 'third_party')->count());
        $this->assertDatabaseHas('hub_transfers', [
            'shipment_reference' => 'BULK-001',
            'carrier_name' => 'Flash Express',
            'tracking_reference' => 'FX-TRACK-123',
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
        ]);
        $this->assertDatabaseHas('hub_transfer_shipments', [
            'shipment_reference' => 'BULK-001',
            'carrier_name' => 'Flash Express',
            'tracking_reference' => 'FX-TRACK-123',
        ]);
        $this->getJson("{$base}/parcel-flow")
            ->assertOk()
            ->assertJsonPath('data.transfers.0.carrier_name', 'Flash Express')
            ->assertJsonPath('data.transfers.0.tracking_reference', 'FX-TRACK-123');

        $collisionOrder = $this->order(Delivery::SORTED);
        $collisionDelivery = Delivery::create([
            'order_id' => $collisionOrder->id,
            'status' => Delivery::SORTED,
            'current_hub_id' => $origin->id,
        ]);
        $this->postJson("{$base}/hub-transfer-shipments", [
            'delivery_ids' => [$collisionDelivery->id],
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
            'carrier_code' => 'manual',
            'carrier_name' => 'Another Carrier',
            'tracking_reference' => 'OTHER-TRACK',
            'shipment_reference' => 'BULK-001',
        ])->assertConflict();
        $this->assertSame(1, HubTransferShipment::where('shipment_reference', 'BULK-001')->count());
        $this->assertSame(2, HubTransfer::where('shipment_reference', 'BULK-001')->count());

        $this->patchJson("{$base}/hub-transfer-shipments/BULK-001/dispatch")
            ->assertOk()
            ->assertJsonPath('data.items.0.status', 'in_transit');
        $this->assertSame(2, HubTransfer::where('shipment_reference', 'BULK-001')->where('status', 'in_transit')->count());

        $incompleteReceipt = $this->patchJson("{$base}/hub-transfer-shipments/BULK-001/receive", [
            'items' => [[
                'transfer_id' => $items[0]['transfer_id'],
                'parcel_code' => $items[0]['parcel_code'],
            ]],
        ]);
        $incompleteReceipt->assertUnprocessable()
            ->assertJsonPath('message', 'Submit one parcel-code verification for every item in this shipment.');
        $this->assertSame(2, HubTransfer::where('shipment_reference', 'BULK-001')->where('status', 'in_transit')->count());

        $invalidItems = $items;
        $invalidItems[1]['parcel_code'] = $items[0]['parcel_code'];
        $this->patchJson("{$base}/hub-transfer-shipments/BULK-001/receive", [
            'items' => array_map(fn (array $item) => [
                'transfer_id' => $item['transfer_id'],
                'parcel_code' => $item['parcel_code'],
            ], $invalidItems),
        ])->assertUnprocessable();
        $this->assertSame(2, HubTransfer::where('shipment_reference', 'BULK-001')->where('status', 'in_transit')->count());

        $this->patchJson("{$base}/hub-transfer-shipments/BULK-001/receive", [
            'items' => array_map(fn (array $item) => [
                'transfer_id' => $item['transfer_id'],
                'parcel_code' => $item['parcel_code'],
            ], $items),
        ])->assertOk()
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.items.0.status', 'arrived');
        $this->assertSame(2, HubTransfer::where('shipment_reference', 'BULK-001')->where('status', 'arrived')->count());
        $this->assertSame(2, Delivery::whereIn('id', $deliveries->pluck('id'))->where('current_hub_id', $destination->id)->count());
    }

    public function test_shipment_detail_is_authorized_and_returns_all_items_beyond_operations_limit(): void
    {
        $logistics = $this->logisticsUser();
        $origin = LogisticsHub::create(['name' => 'Detail origin', 'code' => 'DETAIL-ORIGIN', 'is_active' => true]);
        $destination = LogisticsHub::create(['name' => 'Detail destination', 'code' => 'DETAIL-DEST', 'is_active' => true]);
        $order = $this->order(Delivery::SORTED);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'status' => Delivery::SORTED,
            'current_hub_id' => $origin->id,
        ]);
        $this->actingAs($logistics, 'sanctum')->postJson('/api/logistics/hub-transfer-shipments', [
            'delivery_ids' => [$delivery->id],
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
            'carrier_code' => 'manual',
            'carrier_name' => 'Manual Carrier',
            'tracking_reference' => 'MANUAL-DETAIL-TRACK',
            'shipment_reference' => 'DETAIL-101',
        ])->assertCreated();

        for ($index = 0; $index < 100; $index++) {
            HubTransfer::create([
                'delivery_id' => null,
                'from_hub_id' => $origin->id,
                'to_hub_id' => $destination->id,
                'assigned_by' => $logistics->id,
                'status' => 'assigned',
                'transport_mode' => 'third_party',
                'carrier_code' => 'manual',
                'carrier_name' => 'Manual Carrier',
                'tracking_reference' => 'MANUAL-DETAIL-TRACK',
                'shipment_reference' => 'DETAIL-101',
            ]);
        }

        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/logistics/hub-transfer-shipments/DETAIL-101')
            ->assertForbidden();

        $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/hub-transfer-shipments/DETAIL-101')
            ->assertOk()
            ->assertJsonPath('data.shipment_reference', 'DETAIL-101')
            ->assertJsonPath('data.carrier_name', 'Manual Carrier')
            ->assertJsonPath('data.tracking_reference', 'MANUAL-DETAIL-TRACK')
            ->assertJsonPath('data.origin_hub.id', $origin->id)
            ->assertJsonPath('data.destination_hub.id', $destination->id)
            ->assertJsonPath('data.total_items', 101)
            ->assertJsonCount(101, 'data.items');

        $this->getJson('/api/logistics/parcel-flow')
            ->assertOk()
            ->assertJsonCount(100, 'data.transfers');
    }

    public function test_database_enforces_unique_shipment_references(): void
    {
        HubTransferShipment::create(['shipment_reference' => 'UNIQUE-SHIPMENT']);

        try {
            HubTransferShipment::create(['shipment_reference' => 'UNIQUE-SHIPMENT']);
        } catch (QueryException) {
            $this->assertSame(1, HubTransferShipment::where('shipment_reference', 'UNIQUE-SHIPMENT')->count());

            return;
        }

        $this->fail('The shipment-reference registry must reject duplicate references at the database level.');
        foreach ($deliveries as $delivery) {
            $this->assertDatabaseHas('delivery_events', [
                'delivery_id' => $delivery->id,
                'event_type' => 'hub_transfer_arrived',
                'hub_id' => $destination->id,
            ]);
        }
    }

    public function test_logistics_can_search_active_courier_accounts_without_exposing_other_roles(): void
    {
        $logistics = $this->logisticsUser();
        $rider = User::factory()->create([
            'first_name' => 'Directory',
            'last_name' => 'Courier',
            'email' => 'directory.courier@example.test',
            'role' => 'rider',
            'status' => 'active',
        ]);
        $seller = User::factory()->create([
            'first_name' => 'Directory',
            'last_name' => 'Seller',
            'role' => 'seller',
            'status' => 'active',
        ]);
        $this->address($rider);

        $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/riders?status=active&search=Directory')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $rider->id)
            ->assertJsonMissing(['id' => $seller->id]);
    }

    public function test_logistics_can_suspend_and_reactivate_only_verified_courier_accounts(): void
    {
        Mail::fake();
        $logistics = $this->logisticsUser();
        [$rider] = $this->eligibleCourier();
        $rider->createToken('courier-session');

        $this->actingAs($logistics, 'sanctum')
            ->patchJson("/api/logistics/riders/{$rider->id}/status", ['status' => 'suspended'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['suspension_reason']);

        $this->patchJson("/api/logistics/riders/{$rider->id}/status", [
            'status' => 'suspended',
            'suspension_reason' => 'Courier account review required.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'suspended')
            ->assertJsonPath('notification_sent', true);
        $this->assertSame(0, $rider->tokens()->count());
        Mail::assertSent(AccountSuspensionMail::class);

        $this->patchJson("/api/logistics/riders/{$rider->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('notification_sent', true);
        Mail::assertSent(AccountReactivationMail::class);

        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->patchJson("/api/logistics/riders/{$buyer->id}/status", ['status' => 'suspended', 'suspension_reason' => 'Not a courier.'])
            ->assertNotFound();
    }

    public function test_logistics_can_monitor_failed_deliveries_and_record_a_return(): void
    {
        $logistics = $this->logisticsUser();
        $order = $this->orderWithPickupAddress(Delivery::FAILED);
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
            $this->getJson('/api/logistics/riders?status=active')->assertForbidden();
            $this->patchJson('/api/logistics/riders/1/status', ['status' => 'suspended', 'suspension_reason' => 'Unauthorized.'])->assertForbidden();
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

    private function logisticsUser(string $municipality = 'Carmen'): User
    {
        $user = User::factory()->create([
            'role' => 'logistics',
            'status' => 'active',
            'email_verified_at' => now(),
            'password' => 'password',
        ]);
        $this->address($user, $municipality);

        return $user;
    }

    private function eligibleCourier(string $municipality = 'Carmen', string $status = 'active'): array
    {
        $user = User::factory()->create([
            'role' => 'rider',
            'status' => $status,
            'email_verified_at' => now(),
        ]);
        $this->address($user, $municipality);
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
            'plate_number' => 'AREA'.str_pad((string) $profile->id, 6, '0', STR_PAD_LEFT),
        ]);

        return [$user, $profile];
    }

    private function address(User $user, string $municipality = 'Carmen'): void
    {
        Address::create([
            'user_id' => $user->id,
            'is_default' => true,
            'region' => 'Region VII',
            'province' => 'Cebu',
            'municipality' => $municipality,
            'barangay' => 'Luyang',
        ]);
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

    private function orderWithPickupAddress(string $status, string $municipality = 'Carmen'): Order
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        SellerPickupAddress::create([
            'user_id' => $seller->id, 'recipient_name' => 'Synthetic Seller', 'phone' => '+639171234567',
            'region' => 'Region VII', 'province' => 'Cebu', 'municipality' => $municipality,
            'barangay' => 'Luyang', 'street' => 'Market Road', 'house_number' => '18', 'postal_code' => '6005',
        ]);
        $order = $this->order($status);
        $product = Product::create([
            'seller_id' => $seller->id, 'name' => 'Pickup workflow product', 'description' => 'Synthetic fixture',
            'price' => 10, 'stock' => 2, 'category' => 'Other', 'status' => 'active',
        ]);
        OrderItem::create([
            'order_id' => $order->id, 'product_id' => $product->id, 'seller_id' => $seller->id,
            'quantity' => 1, 'unit_price' => 10, 'subtotal' => 10,
        ]);

        return $order;
    }

    private function requestPickupFromSeller(Order $order): void
    {
        $seller = User::findOrFail($order->items()->value('seller_id'));
        $this->actingAs($seller, 'sanctum')->postJson("/api/seller/orders/{$order->id}/pickup-request")->assertOk();
    }
}
