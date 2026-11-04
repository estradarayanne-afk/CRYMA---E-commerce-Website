<?php

namespace Tests\Feature;

use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\HubStaffProfile;
use App\Models\HubTransfer;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HubStaffOutgoingTransfersTest extends TestCase
{
    use RefreshDatabase;

    public function test_outgoing_list_only_returns_eligible_unreleased_forward_transfers_from_the_assigned_hub(): void
    {
        [$staff, $origin] = $this->staff();
        $destination = $this->hub('OUT-DEST');
        [, $eligibleProfile] = $this->rider(true);
        [, $ineligibleProfile] = $this->rider(false);

        $eligible = $this->transfer($origin, $destination, $eligibleProfile);
        $this->transfer($origin, $destination, $ineligibleProfile);
        $this->transfer($this->hub('OTHER-ORIGIN'), $destination, $eligibleProfile);
        $released = $this->transfer($origin, $destination, $eligibleProfile);
        $released->update(['hub_released_by' => $staff->id, 'hub_released_hub_id' => $origin->id, 'hub_released_at' => now()]);

        $this->actingAs($staff, 'sanctum')->getJson('/api/hub-staff/outgoing-transfers?per_page=1')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('hub.id', $origin->id)
            ->assertJsonPath('data.total', 1)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $eligible->id)
            ->assertJsonPath('data.data.0.parcel.status', Delivery::SORTED)
            ->assertJsonPath('data.data.0.assigned_rider.name', 'Active Rider')
            ->assertJsonMissingPath('data.data.0.parcel.delivery_address');

        $this->getJson('/api/hub-staff/outgoing-transfers?hub_id='.$destination->id)->assertUnprocessable();
    }

    public function test_outgoing_list_fails_closed_for_unassigned_or_inactive_hub_staff(): void
    {
        $unassigned = User::factory()->create(['role' => 'hub_staff', 'status' => 'active']);
        $this->actingAs($unassigned, 'sanctum')->getJson('/api/hub-staff/outgoing-transfers')->assertForbidden();

        [$staff, $hub] = $this->staff();
        $hub->update(['is_active' => false]);
        $this->actingAs($staff, 'sanctum')->getJson('/api/hub-staff/outgoing-transfers')->assertForbidden();
    }

    public function test_logistics_transfer_feed_serializes_handoff_actor_details_without_changing_return_transfers(): void
    {
        [$staff, $origin] = $this->staff();
        $destination = $this->hub('SERIALIZE-DEST');
        [$rider, $profile] = $this->rider(true);
        $transfer = $this->transfer($origin, $destination, $profile);
        $transfer->update([
            'hub_released_by' => $staff->id,
            'hub_released_hub_id' => $origin->id,
            'hub_released_at' => now(),
            'rider_collected_by' => $rider->id,
            'rider_collected_at' => now(),
        ]);
        $logistics = User::factory()->create(['role' => 'logistics', 'status' => 'active']);

        $this->actingAs($logistics, 'sanctum')->getJson('/api/logistics/parcel-flow')
            ->assertOk()
            ->assertJsonPath('data.transfers.0.id', $transfer->id)
            ->assertJsonPath('data.transfers.0.hub_release_actor.id', $staff->id)
            ->assertJsonPath('data.transfers.0.hub_release_actor.first_name', $staff->first_name)
            ->assertJsonPath('data.transfers.0.rider_collection_actor.id', $rider->id)
            ->assertJsonPath('data.transfers.0.rider_collection_actor.first_name', $rider->first_name)
            ->assertJsonPath('data.transfers.0.hub_released_by', $staff->id)
            ->assertJsonPath('data.transfers.0.rider_collected_by', $rider->id);
    }

    private function staff(): array
    {
        $hub = $this->hub('OUT-ORIGIN-'.uniqid());
        $staff = User::factory()->create(['role' => 'hub_staff', 'status' => 'active']);
        HubStaffProfile::create(['user_id' => $staff->id, 'hub_id' => $hub->id, 'assigned_at' => now()]);
        return [$staff, $hub];
    }

    private function hub(string $code): LogisticsHub
    {
        return LogisticsHub::create(['name' => $code, 'code' => $code, 'is_active' => true]);
    }

    private function rider(bool $eligible): array
    {
        $user = User::factory()->create([
            'role' => 'rider',
            'status' => 'active',
            'first_name' => 'Active',
            'last_name' => 'Rider',
            'email_verified_at' => $eligible ? now() : null,
        ]);
        $profile = CourierProfile::create(['user_id' => $user->id, 'sex' => 'prefer_not_to_say', 'birthday' => '1990-01-01']);
        if ($eligible) {
            foreach (['valid_id', 'or_cr', 'drivers_license'] as $type) {
                UserDocument::create(['user_id' => $user->id, 'document_type' => $type, 'file_path' => "private/test/{$user->id}-{$type}.pdf", 'status' => 'approved']);
            }
            Vehicle::create(['courier_profile_id' => $profile->id, 'vehicle_type' => 'motorcycle', 'plate_number' => 'OUT'.str_pad((string) $profile->id, 6, '0', STR_PAD_LEFT)]);
        }
        return [$user, $profile];
    }

    private function transfer(LogisticsHub $origin, LogisticsHub $destination, CourierProfile $profile): HubTransfer
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'delivery_address' => 'Private address must not be serialized',
            'payment_method' => 'cash_on_delivery',
            'subtotal' => 100,
            'shipping_fee' => 0,
            'total_amount' => 100,
            'status' => Delivery::SORTED,
        ]);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'status' => Delivery::SORTED,
            'current_hub_id' => $origin->id,
        ]);
        $logistics = User::factory()->create(['role' => 'logistics', 'status' => 'active']);
        return HubTransfer::create([
            'delivery_id' => $delivery->id,
            'from_hub_id' => $origin->id,
            'to_hub_id' => $destination->id,
            'courier_profile_id' => $profile->id,
            'assigned_by' => $logistics->id,
            'status' => 'assigned',
        ]);
    }
}
