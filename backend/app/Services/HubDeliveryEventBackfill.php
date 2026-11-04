<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\DeliveryEvent;
use App\Models\HubTransfer;

class HubDeliveryEventBackfill
{
    private const HUB_EVENT_TYPES = [
        'sorting_center_received',
        'legacy_sorting_receipt_verified',
        'hub_transfer_departed',
        'hub_transfer_arrived',
        'parcel_scanned',
        'sorted',
    ];

    public function run(): array
    {
        $stats = ['transfer_events' => 0, 'initial_hub_events' => 0, 'unknown_hub_events' => 0];

        HubTransfer::query()->whereNotNull('delivery_id')->orderBy('id')->chunkById(100, function ($transfers) use (&$stats): void {
            foreach ($transfers as $transfer) {
                $transferReference = 'transfer #'.$transfer->id.'.';
                $stats['transfer_events'] += DeliveryEvent::query()
                    ->where('delivery_id', $transfer->delivery_id)
                    ->whereNull('hub_id')
                    ->where('reason', 'like', '%'.$transferReference.'%')
                    ->where(function ($query) {
                        $query->where('event_type', 'hub_transfer_departed')
                            ->orWhere('event_type', 'hub_transfer_arrived');
                    })
                    ->get()
                    ->each(function (DeliveryEvent $event) use ($transfer): void {
                        $event->update([
                            'hub_id' => $event->event_type === 'hub_transfer_departed'
                                ? $transfer->from_hub_id
                                : $transfer->to_hub_id,
                        ]);
                    })->count();
            }
        });

        Delivery::query()->whereNotNull('current_hub_id')
            ->whereDoesntHave('hubTransfers')
            ->orderBy('id')->chunkById(100, function ($deliveries) use (&$stats): void {
                foreach ($deliveries as $delivery) {
                    $stats['initial_hub_events'] += DeliveryEvent::query()
                        ->where('delivery_id', $delivery->id)
                        ->whereNull('hub_id')
                        ->whereIn('event_type', ['sorting_center_received', 'legacy_sorting_receipt_verified', 'parcel_scanned', 'sorted'])
                        ->update(['hub_id' => $delivery->current_hub_id]);
                }
            });

        $stats['unknown_hub_events'] = DeliveryEvent::query()
            ->whereNull('hub_id')
            ->whereIn('event_type', self::HUB_EVENT_TYPES)
            ->count();

        return $stats;
    }
}
