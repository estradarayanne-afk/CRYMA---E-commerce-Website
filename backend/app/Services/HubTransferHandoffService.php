<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\DeliveryEvent;
use App\Models\HubTransfer;
use App\Models\Order;
use App\Models\ReturnShipment;
use App\Models\CourierProfile;
use App\Models\User;
use App\Support\OrderDeliveryProjection;
use Illuminate\Support\Facades\DB;

class HubTransferHandoffService
{
    public function __construct(
        private readonly HubStaffHubResolver $hubResolver,
        private readonly CourierEligibility $courierEligibility,
    ) {}

    public function recordHubRelease(int $transferId, string $parcelCode, User $actor): HubTransfer
    {
        return DB::transaction(function () use ($transferId, $parcelCode, $actor): HubTransfer {
            $hub = $this->hubResolver->resolveForUpdate($actor);
            $transfer = HubTransfer::query()->whereKey($transferId)->lockForUpdate()->firstOrFail();
            $this->assertForwardTransfer($transfer);
            abort_unless((int) $transfer->from_hub_id === (int) $hub->id, 404, 'Transfer is not assigned to this hub.');
            abort_unless($transfer->status === 'assigned', 409, 'Only an assigned transfer can be released.');
            abort_unless($transfer->courier_profile_id !== null, 409, 'Transfer has no assigned Rider.');
            abort_unless($transfer->hub_released_at === null && $transfer->hub_released_by === null, 409, 'Hub release has already been recorded.');
            abort_unless($transfer->rider_collected_at === null && $transfer->rider_collected_by === null, 409, 'Rider collection has already been recorded.');
            abort_unless($this->courierEligibility->find((int) $transfer->courier_profile_id), 409, 'The assigned Rider is no longer eligible.');

            $deliverySnapshot = Delivery::query()->whereKey($transfer->delivery_id)->firstOrFail(['id', 'order_id']);
            $order = Order::query()->whereKey($deliverySnapshot->order_id)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::query()->whereKey($deliverySnapshot->id)->lockForUpdate()->firstOrFail();
            $this->assertParcelMatches($delivery, $parcelCode, $transfer);
            $this->assertOriginCustodyAndStatus($delivery, $order, $transfer);

            $releasedAt = now();
            $transfer->update([
                'hub_released_by' => $actor->id,
                'hub_released_hub_id' => $hub->id,
                'hub_released_at' => $releasedAt,
            ]);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $actor->id,
                'hub_id' => $hub->id,
                'event_type' => 'transfer_hub_released',
                'previous_status' => $delivery->status,
                'new_status' => $delivery->status,
                'reason' => "Hub released parcel to assigned Rider; transfer #{$transfer->id}.",
            ]);

            return $transfer->fresh(['fromHub', 'toHub', 'courier.user', 'hubReleasedBy', 'hubReleasedHub', 'riderCollectedBy']);
        });
    }

    public function confirmRiderCollection(int $transferId, string $parcelCode, User $actor, int $courierProfileId): HubTransfer
    {
        return DB::transaction(function () use ($transferId, $parcelCode, $actor, $courierProfileId): HubTransfer {
            $currentActor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            abort_unless($currentActor->role === 'rider' && $currentActor->status === 'active', 403, 'An active Rider account is required.');
            $profile = $this->courierEligibility->find($courierProfileId);
            abort_unless($profile && (int) $profile->user_id === (int) $currentActor->id, 403, 'Rider eligibility could not be confirmed.');

            $transfer = HubTransfer::query()->whereKey($transferId)->lockForUpdate()->firstOrFail();
            $this->assertForwardTransfer($transfer);
            abort_unless((int) $transfer->courier_profile_id === $courierProfileId, 403, 'Transfer is assigned to another Rider.');
            abort_unless($transfer->status === 'assigned', 409, 'Only an assigned transfer can be collected.');
            $this->assertValidHubRelease($transfer);
            abort_unless($transfer->rider_collected_at === null && $transfer->rider_collected_by === null, 409, 'Rider collection has already been recorded.');

            $deliverySnapshot = Delivery::query()->whereKey($transfer->delivery_id)->firstOrFail(['id', 'order_id']);
            $order = Order::query()->whereKey($deliverySnapshot->order_id)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::query()->whereKey($deliverySnapshot->id)->lockForUpdate()->firstOrFail();
            $this->assertParcelMatches($delivery, $parcelCode, $transfer);
            $this->assertOriginCustodyAndStatus($delivery, $order, $transfer);

            $transfer->update(['rider_collected_by' => $actor->id, 'rider_collected_at' => now()]);
            OrderDeliveryProjection::event($delivery, [
                'actor_id' => $actor->id,
                'hub_id' => $transfer->from_hub_id,
                'event_type' => 'rider_transfer_collected',
                'previous_status' => $delivery->status,
                'new_status' => $delivery->status,
                'reason' => "Assigned Rider confirmed collection; transfer #{$transfer->id}.",
            ]);

            $this->assertValidTwoStepConfirmations($transfer->fresh());
            $this->markForwardTransferInTransit($transfer, $delivery, $order, $actor);

            return $transfer->fresh(['fromHub', 'toHub', 'courier.user', 'hubReleasedBy', 'hubReleasedHub', 'riderCollectedBy']);
        });
    }

    public function dispatch(int $transferId, User $actor, ?int $courierProfileId = null): HubTransfer
    {
        return DB::transaction(function () use ($transferId, $actor, $courierProfileId): HubTransfer {
            $transfer = HubTransfer::query()->whereKey($transferId)->lockForUpdate()->firstOrFail();
            if ($courierProfileId !== null) {
                abort_unless((int) $transfer->courier_profile_id === $courierProfileId, 403, 'Transfer is assigned to another Rider.');
            }
            abort_unless($transfer->status === 'assigned', 409, 'Transfer is no longer waiting for dispatch.');

            if ($transfer->delivery_id !== null && $transfer->return_shipment_id === null) {
                $this->assertValidTwoStepConfirmations($transfer);
                $deliverySnapshot = Delivery::query()->whereKey($transfer->delivery_id)->firstOrFail(['id', 'order_id']);
                $order = Order::query()->whereKey($deliverySnapshot->order_id)->lockForUpdate()->firstOrFail();
                $delivery = Delivery::query()->whereKey($deliverySnapshot->id)->lockForUpdate()->firstOrFail();
                $this->assertOriginCustodyAndStatus($delivery, $order, $transfer);
                $this->markForwardTransferInTransit($transfer, $delivery, $order, $actor);
            } else {
                // Preserve the existing return-transfer dispatch lifecycle.
                $return = ReturnShipment::query()->whereKey($transfer->return_shipment_id)->lockForUpdate()->firstOrFail();
                abort_unless((int) $return->current_hub_id === (int) $transfer->from_hub_id && $return->status === 'at_hub', 409, 'Return custody no longer matches the transfer origin.');
                $transfer->update(['status' => 'in_transit', 'departed_at' => now()]);
                $return->update(['status' => 'in_transit_to_hub']);
            }

            return $transfer->fresh(['fromHub', 'toHub', 'courier.user', 'assignedBy', 'hubReleasedBy', 'hubReleasedHub', 'riderCollectedBy']);
        });
    }

    private function assertForwardTransfer(HubTransfer $transfer): void
    {
        abort_unless($transfer->delivery_id !== null && $transfer->return_shipment_id === null, 404, 'Forward parcel transfer not found.');
    }

    private function assertParcelMatches(Delivery $delivery, string $parcelCode, HubTransfer $transfer): void
    {
        abort_unless((int) $delivery->id === (int) $transfer->delivery_id && hash_equals((string) $delivery->parcel_code, $parcelCode), 422, 'The scanned parcel does not match this transfer.');
    }

    private function assertOriginCustodyAndStatus(Delivery $delivery, Order $order, HubTransfer $transfer): void
    {
        abort_unless((int) $delivery->current_hub_id === (int) $transfer->from_hub_id, 409, 'Parcel custody no longer matches the transfer origin.');
        abort_unless($order->status === $delivery->status && in_array($delivery->status, [Delivery::AT_SORTING_CENTER, Delivery::SORTED], true), 409, 'Parcel is not in a transferable hub state.');
    }

    private function assertValidHubRelease(HubTransfer $transfer): void
    {
        abort_unless(
            $transfer->hub_released_by !== null
                && $transfer->hub_released_at !== null
                && (int) $transfer->hub_released_hub_id === (int) $transfer->from_hub_id,
            409,
            'Hub Staff release confirmation is required before Rider collection.',
        );
        abort_unless(DeliveryEvent::query()->where('delivery_id', $transfer->delivery_id)
            ->where('event_type', 'transfer_hub_released')
            ->where('actor_id', $transfer->hub_released_by)
            ->where('hub_id', $transfer->from_hub_id)->exists(),
            409,
            'A matching Hub Staff release audit event is required.',
        );
    }

    private function assertValidTwoStepConfirmations(HubTransfer $transfer): void
    {
        $this->assertValidHubRelease($transfer);
        abort_unless(
            $transfer->rider_collected_by !== null
                && $transfer->rider_collected_at !== null
                && (int) $transfer->rider_collected_by === (int) CourierProfile::query()->whereKey($transfer->courier_profile_id)->value('user_id'),
            409,
            'The assigned Rider collection confirmation is required before dispatch.',
        );
        abort_unless(DeliveryEvent::query()->where('delivery_id', $transfer->delivery_id)
            ->where('event_type', 'rider_transfer_collected')
            ->where('actor_id', $transfer->rider_collected_by)
            ->where('hub_id', $transfer->from_hub_id)->exists(),
            409,
            'A matching Rider collection audit event is required.',
        );
    }

    private function markForwardTransferInTransit(HubTransfer $transfer, Delivery $delivery, Order $order, User $actor): void
    {
        $transfer->update(['status' => 'in_transit', 'departed_at' => now()]);
        OrderDeliveryProjection::event($delivery, [
            'actor_id' => $actor->id,
            'hub_id' => $transfer->from_hub_id,
            'event_type' => 'hub_transfer_departed',
            'previous_status' => $delivery->status,
            'new_status' => $delivery->status,
            'reason' => "Departed {$transfer->fromHub()->value('name')} for hub #{$transfer->to_hub_id}; transfer #{$transfer->id}.",
        ]);
    }
}
