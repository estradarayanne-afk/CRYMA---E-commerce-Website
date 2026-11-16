<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\HubTransfer;
use App\Models\HubTransferShipment;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\User;
use App\Services\DeliveryAreaResolver;
use App\Services\LogisticsMunicipality;
use App\Support\OrderDeliveryProjection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ThirdPartyHubTransferService
{
    public function __construct(
        private readonly DeliveryAreaResolver $areaResolver,
        private readonly LogisticsMunicipality $municipality,
    ) {}

    /**
     * Create one tracked transfer row per parcel under a shared carrier shipment reference.
     *
     * @param  array<int, int>  $deliveryIds
     * @return Collection<int, HubTransfer>
     */
    public function createShipment(User $actor, array $deliveryIds, int $fromHubId, int $toHubId, string $carrierCode, string $carrierName, string $trackingReference, ?string $shipmentReference = null): Collection
    {
        $shipmentReference ??= 'CRYMA-XFER-'.Str::upper(Str::random(12));

        try {
            return DB::transaction(function () use ($actor, $deliveryIds, $fromHubId, $toHubId, $carrierCode, $carrierName, $trackingReference, $shipmentReference): Collection {
                $fromHub = LogisticsHub::query()->whereKey($fromHubId)->lockForUpdate()->firstOrFail();
                $toHub = LogisticsHub::query()->whereKey($toHubId)->lockForUpdate()->firstOrFail();
                abort_unless($fromHub->is_active && $toHub->is_active, 422, 'Select active origin and destination hubs.');
                abort_unless($fromHub->id !== $toHub->id, 422, 'Choose a destination different from the origin hub.');

                $deliveries = Delivery::query()->whereIn('id', $deliveryIds)->orderBy('id')->lockForUpdate()->get();
                abort_unless($deliveries->count() === count($deliveryIds), 404, 'One or more parcels were not found.');
                $orders = Order::query()
                    ->with('items.seller.sellerPickupAddress', 'items.seller.addresses')
                    ->whereIn('id', $deliveries->pluck('order_id'))
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');
                $buyerRoutes = $this->areaResolver->resolveMany($orders->pluck('delivery_psgc_code'));

                foreach ($deliveries as $delivery) {
                    abort_unless((int) $delivery->current_hub_id === (int) $fromHub->id, 409, "Parcel {$delivery->parcel_code} is not at the selected origin hub.");
                    abort_unless(
                        in_array($delivery->status, [Delivery::AT_SORTING_CENTER, Delivery::SORTED], true)
                        && $orders->get($delivery->order_id)?->status === $delivery->status,
                        409,
                        "Parcel {$delivery->parcel_code} is not in a transferable hub state.",
                    );
                    abort_if(
                        HubTransfer::query()->whereIn('status', ['assigned', 'in_transit'])
                            ->where('delivery_id', $delivery->id)->exists(),
                        409,
                        "Parcel {$delivery->parcel_code} already has an active hub transfer.",
                    );
                    $destinationArea = $this->assertLocalityRouteMatches(
                        $delivery,
                        $orders->get($delivery->order_id),
                        $fromHub,
                        $toHub,
                        $buyerRoutes[$orders->get($delivery->order_id)?->delivery_psgc_code ?? ''] ?? null,
                    );
                    if ($destinationArea) {
                        $delivery->update(['delivery_area_id' => $destinationArea->id]);
                    }
                }

                abort_if(
                    HubTransferShipment::query()->where('shipment_reference', $shipmentReference)->exists(),
                    409,
                    'This shipment reference is already in use.',
                );

                HubTransferShipment::query()->create([
                    'shipment_reference' => $shipmentReference,
                    'carrier_code' => $carrierCode,
                    'carrier_name' => $carrierName,
                    'tracking_reference' => $trackingReference,
                    'from_hub_id' => $fromHub->id,
                    'to_hub_id' => $toHub->id,
                    'created_by' => $actor->id,
                ]);

                return $deliveries->map(fn (Delivery $delivery): HubTransfer => HubTransfer::query()->create([
                    'delivery_id' => $delivery->id,
                    'from_hub_id' => $fromHub->id,
                    'to_hub_id' => $toHub->id,
                    'assigned_by' => $actor->id,
                    'status' => 'assigned',
                    'transport_mode' => 'third_party',
                    'carrier_code' => $carrierCode,
                    'carrier_name' => $carrierName,
                    'tracking_reference' => $trackingReference,
                    'shipment_reference' => $shipmentReference,
                ]))->load(['fromHub', 'toHub', 'delivery']);
            });
        } catch (QueryException $exception) {
            if (HubTransferShipment::query()->where('shipment_reference', $shipmentReference)->exists()) {
                abort(409, 'This shipment reference is already in use.');
            }

            throw $exception;
        }
    }

    /**
     * @return Collection<int, HubTransfer>
     */
    public function dispatchShipment(User $actor, string $shipmentReference): Collection
    {
        return DB::transaction(function () use ($actor, $shipmentReference): Collection {
            $shipment = HubTransferShipment::query()->where('shipment_reference', $shipmentReference)->lockForUpdate()->first();
            abort_unless($shipment, 404, 'Third-party transfer shipment not found.');
            $transfers = $shipment->transfers()->where('transport_mode', 'third_party')
                ->with(['delivery'])->orderBy('id')->lockForUpdate()->get();
            abort_unless($transfers->isNotEmpty(), 404, 'Third-party transfer shipment not found.');
            abort_unless($transfers->every(fn (HubTransfer $transfer) => $transfer->status === 'assigned'), 409, 'Every parcel in the shipment must be awaiting dispatch.');

            $departedAt = now();
            foreach ($transfers as $transfer) {
                $transfer->update(['status' => 'in_transit', 'departed_at' => $departedAt]);
                OrderDeliveryProjection::event($transfer->delivery, [
                    'actor_id' => $actor->id,
                    'hub_id' => $transfer->from_hub_id,
                    'event_type' => 'hub_transfer_departed',
                    'previous_status' => $transfer->delivery->status,
                    'new_status' => $transfer->delivery->status,
                    'reason' => trim("Third-party carrier {$transfer->carrier_name}; tracking {$transfer->tracking_reference}; shipment {$transfer->shipment_reference}."),
                ]);
            }

            return $transfers->fresh(['fromHub', 'toHub', 'delivery']);
        });
    }

    /**
     * @param  array<int, array{transfer_id: int, parcel_code: string}>  $items
     * @return Collection<int, HubTransfer>
     */
    public function receiveShipment(User $actor, string $shipmentReference, array $items, HubTransferReceivingService $receiving): Collection
    {
        return DB::transaction(function () use ($actor, $shipmentReference, $items, $receiving): Collection {
            $shipment = HubTransferShipment::query()->where('shipment_reference', $shipmentReference)->lockForUpdate()->first();
            abort_unless($shipment, 404, 'Third-party transfer shipment not found.');
            $transfers = $shipment->transfers()->where('transport_mode', 'third_party')
                ->with(['delivery'])->orderBy('id')->lockForUpdate()->get();
            abort_unless($transfers->isNotEmpty(), 404, 'Third-party transfer shipment not found.');
            abort_unless($transfers->every(fn (HubTransfer $transfer) => $transfer->status === 'in_transit'), 409, 'Every parcel in the shipment must be in transit before receipt.');

            $itemsById = collect($items)->keyBy(fn (array $item) => (int) $item['transfer_id']);
            abort_unless(
                $itemsById->count() === count($items) && $transfers->pluck('id')->sort()->values()->all() === $itemsById->keys()->sort()->values()->all(),
                422,
                'Submit one parcel-code verification for every item in this shipment.',
            );

            $destinationHubId = (int) $transfers->first()->to_hub_id;
            abort_unless($transfers->every(fn (HubTransfer $transfer) => (int) $transfer->to_hub_id === $destinationHubId), 409, 'Shipment items must share a destination hub.');
            $received = collect();
            foreach ($transfers as $transfer) {
                $received->push($receiving->receiveDelivery(
                    $actor,
                    (int) $transfer->id,
                    $itemsById->get($transfer->id)['parcel_code'],
                    $destinationHubId,
                ));
            }

            return $received;
        });
    }

    /**
     * Receive every parcel in a shipment after the destination staff verifies its tracking reference.
     *
     * @return Collection<int, HubTransfer>
     */
    public function receiveShipmentByTrackingReference(
        User $actor,
        string $shipmentReference,
        string $trackingReference,
        LogisticsHub $destinationHub,
        HubTransferReceivingService $receiving,
    ): Collection {
        return DB::transaction(function () use ($actor, $shipmentReference, $trackingReference, $destinationHub, $receiving): Collection {
            $shipment = HubTransferShipment::query()
                ->where('shipment_reference', $shipmentReference)
                ->lockForUpdate()
                ->first();
            abort_unless($shipment, 404, 'Third-party transfer shipment not found.');
            abort_unless(
                hash_equals((string) $shipment->tracking_reference, trim($trackingReference)),
                422,
                'Tracking reference does not match this shipment.',
            );
            abort_unless(
                (int) $shipment->to_hub_id === (int) $destinationHub->id,
                404,
                'Shipment is not addressed to your municipality hub.',
            );

            $transfers = $shipment->transfers()
                ->where('transport_mode', 'third_party')
                ->with('delivery')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();
            abort_unless($transfers->isNotEmpty(), 404, 'Third-party transfer shipment not found.');
            abort_unless(
                $transfers->every(fn (HubTransfer $transfer) =>
                    $transfer->status === 'in_transit'
                    && (int) $transfer->to_hub_id === (int) $destinationHub->id
                ),
                409,
                'Every parcel in the shipment must be in transit to your municipality hub.',
            );

            return $transfers->map(fn (HubTransfer $transfer): HubTransfer =>
                $receiving->receiveThirdPartyTransfer($actor, (int) $transfer->id, (int) $destinationHub->id)
            );
        });
    }

    private function assertLocalityRouteMatches(
        Delivery $delivery,
        ?Order $order,
        LogisticsHub $fromHub,
        LogisticsHub $toHub,
        ?array $buyerRoute,
    ): ?DeliveryArea {
        $sellers = $order?->items->pluck('seller')->filter()->unique('id')->values() ?? collect();
        if ($sellers->isEmpty()) {
            return null;
        }

        $sellerHubs = $sellers->map(function (User $seller): ?LogisticsHub {
            return $this->municipality->resolveHubForAddress(
                $this->municipality->pickupAddressForSeller($seller),
            );
        });
        abort_unless($sellerHubs->every(fn (?LogisticsHub $hub) => $hub !== null), 422, 'Every seller pickup municipality must map to an active logistics hub before bulk shipment.');
        $originHubIds = $sellerHubs->map(fn (LogisticsHub $hub) => (int) $hub->id)->unique();
        abort_unless($originHubIds->count() === 1, 422, 'Bulk shipment items must have one seller-origin municipality.');
        abort_unless((int) $originHubIds->first() === (int) $fromHub->id, 422, "Parcel {$delivery->parcel_code} must ship from its seller municipality hub.");

        $destinationArea = ($buyerRoute['status'] ?? null) === 'mapped'
            ? $buyerRoute['area']
            : null;
        abort_unless(
            $destinationArea && $destinationArea->hub && $destinationArea->hub->is_active,
            422,
            'The buyer municipality must map to an active delivery hub before bulk shipment.',
        );
        abort_unless(
            (int) $destinationArea->hub_id === (int) $toHub->id,
            422,
            "Parcel {$delivery->parcel_code} must ship to its buyer municipality hub.",
        );

        return $destinationArea;
    }
}
