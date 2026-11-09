<?php

namespace Tests\Feature;

use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\HubTransfer;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LogisticsHubManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_logistics_can_manage_hubs_and_areas_with_explicit_active_hub_mapping(): void
    {
        $logistics = $this->logisticsUser();
        $central = LogisticsHub::where('code', 'CRYMA-CENTRAL')->firstOrFail();

        $response = $this->actingAs($logistics, 'sanctum')->postJson('/api/logistics/hubs', [
            'name' => '  North Sorting Hub  ',
            'code' => '  north-hub  ',
            'address' => '  Regional address  ',
        ])->assertCreated();

        $hubId = $response->json('data.id');
        $this->assertSame('North Sorting Hub', $response->json('data.name'));
        $this->assertSame('NORTH-HUB', $response->json('data.code'));
        $this->assertSame('Regional address', $response->json('data.address'));
        $this->postJson('/api/logistics/hubs', ['name' => 'Duplicate', 'code' => ' north-hub '])->assertUnprocessable();

        $this->postJson('/api/logistics/delivery-areas', ['name' => 'North District'])->assertUnprocessable();
        $this->patchJson("/api/logistics/hubs/{$hubId}", [
            'name' => 'North Regional Hub',
            'code' => 'north-regional',
            'is_active' => false,
        ])->assertOk()->assertJsonPath('data.code', 'NORTH-REGIONAL')->assertJsonPath('data.is_active', false);
        $this->postJson('/api/logistics/delivery-areas', ['name' => 'North District', 'hub_id' => $hubId])->assertUnprocessable();

        $this->patchJson("/api/logistics/hubs/{$hubId}", ['is_active' => true])->assertOk();
        $area = $this->postJson('/api/logistics/delivery-areas', [
            'name' => '  North District  ',
            'hub_id' => $hubId,
        ])->assertCreated()->assertJsonPath('data.name', 'North District')->assertJsonPath('data.hub_id', $hubId)->json('data');
        $this->assertNotSame($central->id, $area['hub_id']);

        $otherHub = LogisticsHub::create(['name' => 'South Hub', 'code' => 'SOUTH-HUB', 'is_active' => true]);
        $this->patchJson("/api/logistics/delivery-areas/{$area['id']}/hub", ['hub_id' => $otherHub->id])
            ->assertOk()->assertJsonPath('data.hub_id', $otherHub->id);
        $otherHub->update(['is_active' => false]);
        $this->patchJson("/api/logistics/delivery-areas/{$area['id']}/hub", ['hub_id' => $otherHub->id])->assertUnprocessable();

        $this->getJson('/api/logistics/parcel-flow')->assertOk()
            ->assertJsonFragment(['id' => $otherHub->id, 'code' => 'SOUTH-HUB', 'is_active' => false])
            ->assertJsonFragment(['id' => $area['id'], 'name' => 'North District', 'hub_id' => $otherHub->id])
            ->assertJsonFragment(['code' => 'SOUTH-HUB']);
        $this->assertDatabaseHas('logistics_hubs', ['id' => $hubId, 'is_active' => 1]);
        $this->assertDatabaseHas('delivery_areas', ['id' => $area['id'], 'hub_id' => $otherHub->id]);
    }

    public function test_all_psgc_cities_and_municipalities_have_active_mapped_hub_nodes(): void
    {
        $expectedLguCount = DB::table('geographic_locations')
            ->whereIn('level', ['City', 'Mun'])
            ->count();

        $this->assertGreaterThan(0, $expectedLguCount);
        $this->assertSame(
            $expectedLguCount,
            LogisticsHub::query()->whereNotNull('psgc_code')->where('is_active', true)->count(),
        );
        $this->assertSame(
            $expectedLguCount,
            DeliveryArea::query()->whereNotNull('psgc_code')->where('is_active', true)->whereNotNull('hub_id')->count(),
        );
        $this->assertDatabaseHas('logistics_hubs', [
            'psgc_code' => DB::table('geographic_locations')
                ->where('level', 'City')->value('code'),
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('delivery_areas', [
            'psgc_code' => DB::table('geographic_locations')
                ->where('level', 'City')->value('code'),
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('logistics_hubs', ['code' => 'CRYMA-CENTRAL', 'is_active' => true]);
    }

    public function test_area_rider_management_reuses_eligibility_and_prevents_duplicate_assignments(): void
    {
        $logistics = $this->logisticsUser();
        $hub = LogisticsHub::where('is_active', true)->firstOrFail();
        $area = $this->actingAs($logistics, 'sanctum')->postJson('/api/logistics/delivery-areas', [
            'name' => 'Rider Coverage Area', 'hub_id' => $hub->id,
        ])->assertCreated()->json('data');
        [, $eligible] = $this->rider(true);
        [, $ineligible] = $this->rider(false);

        $this->postJson("/api/logistics/delivery-areas/{$area['id']}/couriers", ['courier_profile_id' => $eligible->id])->assertOk();
        $this->postJson("/api/logistics/delivery-areas/{$area['id']}/couriers", ['courier_profile_id' => $eligible->id])->assertOk();
        $this->assertDatabaseCount('courier_delivery_areas', 1);
        $this->postJson("/api/logistics/delivery-areas/{$area['id']}/couriers", ['courier_profile_id' => $ineligible->id])->assertUnprocessable();

        $this->patchJson("/api/logistics/delivery-areas/{$area['id']}", ['is_active' => false])->assertOk();
        $this->postJson("/api/logistics/delivery-areas/{$area['id']}/couriers", ['courier_profile_id' => $eligible->id])->assertUnprocessable();
        $this->deleteJson("/api/logistics/delivery-areas/{$area['id']}/couriers/{$eligible->id}")->assertOk();
        $this->assertDatabaseCount('courier_delivery_areas', 0);
    }

    public function test_logistics_and_admin_management_routes_keep_role_boundaries(): void
    {
        $hub = LogisticsHub::where('is_active', true)->firstOrFail();
        foreach (['buyer', 'seller', 'rider'] as $role) {
            $user = User::factory()->create(['role' => $role, 'status' => 'active']);
            $this->actingAs($user, 'sanctum')->postJson('/api/logistics/hubs', ['name' => 'Denied', 'code' => strtoupper($role).'-DENIED'])->assertForbidden();
            $this->postJson('/api/logistics/delivery-areas', ['name' => 'Denied Area', 'hub_id' => $hub->id])->assertForbidden();
            $this->postJson('/api/logistics/parcels/scan', ['parcel_code' => 'CRYMA-PCL-AAAAAAAAAAAAAAAAAAAA'])->assertForbidden();
            $this->patchJson('/api/logistics/orders/1/sorting-receipt', ['expected_status' => Delivery::PICKED_UP, 'hub_id' => $hub->id, 'parcel_code' => 'CRYMA-PCL-AAAAAAAAAAAAAAAAAAAA'])->assertForbidden();
            $this->patchJson('/api/logistics/orders/1/sort-and-assign', ['delivery_area_id' => 1, 'courier_profile_id' => 1, 'expected_status' => Delivery::AT_SORTING_CENTER])->assertForbidden();
            $this->patchJson('/api/logistics/hub-transfers/1/dispatch')->assertForbidden();
        }

        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/hubs', ['name' => 'Admin Hub', 'code' => 'ADMIN-HUB'])->assertCreated();
        $this->postJson('/api/admin/delivery-areas', ['name' => 'Admin Area', 'hub_id' => $hub->id])->assertCreated();
        $this->getJson('/api/admin/parcel-flow')->assertOk();
    }

    public function test_new_transfers_require_active_destinations_but_existing_transfers_remain_completable(): void
    {
        [$rider, $profile] = $this->rider(true);
        $logistics = $this->logisticsUser();
        $fromHub = LogisticsHub::where('is_active', true)->firstOrFail();
        $destination = LogisticsHub::create(['name' => 'Temporary Destination', 'code' => 'TEMP-DEST', 'is_active' => true]);
        $order = Order::create([
            'buyer_id' => User::factory()->create(['role' => 'buyer', 'status' => 'active'])->id,
            'delivery_address' => 'Test address', 'payment_method' => 'cash_on_delivery',
            'subtotal' => 10, 'shipping_fee' => 0, 'total_amount' => 10, 'status' => Delivery::AT_SORTING_CENTER,
        ]);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::AT_SORTING_CENTER, 'current_hub_id' => $fromHub->id]);
        $transfer = HubTransfer::create([
            'delivery_id' => $delivery->id, 'from_hub_id' => $fromHub->id, 'to_hub_id' => $destination->id,
            'courier_profile_id' => $profile->id, 'assigned_by' => $logistics->id, 'status' => 'in_transit', 'departed_at' => now(),
        ]);
        $destinationArea = DeliveryArea::create(['name' => 'Inactive destination area', 'hub_id' => $destination->id, 'is_active' => true]);
        $destination->update(['is_active' => false]);

        $this->actingAs($logistics, 'sanctum')->postJson('/api/logistics/hub-transfers', [
            'shipment_type' => 'delivery', 'shipment_id' => $delivery->id,
            'to_hub_id' => $destination->id, 'courier_profile_id' => $profile->id, 'delivery_area_id' => $destinationArea->id,
        ])->assertUnprocessable();

        $this->actingAs($rider, 'sanctum')->patchJson("/api/logistics/hub-transfers/{$transfer->id}/receive", ['hub_id' => $destination->id, 'parcel_code' => $delivery->parcel_code])->assertForbidden();
        $this->patchJson("/api/courier/hub-transfers/{$transfer->id}", ['status' => 'arrived'])->assertUnprocessable();
        $this->assertSame('in_transit', $transfer->fresh()->status);
        $this->actingAs($logistics, 'sanctum')->patchJson("/api/logistics/hub-transfers/{$transfer->id}/receive", ['hub_id' => $destination->id, 'parcel_code' => 'CRYMA-PCL-WRONG0000000000'])->assertUnprocessable();
        $this->patchJson("/api/logistics/hub-transfers/{$transfer->id}/receive", ['hub_id' => $fromHub->id, 'parcel_code' => $delivery->parcel_code])->assertUnprocessable();
        $this->assertSame('in_transit', $transfer->fresh()->status);
        $this->assertSame($fromHub->id, $delivery->fresh()->current_hub_id);
        $this->patchJson("/api/logistics/hub-transfers/{$transfer->id}/receive", ['hub_id' => $destination->id, 'parcel_code' => $delivery->parcel_code])->assertOk();
        $this->assertSame('arrived', $transfer->fresh()->status);
        $this->assertSame($destination->id, $delivery->fresh()->current_hub_id);
        $this->assertDatabaseHas('delivery_events', ['delivery_id' => $delivery->id, 'actor_id' => $logistics->id, 'event_type' => 'hub_transfer_arrived', 'reason' => "QR received at hub {$destination->code} (#{$destination->id}); transfer #{$transfer->id}."]);
        $this->patchJson("/api/logistics/hub-transfers/{$transfer->id}/receive", ['hub_id' => $destination->id, 'parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->assertDatabaseHas('hub_transfers', ['id' => $transfer->id, 'to_hub_id' => $destination->id]);
    }

    public function test_delivery_transfer_preparation_requires_a_real_cross_hub_area_and_dispatch_is_single_use(): void
    {
        [$rider, $profile] = $this->rider(true);
        $logistics = $this->logisticsUser();
        $origin = LogisticsHub::where('is_active', true)->firstOrFail();
        $destination = LogisticsHub::create(['name' => 'Mapped Destination', 'code' => 'MAP-DEST', 'is_active' => true]);
        $otherDestination = LogisticsHub::create(['name' => 'Other Destination', 'code' => 'OTHER-DEST', 'is_active' => true]);
        $destinationArea = DeliveryArea::create(['name' => 'Destination District', 'hub_id' => $destination->id, 'is_active' => true]);
        $originArea = DeliveryArea::create(['name' => 'Origin District', 'hub_id' => $origin->id, 'is_active' => true]);
        $otherArea = DeliveryArea::create(['name' => 'Other District', 'hub_id' => $otherDestination->id, 'is_active' => true]);
        $order = Order::create([
            'buyer_id' => User::factory()->create(['role' => 'buyer', 'status' => 'active'])->id,
            'delivery_address' => 'Test destination', 'payment_method' => 'cash_on_delivery',
            'subtotal' => 10, 'shipping_fee' => 0, 'total_amount' => 10, 'status' => Delivery::AT_SORTING_CENTER,
        ]);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::AT_SORTING_CENTER, 'current_hub_id' => $origin->id]);
        $payload = ['shipment_type' => 'delivery', 'shipment_id' => $delivery->id, 'courier_profile_id' => $profile->id];

        $this->actingAs($logistics, 'sanctum')->postJson('/api/logistics/hub-transfers', $payload + ['to_hub_id' => $origin->id, 'delivery_area_id' => $originArea->id])->assertUnprocessable();
        $this->postJson('/api/logistics/hub-transfers', $payload + ['to_hub_id' => $destination->id, 'delivery_area_id' => $originArea->id])->assertUnprocessable();

        $response = $this->postJson('/api/logistics/hub-transfers', $payload + ['to_hub_id' => $destination->id, 'delivery_area_id' => $destinationArea->id])->assertCreated();
        $transfer = HubTransfer::findOrFail($response->json('data.id'));
        $this->assertSame('assigned', $transfer->status);
        $this->assertSame($destinationArea->id, $delivery->fresh()->delivery_area_id);

        $this->postJson('/api/logistics/hub-transfers', $payload + ['to_hub_id' => $otherDestination->id, 'delivery_area_id' => $otherArea->id])->assertStatus(409);
        $delivery->update(['current_hub_id' => $otherDestination->id]);
        $this->patchJson("/api/logistics/hub-transfers/{$transfer->id}/dispatch")->assertStatus(409);
        $this->assertSame('assigned', $transfer->fresh()->status);
        $this->assertNull($transfer->fresh()->departed_at);
        $delivery->update(['current_hub_id' => $origin->id]);
        $this->patchJson("/api/logistics/hub-transfers/{$transfer->id}/dispatch")->assertStatus(409);
        $this->assertSame('assigned', $transfer->fresh()->status);
        $this->assertNull($transfer->fresh()->departed_at);
        $this->assertSame(0, $delivery->events()->where('event_type', 'hub_transfer_departed')->count());
        $this->patchJson("/api/logistics/hub-transfers/{$transfer->id}/dispatch")->assertStatus(409);
        $this->assertSame(0, $delivery->events()->where('event_type', 'hub_transfer_departed')->count());
        $this->actingAs($rider, 'sanctum')->patchJson("/api/logistics/hub-transfers/{$transfer->id}/dispatch")->assertForbidden();

        $invalidOrder = Order::create([
            'buyer_id' => User::factory()->create(['role' => 'buyer', 'status' => 'active'])->id,
            'delivery_address' => 'Invalid parcel destination', 'payment_method' => 'cash_on_delivery',
            'subtotal' => 10, 'shipping_fee' => 0, 'total_amount' => 10, 'status' => Delivery::ASSIGNED,
        ]);
        $invalidDelivery = Delivery::create(['order_id' => $invalidOrder->id, 'status' => Delivery::ASSIGNED, 'current_hub_id' => $origin->id]);
        $this->actingAs($logistics, 'sanctum')->postJson('/api/logistics/hub-transfers', [
            'shipment_type' => 'delivery', 'shipment_id' => $invalidDelivery->id,
            'delivery_area_id' => $destinationArea->id, 'to_hub_id' => $destination->id, 'courier_profile_id' => $profile->id,
        ])->assertStatus(409);
        $this->assertDatabaseMissing('hub_transfers', ['delivery_id' => $invalidDelivery->id]);
    }

    private function logisticsUser(): User
    {
        return User::factory()->create(['role' => 'logistics', 'status' => 'active', 'email_verified_at' => now()]);
    }

    private function rider(bool $eligible): array
    {
        $user = User::factory()->create(['role' => 'rider', 'status' => 'active', 'email_verified_at' => $eligible ? now() : null]);
        $profile = CourierProfile::create(['user_id' => $user->id, 'sex' => 'prefer_not_to_say', 'birthday' => '1990-01-01']);
        if ($eligible) {
            foreach (['valid_id', 'or_cr', 'drivers_license'] as $type) {
                UserDocument::create(['user_id' => $user->id, 'document_type' => $type, 'file_path' => "private/test/{$user->id}-{$type}.pdf", 'status' => 'approved']);
            }
            Vehicle::create(['courier_profile_id' => $profile->id, 'vehicle_type' => 'motorcycle', 'plate_number' => 'HUB'.str_pad((string) $profile->id, 6, '0', STR_PAD_LEFT)]);
        }

        return [$user, $profile];
    }
}
