<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\HubTransfer;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\User;
use App\Support\OrderDeliveryProjection;
use Illuminate\Support\Facades\DB;

class HubTransferReceivingService
{
    public function __construct(private readonly HubStaffHubResolver $hubResolver) {}

    public function receiveDelivery(User $actor, int $transferId, string $parcelCode, ?int $globalHubId = null): HubTransfer
    {
        return DB::transaction(function () use ($actor, $transferId, $parcelCode, $globalHubId): HubTransfer {
            $hub = $globalHubId === null
                ? $this->hubResolver->resolveForUpdate($actor)
                : LogisticsHub::query()->whereKey($globalHubId)->lockForUpdate()->firstOrFail();
            abort_unless($hub->is_active, 422, 'Select an active destination hub.');

            $transfer = HubTransfer::query()->whereKey($transferId)->lockForUpdate()->firstOrFail();
            abort_unless($transfer->delivery_id !== null && $transfer->return_shipment_id === null, 404, 'Forward parcel transfer not found.');
            abort_unless($transfer->status === 'in_transit', 409, 'Only an in-transit transfer can be received.');
            abort_unless(
                (int) $transfer->to_hub_id === (int) $hub->id,
                $globalHubId === null ? 404 : 422,
                'Transfer is not assigned to this hub.',
            );

            $delivery = Delivery::query()->where('parcel_code', $parcelCode)->lockForUpdate()->firstOrFail();
            abort_unless((int) $delivery->id === (int) $transfer->delivery_id, 422, 'The scanned parcel does not match this transfer.');
            abort_unless((int) $delivery->current_hub_id === (int) $transfer->from_hub_id, 409, 'Parcel custody no longer matches the transfer origin.');
            $order = Order::query()->whereKey($delivery->order_id)->lockForUpdate()->firstOrFail();
            abort_unless($order->status === $delivery->status && in_array($delivery->status, [Delivery::AT_SORTING_CENTER, Delivery::SORTED], true), 409, 'Parcel is not in a transferable hub state.');

            return $this->recordArrival($actor, $transfer, $delivery, $hub, $transfer->transport_mode === 'third_party'
                ? "QR verified at hub {$hub->code} (#{$hub->id}); carrier {$transfer->carrier_name}; tracking {$transfer->tracking_reference}; shipment {$transfer->shipment_reference}."
                : "QR received at hub {$hub->code} (#{$hub->id}); transfer #{$transfer->id}.");
        });
    }

    public function receiveThirdPartyTransfer(User $actor, int $transferId, int $destinationHubId): HubTransfer
    {
        return DB::transaction(function () use ($actor, $transferId, $destinationHubId): HubTransfer {
            $hub = LogisticsHub::query()->whereKey($destinationHubId)->lockForUpdate()->firstOrFail();
            abort_unless($hub->is_active, 422, 'Select an active destination hub.');

            $transfer = HubTransfer::query()->whereKey($transferId)->lockForUpdate()->firstOrFail();
            abort_unless(
                $transfer->delivery_id !== null
                    && $transfer->return_shipment_id === null
                    && $transfer->transport_mode === 'third_party',
                404,
                'Third-party parcel transfer not found.',
            );
            abort_unless($transfer->status === 'in_transit', 409, 'Only an in-transit transfer can be received.');
            abort_unless((int) $transfer->to_hub_id === (int) $hub->id, 404, 'Transfer is not assigned to this hub.');

            $delivery = Delivery::query()->whereKey($transfer->delivery_id)->lockForUpdate()->firstOrFail();
            abort_unless((int) $delivery->current_hub_id === (int) $transfer->from_hub_id, 409, 'Parcel custody no longer matches the transfer origin.');
            $order = Order::query()->whereKey($delivery->order_id)->lockForUpdate()->firstOrFail();
            abort_unless(
                $order->status === $delivery->status
                    && in_array($delivery->status, [Delivery::AT_SORTING_CENTER, Delivery::SORTED], true),
                409,
                'Parcel is not in a transferable hub state.',
            );

            return $this->recordArrival(
                $actor,
                $transfer,
                $delivery,
                $hub,
                "Shipment tracking reference verified at hub {$hub->code} (#{$hub->id}); carrier {$transfer->carrier_name}; tracking {$transfer->tracking_reference}; shipment {$transfer->shipment_reference}.",
            );
        });
    }

    private function recordArrival(
        User $actor,
        HubTransfer $transfer,
        Delivery $delivery,
        LogisticsHub $hub,
        string $reason,
    ): HubTransfer {
        $transfer->update(['status' => 'arrived', 'arrived_at' => now()]);
        $delivery->update(['current_hub_id' => $hub->id]);
        OrderDeliveryProjection::event($delivery, [
            'actor_id' => $actor->id,
            'hub_id' => $hub->id,
            'event_type' => 'hub_transfer_arrived',
            'previous_status' => $delivery->status,
            'new_status' => $delivery->status,
            'reason' => $reason,
        ]);

        return $transfer->fresh(['fromHub', 'toHub', 'delivery', 'returnShipment']);
    }
}
