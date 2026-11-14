<?php

namespace Tests\Feature;

use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\GeographicLocation;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\PickupAssignment;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LogisticsOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_logistics_can_assign_pickup_and_confirm_collected_parcel_receipt(): void
    {
        $logistics = $this->logisticsUser();
        [, $courierProfile] = $this->eligibleCourier();
        $order = $this->orderWithPickupAddress('READY_FOR_PICKUP');

        $this->actingAs($logistics, 'sanctum')
            ->getJson('/api/logistics/operations')
            ->assertOk()
            ->assertJsonPath('data.pickup_orders.0.id', $order->id);

        $this->postJson("/api/logistics/orders/{$order->id}/pickup-assignment", [
            'courier_profile_id' => $courierProfile->id,
            'scheduled_at' => now()->addDay()->toISOString(),
        ])->assertOk();
        $assignment = PickupAssignment::where('order_id', $order->id)->firstOrFail();
        $this->assertSame($logistics->id, $assignment->assigned_by);

        $assignment->update([
            'status' => PickupAssignment::PICKED_UP,
            'picked_up_at' => now(),
        ]);
        Delivery::where('order_id', $order->id)->update(['status' => Delivery::PICKED_UP, 'picked_up_at' => now()]);
        $order->update(['status' => Delivery::PICKED_UP]);
        $hub = LogisticsHub::where('is_active', true)->firstOrFail();
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
        Mail::assertSent(\App\Mail\AccountSuspensionMail::class);

        $this->patchJson("/api/logistics/riders/{$rider->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('notification_sent', true);
        Mail::assertSent(\App\Mail\AccountReactivationMail::class);

        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->patchJson("/api/logistics/riders/{$buyer->id}/status", ['status' => 'suspended', 'suspension_reason' => 'Not a courier.'])
            ->assertNotFound();
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

    private function orderWithPickupAddress(string $status): Order
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        \App\Models\Address::create([
            'user_id' => $seller->id, 'recipient_name' => 'Synthetic Seller', 'phone' => '+639171234567',
            'is_default' => true, 'region' => 'Region VII', 'province' => 'Cebu', 'municipality' => 'Carmen',
            'barangay' => 'Luyang', 'street' => 'Market Road', 'house_number' => '18', 'postal_code' => '6005',
        ]);
        $order = $this->order($status);
        $product = \App\Models\Product::create([
            'seller_id' => $seller->id, 'name' => 'Pickup workflow product', 'description' => 'Synthetic fixture',
            'price' => 10, 'stock' => 2, 'category' => 'Other', 'status' => 'active',
        ]);
        \App\Models\OrderItem::create([
            'order_id' => $order->id, 'product_id' => $product->id, 'seller_id' => $seller->id,
            'quantity' => 1, 'unit_price' => 10, 'subtotal' => 10,
        ]);

        return $order;
    }
}
