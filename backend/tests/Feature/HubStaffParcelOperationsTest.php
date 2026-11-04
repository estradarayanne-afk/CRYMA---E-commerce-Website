<?php

namespace Tests\Feature;

use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\DeliveryEvent;
use App\Models\HubStaffProfile;
use App\Models\HubTransfer;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\PickupAssignment;
use App\Models\User;
use App\Services\HubDeliveryEventBackfill;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HubStaffParcelOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_hub_parcel_queue_and_counts_are_scoped_before_serialization(): void
    {
        [$staff, $hubA] = $this->hubStaff('HUB-A');
        $hubB = $this->hub('HUB-B');
        $local = $this->parcel(Delivery::AT_SORTING_CENTER, $hubA);
        $sorted = $this->parcel(Delivery::SORTED, $hubA);
        $foreign = $this->parcel(Delivery::AT_SORTING_CENTER, $hubB);
        $this->transfer($foreign, $hubB, $hubA, 'in_transit');

        $response = $this->actingAs($staff, 'sanctum')->getJson('/api/hub-staff/parcels?per_page=1');
        $response->assertOk()
            ->assertJsonPath('hub.id', $hubA->id)
            ->assertJsonPath('counts.parcels_at_hub', 2)
            ->assertJsonPath('counts.awaiting_sorting', 1)
            ->assertJsonPath('counts.sorted', 1)
            ->assertJsonPath('counts.incoming_transfers', 1)
            ->assertJsonPath('data.total', 2)
            ->assertJsonCount(1, 'data.data')
            ->assertDontSee($foreign->parcel_code)
            ->assertJsonMissingPath('data.data.0.order.delivery_address')
            ->assertJsonMissingPath('data.data.0.buyer');

        $this->getJson('/api/hub-staff/parcels?hub_id='.$hubB->id)->assertUnprocessable();
        $this->postJson('/api/hub-staff/parcels/scan', [
            'parcel_code' => $foreign->parcel_code,
            'expected_status' => Delivery::AT_SORTING_CENTER,
        ])->assertNotFound();
    }

    public function test_incoming_pickup_lookup_and_receipt_use_only_the_authenticated_staff_hub(): void
    {
        [$staff, $hub] = $this->hubStaff('RECEIVE-HUB');
        $order = $this->order(Delivery::PICKED_UP);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::PICKED_UP]);
        PickupAssignment::create([
            'order_id' => $order->id,
            'delivery_id' => $delivery->id,
            'status' => PickupAssignment::PICKED_UP,
            'picked_up_at' => now(),
        ]);

        $this->actingAs($staff, 'sanctum')->postJson('/api/hub-staff/incoming-pickups/lookup', ['parcel_code' => $delivery->parcel_code])
            ->assertOk()->assertJsonPath('data.receiving_hub.id', $hub->id)->assertJsonPath('data.eligible_for_receipt', true);
        $this->postJson('/api/hub-staff/receipts', [
            'order_id' => $order->id,
            'parcel_code' => $delivery->parcel_code,
            'hub_id' => $this->hub('UNTRUSTED-HUB')->id,
        ])->assertUnprocessable();
        $this->assertNull($delivery->fresh()->current_hub_id);

        $this->postJson('/api/hub-staff/receipts', ['order_id' => $order->id, 'parcel_code' => 'CRYMA-PCL-AAAAAAAAAAAAAAAAAAAA'])->assertNotFound();
        $this->assertSame(Delivery::PICKED_UP, $delivery->fresh()->status);
        $this->postJson('/api/hub-staff/receipts', ['order_id' => $order->id, 'parcel_code' => $delivery->parcel_code])
            ->assertOk()->assertJsonPath('data.hub.id', $hub->id)->assertJsonPath('data.status', Delivery::AT_SORTING_CENTER);

        $event = DeliveryEvent::where('delivery_id', $delivery->id)->where('event_type', 'sorting_center_received')->firstOrFail();
        $this->assertSame($hub->id, $event->hub_id);
        $this->assertSame($staff->id, $event->actor_id);
        $this->postJson('/api/hub-staff/receipts', ['order_id' => $order->id, 'parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->assertSame(Delivery::AT_SORTING_CENTER, $delivery->fresh()->status);
        $this->assertSame(1, DeliveryEvent::where('delivery_id', $delivery->id)->where('event_type', 'sorting_center_received')->count());
    }

    public function test_qr_must_match_the_order_and_failed_receipt_does_not_mutate_custody(): void
    {
        [$staff] = $this->hubStaff('QR-HUB');
        $order = $this->order(Delivery::PICKED_UP);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::PICKED_UP]);
        PickupAssignment::create(['order_id' => $order->id, 'delivery_id' => $delivery->id, 'status' => PickupAssignment::PICKED_UP, 'picked_up_at' => now()]);
        $otherOrder = $this->order(Delivery::PICKED_UP);

        $this->actingAs($staff, 'sanctum')->postJson('/api/hub-staff/receipts', ['order_id' => $otherOrder->id, 'parcel_code' => $delivery->parcel_code])->assertUnprocessable();
        $this->postJson('/api/hub-staff/receipts', ['order_id' => $order->id, 'parcel_code' => 'malformed'])->assertUnprocessable();
        $this->assertSame(Delivery::PICKED_UP, $order->fresh()->status);
        $this->assertSame(Delivery::PICKED_UP, $delivery->fresh()->status);
        $this->assertNull($delivery->fresh()->current_hub_id);
        $this->assertSame(0, DeliveryEvent::where('delivery_id', $delivery->id)->count());
    }

    public function test_only_assigned_destination_hub_can_receive_a_forward_transfer_and_duplicate_receipt_is_rejected(): void
    {
        [$staffA, $hubA] = $this->hubStaff('TRANSFER-A');
        [$staffB, $hubB] = $this->hubStaff('TRANSFER-B');
        $delivery = $this->parcel(Delivery::SORTED, $hubA);
        $transfer = $this->transfer($delivery, $hubA, $hubB, 'in_transit');
        DeliveryEvent::create([
            'delivery_id' => $delivery->id,
            'actor_id' => $staffA->id,
            'hub_id' => $hubA->id,
            'event_type' => 'hub_transfer_departed',
            'previous_status' => Delivery::SORTED,
            'new_status' => Delivery::SORTED,
            'reason' => "Departed TRANSFER-A; transfer #{$transfer->id}.",
            'created_at' => now()->subMinute(),
        ]);

        $this->actingAs($staffA, 'sanctum')->patchJson("/api/hub-staff/transfers/{$transfer->id}/receive", ['parcel_code' => $delivery->parcel_code])->assertNotFound();
        $this->assertSame('in_transit', $transfer->fresh()->status);
        $this->actingAs($staffB, 'sanctum')->patchJson("/api/hub-staff/transfers/{$transfer->id}/receive", [
            'parcel_code' => $delivery->parcel_code,
            'hub_id' => $hubA->id,
        ])->assertUnprocessable();
        $this->assertSame('in_transit', $transfer->fresh()->status);

        $this->patchJson("/api/hub-staff/transfers/{$transfer->id}/receive", ['parcel_code' => $delivery->parcel_code])
            ->assertOk()->assertJsonPath('data.hub.id', $hubB->id)->assertJsonPath('data.status', 'arrived');
        $this->assertSame($hubB->id, $delivery->fresh()->current_hub_id);
        $arrived = DeliveryEvent::where('delivery_id', $delivery->id)->where('event_type', 'hub_transfer_arrived')->firstOrFail();
        $this->assertSame($hubB->id, $arrived->hub_id);
        $this->assertSame($staffB->id, $arrived->actor_id);
        $this->patchJson("/api/hub-staff/transfers/{$transfer->id}/receive", ['parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->assertSame(1, DeliveryEvent::where('delivery_id', $delivery->id)->where('event_type', 'hub_transfer_arrived')->count());
    }

    public function test_sorting_requires_a_scan_at_the_assigned_hub_and_preserves_area_mapping(): void
    {
        [$staff, $hubA] = $this->hubStaff('SORT-A');
        $hubB = $this->hub('SORT-B');
        $localArea = DeliveryArea::create(['name' => 'Sort A Area', 'hub_id' => $hubA->id, 'is_active' => true]);
        $remoteArea = DeliveryArea::create(['name' => 'Sort B Area', 'hub_id' => $hubB->id, 'is_active' => true]);
        $parcel = $this->parcel(Delivery::AT_SORTING_CENTER, $hubA, $remoteArea->id);

        $this->actingAs($staff, 'sanctum')->patchJson("/api/hub-staff/parcels/{$parcel->parcel_code}/sort", ['expected_status' => Delivery::AT_SORTING_CENTER])->assertUnprocessable();
        $this->assertSame(Delivery::AT_SORTING_CENTER, $parcel->fresh()->status);
        $this->postJson('/api/hub-staff/parcels/scan', ['parcel_code' => $parcel->parcel_code, 'expected_status' => Delivery::AT_SORTING_CENTER])
            ->assertOk()->assertJsonPath('data.current_hub.id', $hubA->id);
        $this->postJson('/api/hub-staff/parcels/scan', ['parcel_code' => $parcel->parcel_code, 'expected_status' => Delivery::AT_SORTING_CENTER])->assertOk();
        $this->assertSame(1, DeliveryEvent::where('delivery_id', $parcel->id)->where('event_type', 'parcel_scanned')->where('hub_id', $hubA->id)->count());
        $this->patchJson("/api/hub-staff/parcels/{$parcel->parcel_code}/sort", ['expected_status' => Delivery::AT_SORTING_CENTER])
            ->assertStatus(409);
        $this->assertSame(Delivery::AT_SORTING_CENTER, $parcel->fresh()->status);
        $this->assertSame($remoteArea->id, $parcel->fresh()->delivery_area_id);

        $parcel->update(['delivery_area_id' => $localArea->id]);
        $this->patchJson("/api/hub-staff/parcels/{$parcel->parcel_code}/sort", [
            'expected_status' => Delivery::AT_SORTING_CENTER,
            'delivery_area_id' => $remoteArea->id,
            'courier_profile_id' => 123,
        ])->assertUnprocessable();
        $this->patchJson("/api/hub-staff/parcels/{$parcel->parcel_code}/sort", ['expected_status' => Delivery::AT_SORTING_CENTER])
            ->assertOk()->assertJsonPath('data.status', Delivery::SORTED);
        $this->assertSame($localArea->id, $parcel->fresh()->delivery_area_id);
        $sortedEvent = DeliveryEvent::where('delivery_id', $parcel->id)->where('event_type', 'sorted')->firstOrFail();
        $this->assertSame($hubA->id, $sortedEvent->hub_id);
        $this->assertSame($staff->id, $sortedEvent->actor_id);
        $this->patchJson("/api/hub-staff/parcels/{$parcel->parcel_code}/sort", ['expected_status' => Delivery::AT_SORTING_CENTER])->assertStatus(409);

        $this->patchJson("/api/hub-staff/parcels/{$this->parcel(Delivery::AT_SORTING_CENTER, $hubB)->parcel_code}/sort", ['expected_status' => Delivery::AT_SORTING_CENTER])->assertNotFound();
    }

    public function test_hub_activity_history_is_scoped_and_does_not_attribute_events_from_other_hubs(): void
    {
        [$staffA, $hubA] = $this->hubStaff('HISTORY-A');
        [$staffB, $hubB] = $this->hubStaff('HISTORY-B');
        $parcel = $this->parcel(Delivery::SORTED, $hubA);
        $eventA = DeliveryEvent::create([
            'delivery_id' => $parcel->id, 'actor_id' => $staffA->id, 'hub_id' => $hubA->id,
            'event_type' => 'sorted', 'previous_status' => Delivery::AT_SORTING_CENTER,
            'new_status' => Delivery::SORTED, 'created_at' => now(),
        ]);
        DeliveryEvent::create([
            'delivery_id' => $parcel->id, 'actor_id' => $staffA->id, 'hub_id' => null,
            'event_type' => 'pickup_assigned', 'previous_status' => null,
            'new_status' => 'ASSIGNED_TO_PICKUP_RIDER', 'created_at' => now(),
        ]);

        $this->actingAs($staffA, 'sanctum')->getJson('/api/hub-staff/activity')
            ->assertOk()->assertJsonPath('hub.id', $hubA->id)->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.parcel_code', $parcel->parcel_code)
            ->assertJsonPath('data.data.0.actor', 'Hub Staff');
        $this->actingAs($staffB, 'sanctum')->getJson('/api/hub-staff/activity')->assertOk()->assertJsonPath('data.total', 0)->assertDontSee($parcel->parcel_code);
        $this->getJson('/api/hub-staff/activity?hub_id='.$hubA->id)->assertUnprocessable();
        $this->assertSame($hubA->id, $eventA->hub_id);
        $this->assertNull(DeliveryEvent::where('event_type', 'pickup_assigned')->value('hub_id'));
    }

    public function test_historical_backfill_only_assigns_provable_hubs_and_is_idempotent(): void
    {
        $hubA = $this->hub('BACKFILL-A');
        $hubB = $this->hub('BACKFILL-B');
        $staff = $this->rawHubStaff($hubA);
        $initial = $this->parcel(Delivery::AT_SORTING_CENTER, $hubA);
        DeliveryEvent::create([
            'delivery_id' => $initial->id, 'actor_id' => $staff->id, 'event_type' => 'sorting_center_received',
            'previous_status' => Delivery::PICKED_UP, 'new_status' => Delivery::AT_SORTING_CENTER,
            'created_at' => now()->subDays(3),
        ]);
        $transferred = $this->parcel(Delivery::SORTED, $hubB);
        $transfer = $this->transfer($transferred, $hubA, $hubB, 'arrived');
        $departedEvent = DeliveryEvent::create([
            'delivery_id' => $transferred->id, 'actor_id' => $staff->id, 'event_type' => 'hub_transfer_departed',
            'previous_status' => Delivery::SORTED, 'new_status' => Delivery::SORTED,
            'reason' => "Departed hub; transfer #{$transfer->id}.", 'created_at' => now()->subDays(2),
        ]);
        $arrivedEvent = DeliveryEvent::create([
            'delivery_id' => $transferred->id, 'actor_id' => $staff->id, 'event_type' => 'hub_transfer_arrived',
            'previous_status' => Delivery::SORTED, 'new_status' => Delivery::SORTED,
            'reason' => "Received hub; transfer #{$transfer->id}.", 'created_at' => now()->subDay(),
        ]);
        $unknown = $this->parcel(Delivery::SORTED, $hubB);
        $this->transfer($unknown, $hubA, $hubB, 'arrived');
        $unknownEvent = DeliveryEvent::create([
            'delivery_id' => $unknown->id, 'actor_id' => $staff->id, 'event_type' => 'sorting_center_received',
            'previous_status' => Delivery::PICKED_UP, 'new_status' => Delivery::AT_SORTING_CENTER,
            'created_at' => now()->subHours(12),
        ]);
        $nonHub = DeliveryEvent::create([
            'delivery_id' => $initial->id, 'actor_id' => $staff->id, 'event_type' => 'pickup_assigned',
            'new_status' => 'ASSIGNED_TO_PICKUP_RIDER', 'created_at' => now(),
        ]);

        $backfill = app(HubDeliveryEventBackfill::class);
        $stats = $backfill->run();
        $this->assertSame(2, $stats['transfer_events']);
        $this->assertSame(1, $stats['initial_hub_events']);
        $this->assertSame(1, $stats['unknown_hub_events']);
        $this->assertSame($hubA->id, $initial->events()->where('event_type', 'sorting_center_received')->value('hub_id'));
        $this->assertSame($hubA->id, $departedEvent->fresh()->hub_id);
        $this->assertSame($hubB->id, $arrivedEvent->fresh()->hub_id);
        $this->assertNull($unknownEvent->fresh()->hub_id);
        $this->assertNull($nonHub->fresh()->hub_id);

        $secondRun = $backfill->run();
        $this->assertSame(0, $secondRun['transfer_events']);
        $this->assertSame(0, $secondRun['initial_hub_events']);
        $this->assertSame(1, $secondRun['unknown_hub_events']);
    }

    public function test_hub_staff_cannot_use_global_logistics_or_admin_operations(): void
    {
        [$staff] = $this->hubStaff('BOUNDARY-HUB');
        $this->actingAs($staff, 'sanctum')->getJson('/api/logistics/dashboard')->assertForbidden();
        $this->getJson('/api/logistics/parcel-flow')->assertForbidden();
        $this->getJson('/api/admin/logistics')->assertForbidden();
        $this->getJson('/api/logistics/delivery-areas')->assertForbidden();
        $this->postJson('/api/logistics/hub-transfers', [])->assertForbidden();
    }

    public function test_hub_parcel_endpoints_fail_closed_for_missing_or_inactive_assignments_and_accounts(): void
    {
        $unassigned = User::factory()->create(['role' => 'hub_staff', 'status' => 'active']);
        $this->actingAs($unassigned, 'sanctum')->getJson('/api/hub-staff/parcels')->assertForbidden();

        [$inactiveHubStaff, $inactiveHub] = $this->hubStaff('INACTIVE-OPS-HUB');
        $inactiveHub->update(['is_active' => false]);
        $this->actingAs($inactiveHubStaff, 'sanctum')->getJson('/api/hub-staff/parcels')->assertForbidden();

        [$inactiveAccount, $activeHub] = $this->hubStaff('INACTIVE-OPS-ACCOUNT');
        $inactiveAccount->forceFill(['status' => 'suspended'])->save();
        $this->actingAs($inactiveAccount, 'sanctum')->getJson('/api/hub-staff/activity')->assertForbidden();
        $this->assertTrue($activeHub->is_active);
    }

    private function hubStaff(string $code): array
    {
        $hub = $this->hub($code);
        return [$this->rawHubStaff($hub), $hub];
    }

    private function rawHubStaff(LogisticsHub $hub): User
    {
        $staff = User::factory()->create(['role' => 'hub_staff', 'status' => 'active', 'first_name' => 'Hub', 'last_name' => 'Staff']);
        HubStaffProfile::create(['user_id' => $staff->id, 'hub_id' => $hub->id, 'assigned_at' => now()]);
        return $staff;
    }

    private function hub(string $code): LogisticsHub
    {
        return LogisticsHub::create(['name' => $code, 'code' => $code, 'is_active' => true]);
    }

    private function order(string $status): Order
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        return Order::create([
            'buyer_id' => $buyer->id,
            'delivery_address' => 'Private destination address',
            'payment_method' => 'cash_on_delivery',
            'subtotal' => 100,
            'shipping_fee' => 0,
            'total_amount' => 100,
            'status' => $status,
        ]);
    }

    private function parcel(string $status, LogisticsHub $hub, ?int $areaId = null): Delivery
    {
        $order = $this->order($status);
        return Delivery::create([
            'order_id' => $order->id,
            'status' => $status,
            'current_hub_id' => $hub->id,
            'delivery_area_id' => $areaId,
        ]);
    }

    private function transfer(Delivery $delivery, LogisticsHub $from, LogisticsHub $to, string $status): HubTransfer
    {
        return HubTransfer::create([
            'delivery_id' => $delivery->id,
            'from_hub_id' => $from->id,
            'to_hub_id' => $to->id,
            'status' => $status,
            'departed_at' => $status === 'in_transit' || $status === 'arrived' ? now() : null,
            'arrived_at' => $status === 'arrived' ? now() : null,
        ]);
    }
}
