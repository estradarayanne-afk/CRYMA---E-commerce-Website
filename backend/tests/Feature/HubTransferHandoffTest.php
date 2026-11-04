<?php

namespace Tests\Feature;

use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\DeliveryEvent;
use App\Models\HubStaffProfile;
use App\Models\HubTransfer;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\RefundRequest;
use App\Models\ReturnShipment;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HubTransferHandoffTest extends TestCase
{
    use RefreshDatabase;

    public function test_forward_transfer_requires_hub_release_then_assigned_rider_collection_before_destination_receipt(): void
    {
        $logistics = $this->logistics();
        [$rider, $profile] = $this->rider(true);
        $otherRider = $this->rider(true)[0];
        $origin = LogisticsHub::where('is_active', true)->firstOrFail();
        $destination = $this->hub('HANDOFF-DEST');
        $area = DeliveryArea::create(['name' => 'Handoff destination area', 'hub_id' => $destination->id, 'is_active' => true]);
        $order = $this->order(Delivery::SORTED);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::SORTED, 'current_hub_id' => $origin->id]);

        $transferId = $this->actingAs($logistics, 'sanctum')->postJson('/api/logistics/hub-transfers', [
            'shipment_type' => 'delivery',
            'shipment_id' => $delivery->id,
            'to_hub_id' => $destination->id,
            'courier_profile_id' => $profile->id,
            'delivery_area_id' => $area->id,
        ])->assertCreated()->json('data.id');
        $transfer = HubTransfer::findOrFail($transferId);
        $this->assertSame('assigned', $transfer->status);

        $this->patchJson("/api/logistics/hub-transfers/{$transfer->id}/dispatch")->assertStatus(409);
        $this->actingAs($rider, 'sanctum')->patchJson("/api/courier/hub-transfers/{$transfer->id}", ['status' => 'in_transit'])->assertStatus(409);
        $this->actingAs($rider, 'sanctum')->postJson("/api/courier/hub-transfers/{$transfer->id}/confirm-collection", ['parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->assertNoHandoffChanges($transfer, $delivery);

        [$foreignStaff, $foreignHub] = $this->hubStaff('FOREIGN-HANDOFF');
        $this->actingAs($foreignStaff, 'sanctum')->postJson("/api/hub-staff/transfers/{$transfer->id}/release", ['parcel_code' => $delivery->parcel_code])->assertNotFound();
        $this->assertNoHandoffChanges($transfer, $delivery);

        [$originStaff] = $this->hubStaffFor($origin);
        $this->actingAs($originStaff, 'sanctum')->postJson("/api/hub-staff/transfers/{$transfer->id}/release", ['parcel_code' => 'CRYMA-PCL-AAAAAAAAAAAAAAAAAAAA'])->assertUnprocessable();
        $this->assertNoHandoffChanges($transfer, $delivery);

        $this->postJson("/api/hub-staff/transfers/{$transfer->id}/release", [
            'parcel_code' => $delivery->parcel_code,
            'hub_id' => $foreignHub->id,
        ])->assertUnprocessable();
        $this->postJson("/api/hub-staff/transfers/{$transfer->id}/release", [
            'parcel_code' => $delivery->parcel_code,
            'courier_profile_id' => $otherRider->courierProfile->id,
        ])->assertUnprocessable();
        $this->assertNoHandoffChanges($transfer, $delivery);

        $this->postJson("/api/hub-staff/transfers/{$transfer->id}/release", ['parcel_code' => $delivery->parcel_code])
            ->assertOk()->assertJsonPath('data.status', 'assigned')->assertJsonPath('data.rider_collection_confirmed', false);
        $transfer->refresh();
        $this->assertSame('assigned', $transfer->status);
        $this->assertSame($originStaff->id, $transfer->hub_released_by);
        $this->assertSame($origin->id, $transfer->hub_released_hub_id);
        $this->assertNotNull($transfer->hub_released_at);
        $this->assertNull($transfer->rider_collected_by);
        $releaseEvent = DeliveryEvent::query()->where('delivery_id', $delivery->id)->where('event_type', 'transfer_hub_released')->firstOrFail();
        $this->assertSame($originStaff->id, $releaseEvent->actor_id);
        $this->assertSame($origin->id, $releaseEvent->hub_id);

        $this->actingAs($otherRider, 'sanctum')->postJson("/api/courier/hub-transfers/{$transfer->id}/confirm-collection", ['parcel_code' => $delivery->parcel_code])->assertForbidden();
        $this->actingAs($rider, 'sanctum')->postJson("/api/courier/hub-transfers/{$transfer->id}/confirm-collection", [
            'parcel_code' => $delivery->parcel_code,
            'to_hub_id' => $foreignHub->id,
            'courier_profile_id' => $otherRider->courierProfile->id,
        ])->assertUnprocessable();
        $this->actingAs($logistics, 'sanctum')->patchJson("/api/logistics/hub-transfers/{$transfer->id}/dispatch")->assertStatus(409);
        $this->assertSame('assigned', $transfer->fresh()->status);
        $this->assertNull($transfer->fresh()->departed_at);

        $this->actingAs($rider, 'sanctum')->postJson("/api/courier/hub-transfers/{$transfer->id}/confirm-collection", ['parcel_code' => 'CRYMA-PCL-BBBBBBBBBBBBBBBBBBBB'])->assertUnprocessable();
        $this->assertSame($originStaff->id, $transfer->fresh()->hub_released_by);
        $this->assertNull($transfer->fresh()->rider_collected_by);
        $this->assertSame(1, DeliveryEvent::query()->where('delivery_id', $delivery->id)->where('event_type', 'transfer_hub_released')->count());
        $this->assertSame(0, DeliveryEvent::query()->where('delivery_id', $delivery->id)->where('event_type', 'rider_transfer_collected')->count());

        $this->actingAs($originStaff, 'sanctum')->postJson("/api/hub-staff/transfers/{$transfer->id}/release", ['parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->actingAs($rider, 'sanctum')->postJson("/api/courier/hub-transfers/{$transfer->id}/confirm-collection", ['parcel_code' => $delivery->parcel_code])
            ->assertOk()->assertJsonPath('data.status', 'in_transit');

        $transfer->refresh();
        $this->assertSame('in_transit', $transfer->status);
        $this->assertSame($rider->id, $transfer->rider_collected_by);
        $this->assertNotNull($transfer->rider_collected_at);
        $this->assertNotNull($transfer->departed_at);
        $collectionEvent = DeliveryEvent::query()->where('delivery_id', $delivery->id)->where('event_type', 'rider_transfer_collected')->firstOrFail();
        $departureEvent = DeliveryEvent::query()->where('delivery_id', $delivery->id)->where('event_type', 'hub_transfer_departed')->firstOrFail();
        $this->assertSame($rider->id, $collectionEvent->actor_id);
        $this->assertSame($origin->id, $collectionEvent->hub_id);
        $this->assertSame($rider->id, $departureEvent->actor_id);
        $this->assertSame($origin->id, $departureEvent->hub_id);

        $this->postJson("/api/courier/hub-transfers/{$transfer->id}/confirm-collection", ['parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->assertSame($rider->id, $transfer->fresh()->rider_collected_by);
        $this->assertSame(1, DeliveryEvent::query()->where('delivery_id', $delivery->id)->where('event_type', 'rider_transfer_collected')->count());

        [$destinationStaff] = $this->hubStaffFor($destination);
        $this->actingAs($destinationStaff, 'sanctum')->patchJson("/api/hub-staff/transfers/{$transfer->id}/receive", ['parcel_code' => $delivery->parcel_code])
            ->assertOk()->assertJsonPath('data.status', 'arrived')->assertJsonPath('data.hub.id', $destination->id);
        $this->assertSame($destination->id, $delivery->fresh()->current_hub_id);
        $arrival = DeliveryEvent::query()->where('delivery_id', $delivery->id)->where('event_type', 'hub_transfer_arrived')->firstOrFail();
        $this->assertSame($destinationStaff->id, $arrival->actor_id);
        $this->assertSame($destination->id, $arrival->hub_id);
        $this->actingAs($originStaff, 'sanctum')->postJson("/api/hub-staff/transfers/{$transfer->id}/release", ['parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->actingAs($rider, 'sanctum')->postJson("/api/courier/hub-transfers/{$transfer->id}/confirm-collection", ['parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->assertSame(['transfer_hub_released', 'rider_transfer_collected', 'hub_transfer_departed', 'hub_transfer_arrived'],
            DeliveryEvent::query()->where('delivery_id', $delivery->id)->orderBy('id')->pluck('event_type')->all());
    }

    public function test_unassigned_or_inactive_hub_staff_and_ineligible_rider_cannot_confirm_handoff(): void
    {
        $logistics = $this->logistics();
        [$rider, $profile] = $this->rider(false);
        $origin = LogisticsHub::where('is_active', true)->firstOrFail();
        $destination = $this->hub('INELIGIBLE-DEST');
        $order = $this->order(Delivery::SORTED);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::SORTED, 'current_hub_id' => $origin->id]);
        $transfer = HubTransfer::create([
            'delivery_id' => $delivery->id,
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
            'courier_profile_id' => $profile->id,
            'assigned_by' => $logistics->id,
            'status' => 'assigned',
        ]);

        $unassignedStaff = User::factory()->create(['role' => 'hub_staff', 'status' => 'active']);
        $this->actingAs($unassignedStaff, 'sanctum')->postJson("/api/hub-staff/transfers/{$transfer->id}/release", ['parcel_code' => $delivery->parcel_code])->assertForbidden();

        [$inactiveStaff, $inactiveHub] = $this->hubStaff('INACTIVE-HANDOFF');
        $inactiveHub->update(['is_active' => false]);
        $this->actingAs($inactiveStaff, 'sanctum')->postJson("/api/hub-staff/transfers/{$transfer->id}/release", ['parcel_code' => $delivery->parcel_code])->assertForbidden();

        [$originStaff] = $this->hubStaffFor($origin);
        $this->actingAs($originStaff, 'sanctum')->postJson("/api/hub-staff/transfers/{$transfer->id}/release", ['parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->assertNoHandoffChanges($transfer, $delivery);

        $this->actingAs($rider, 'sanctum')->postJson("/api/courier/hub-transfers/{$transfer->id}/confirm-collection", ['parcel_code' => $delivery->parcel_code])->assertForbidden();
        $this->actingAs($logistics, 'sanctum')->patchJson("/api/logistics/hub-transfers/{$transfer->id}/dispatch")->assertStatus(409);
        $this->assertNoHandoffChanges($transfer, $delivery);
    }

    public function test_suspended_assigned_rider_cannot_confirm_after_release_and_cancelled_transfer_cannot_be_completed(): void
    {
        $logistics = $this->logistics();
        [$rider, $profile] = $this->rider(true);
        $origin = LogisticsHub::where('is_active', true)->firstOrFail();
        $destination = $this->hub('SUSPENDED-HANDOFF-DEST');
        [$staff] = $this->hubStaffFor($origin);
        $order = $this->order(Delivery::SORTED);
        $delivery = Delivery::create(['order_id' => $order->id, 'status' => Delivery::SORTED, 'current_hub_id' => $origin->id]);
        $transfer = HubTransfer::create([
            'delivery_id' => $delivery->id,
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
            'courier_profile_id' => $profile->id,
            'assigned_by' => $logistics->id,
            'status' => 'assigned',
        ]);

        $this->actingAs($staff, 'sanctum')->postJson("/api/hub-staff/transfers/{$transfer->id}/release", ['parcel_code' => $delivery->parcel_code])->assertOk();
        $releaseActor = $transfer->fresh()->hub_released_by;
        $rider->forceFill(['status' => 'suspended'])->save();
        $this->actingAs($rider, 'sanctum')->postJson("/api/courier/hub-transfers/{$transfer->id}/confirm-collection", ['parcel_code' => $delivery->parcel_code])->assertForbidden();
        $this->assertSame($releaseActor, $transfer->fresh()->hub_released_by);
        $this->assertNotNull($transfer->fresh()->hub_released_at);
        $this->assertNull($transfer->fresh()->rider_collected_by);
        $this->assertSame('assigned', $transfer->fresh()->status);
        $this->assertNull($transfer->fresh()->departed_at);
        $this->assertSame(0, $delivery->events()->where('event_type', 'rider_transfer_collected')->count());

        $transfer->update(['status' => 'cancelled']);
        $this->actingAs($staff, 'sanctum')->postJson("/api/hub-staff/transfers/{$transfer->id}/release", ['parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->assertSame('cancelled', $transfer->fresh()->status);
        $this->assertSame($releaseActor, $transfer->fresh()->hub_released_by);
        $rider->forceFill(['status' => 'active'])->save();
        $this->actingAs($rider, 'sanctum')->postJson("/api/courier/hub-transfers/{$transfer->id}/confirm-collection", ['parcel_code' => $delivery->parcel_code])->assertStatus(409);
        $this->assertNull($transfer->fresh()->rider_collected_by);
        $this->assertNull($transfer->fresh()->rider_collected_at);
        $this->assertNull($transfer->fresh()->departed_at);
    }

    public function test_existing_return_transfer_dispatch_does_not_require_forward_handoff_confirmations(): void
    {
        $logistics = $this->logistics();
        [, $profile] = $this->rider(true);
        $origin = LogisticsHub::where('is_active', true)->firstOrFail();
        $destination = $this->hub('RETURN-DEST');
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $order = $this->order(Delivery::DELIVERED, $buyer);
        $refund = RefundRequest::create([
            'order_id' => $order->id,
            'buyer_id' => $buyer->id,
            'requested_amount' => 10,
            'reason' => 'Synthetic return-transfer regression fixture',
            'status' => 'approved',
        ]);
        $return = ReturnShipment::create([
            'refund_request_id' => $refund->id,
            'order_id' => $order->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'current_hub_id' => $origin->id,
            'status' => 'at_hub',
        ]);
        $transfer = HubTransfer::create([
            'return_shipment_id' => $return->id,
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
            'courier_profile_id' => $profile->id,
            'assigned_by' => $logistics->id,
            'status' => 'assigned',
        ]);

        $this->actingAs($logistics, 'sanctum')->patchJson("/api/logistics/hub-transfers/{$transfer->id}/dispatch")
            ->assertOk()->assertJsonPath('data.status', 'in_transit');
        $this->assertSame('in_transit_to_hub', $return->fresh()->status);
        $this->assertNull($transfer->fresh()->hub_released_at);
        $this->assertNull($transfer->fresh()->rider_collected_at);
    }

    private function assertNoHandoffChanges(HubTransfer $transfer, Delivery $delivery): void
    {
        $transfer->refresh();
        $this->assertSame('assigned', $transfer->status);
        $this->assertNull($transfer->hub_released_by);
        $this->assertNull($transfer->hub_released_hub_id);
        $this->assertNull($transfer->hub_released_at);
        $this->assertNull($transfer->rider_collected_by);
        $this->assertNull($transfer->rider_collected_at);
        $this->assertNull($transfer->departed_at);
        $this->assertSame(Delivery::SORTED, $delivery->fresh()->status);
        $this->assertSame(0, DeliveryEvent::query()->where('delivery_id', $delivery->id)
            ->whereIn('event_type', ['transfer_hub_released', 'rider_transfer_collected', 'hub_transfer_departed'])->count());
    }

    private function logistics(): User
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
            Vehicle::create(['courier_profile_id' => $profile->id, 'vehicle_type' => 'motorcycle', 'plate_number' => 'HOF'.str_pad((string) $profile->id, 6, '0', STR_PAD_LEFT)]);
        }
        return [$user, $profile];
    }

    private function hub(string $code): LogisticsHub
    {
        return LogisticsHub::create(['name' => $code, 'code' => $code, 'is_active' => true]);
    }

    private function hubStaff(string $code): array
    {
        $hub = $this->hub($code);
        return $this->hubStaffFor($hub);
    }

    private function hubStaffFor(LogisticsHub $hub): array
    {
        $staff = User::factory()->create(['role' => 'hub_staff', 'status' => 'active']);
        HubStaffProfile::create(['user_id' => $staff->id, 'hub_id' => $hub->id, 'assigned_at' => now()]);
        return [$staff, $hub];
    }

    private function order(string $status, ?User $buyer = null): Order
    {
        return Order::create([
            'buyer_id' => ($buyer ?? User::factory()->create(['role' => 'buyer', 'status' => 'active']))->id,
            'delivery_address' => 'Synthetic handoff destination',
            'payment_method' => 'cash_on_delivery',
            'subtotal' => 100,
            'shipping_fee' => 0,
            'total_amount' => 100,
            'status' => $status,
        ]);
    }
}
