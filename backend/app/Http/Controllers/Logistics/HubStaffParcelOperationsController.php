<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryEvent;
use App\Models\DeliveryRequest;
use App\Models\DirectDeliveryNotice;
use App\Models\HubTransfer;
use App\Models\LogisticsHub;
use App\Models\Order;
use App\Models\PickupAssignment;
use App\Services\HubStaffHubResolver;
use App\Services\HubTransferReceivingService;
use App\Services\HubTransferHandoffService;
use App\Services\ParcelReceivingService;
use App\Services\ParcelSortingService;
use App\Services\CourierEligibility;
use App\Support\OrderDeliveryProjection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class HubStaffParcelOperationsController extends Controller
{
    public function index(Request $request, HubStaffHubResolver $resolver)
    {
        $values = $request->validate([
            'status' => ['sometimes', Rule::in([Delivery::AT_SORTING_CENTER, Delivery::SORTED])],
            'parcel_code' => ['sometimes', 'string', 'max:40'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'hub_id' => ['prohibited'],
        ]);
        $hub = $resolver->resolve($request->user());
        $query = Delivery::query()->where('current_hub_id', $hub->id)
            ->whereIn('status', [Delivery::AT_SORTING_CENTER, Delivery::SORTED]);
        if (isset($values['status'])) $query->where('status', $values['status']);
        if (isset($values['parcel_code'])) $query->where('parcel_code', 'like', '%'.$values['parcel_code'].'%');

        $rows = $query->with(['currentHub:id,name,code', 'deliveryArea:id,name,hub_id'])
            ->orderByDesc('updated_at')->orderByDesc('id')->paginate($values['per_page'] ?? 20);
        $counts = Delivery::query()->where('current_hub_id', $hub->id)
            ->whereIn('status', [Delivery::AT_SORTING_CENTER, Delivery::SORTED])
            ->selectRaw('status, count(*) as aggregate')->groupBy('status')->pluck('aggregate', 'status');

        return response()->json([
            'success' => true,
            'hub' => $hub->only(['id', 'name', 'code']),
            'counts' => [
                'parcels_at_hub' => (int) $counts->sum(),
                'awaiting_sorting' => (int) ($counts[Delivery::AT_SORTING_CENTER] ?? 0),
                'sorted' => (int) ($counts[Delivery::SORTED] ?? 0),
                'incoming_transfers' => HubTransfer::query()->where('to_hub_id', $hub->id)
                    ->where('status', 'in_transit')->whereNotNull('delivery_id')->whereNull('return_shipment_id')->count(),
            ],
            'data' => $rows->through(fn (Delivery $delivery) => $this->parcel($delivery)),
        ]);
    }

    public function incomingPickup(Request $request, HubStaffHubResolver $resolver)
    {
        $values = $request->validate([
            'parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
            'hub_id' => ['prohibited'],
        ]);
        $hub = $resolver->resolve($request->user());
        $delivery = Delivery::query()->where('parcel_code', $values['parcel_code'])
            ->whereNull('current_hub_id')->where('status', Delivery::PICKED_UP)
            ->whereHas('order', fn ($query) => $query->where('status', Delivery::PICKED_UP))
            ->whereHas('pickupAssignment', fn ($query) => $query->where('status', PickupAssignment::PICKED_UP)->whereNotNull('picked_up_at')->whereNull('received_at'))
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'hub' => $hub->only(['id', 'name', 'code']),
            'data' => [
                'order_id' => $delivery->order_id,
                'parcel_code' => $delivery->parcel_code,
                'status' => $delivery->status,
                'receiving_hub' => $hub->only(['id', 'name', 'code']),
                'eligible_for_receipt' => true,
            ],
        ]);
    }

    public function receivePickup(Request $request, ParcelReceivingService $receiving)
    {
        $values = $request->validate([
            'order_id' => ['required', 'integer'],
            'parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
            'hub_id' => ['prohibited'],
        ]);
        $assignment = $receiving->receivePickup((int) $values['order_id'], $values['parcel_code'], $request->user());
        $delivery = $assignment->delivery;
        $hub = LogisticsHub::query()->findOrFail($delivery->current_hub_id);

        return response()->json([
            'success' => true,
            'message' => 'Parcel received at your assigned hub.',
            'data' => [
                'order_id' => $delivery->order_id,
                'parcel_code' => $delivery->parcel_code,
                'status' => $delivery->status,
                'pickup_status' => $assignment->status,
                'hub' => $hub->only(['id', 'name', 'code']),
            ],
        ]);
    }

    public function incomingTransfers(Request $request, HubStaffHubResolver $resolver)
    {
        $values = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'hub_id' => ['prohibited'],
        ]);
        $hub = $resolver->resolve($request->user());
        $rows = HubTransfer::query()->where('to_hub_id', $hub->id)->where('status', 'in_transit')
            ->whereNotNull('delivery_id')->whereNull('return_shipment_id')
            ->with(['fromHub:id,name,code', 'delivery:id,parcel_code,status,current_hub_id'])
            ->orderByDesc('departed_at')->orderByDesc('id')->paginate($values['per_page'] ?? 20);

        return response()->json([
            'success' => true,
            'hub' => $hub->only(['id', 'name', 'code']),
            'data' => $rows->through(fn (HubTransfer $transfer) => [
                'id' => $transfer->id,
                'status' => $transfer->status,
                'departed_at' => $transfer->departed_at,
                'origin_hub' => $transfer->fromHub?->only(['id', 'name', 'code']),
                'parcel' => $transfer->delivery ? [
                    'parcel_code' => $transfer->delivery->parcel_code,
                    'status' => $transfer->delivery->status,
                ] : null,
            ]),
        ]);
    }

    public function outgoingTransfers(Request $request, HubStaffHubResolver $resolver, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'hub_id' => ['prohibited'],
        ]);
        $hub = $resolver->resolve($request->user());
        $eligibleCourierProfiles = $eligibility->profiles()->select('courier_profiles.id');

        $rows = HubTransfer::query()
            ->where('from_hub_id', $hub->id)
            ->where('status', 'assigned')
            ->whereNotNull('delivery_id')
            ->whereNull('return_shipment_id')
            ->whereNull('hub_released_by')
            ->whereNull('hub_released_at')
            ->whereNull('rider_collected_by')
            ->whereNull('rider_collected_at')
            ->whereIn('courier_profile_id', $eligibleCourierProfiles)
            ->whereHas('delivery', function ($query) use ($hub) {
                $query->where('current_hub_id', $hub->id)
                    ->whereIn('status', [Delivery::AT_SORTING_CENTER, Delivery::SORTED])
                    ->whereHas('order', fn ($order) => $order->whereColumn('orders.status', 'deliveries.status'));
            })
            ->with([
                'fromHub:id,name,code',
                'toHub:id,name,code',
                'courier.user:id,first_name,last_name',
                'delivery:id,order_id,parcel_code,status,current_hub_id',
            ])
            ->orderByDesc('id')
            ->paginate($values['per_page'] ?? 20)
            ->through(fn (HubTransfer $transfer) => [
                'id' => $transfer->id,
                'status' => $transfer->status,
                'origin_hub' => $transfer->fromHub?->only(['id', 'name', 'code']),
                'destination_hub' => $transfer->toHub?->only(['id', 'name', 'code']),
                'parcel' => $transfer->delivery ? [
                    'order_id' => $transfer->delivery->order_id,
                    'parcel_code' => $transfer->delivery->parcel_code,
                    'status' => $transfer->delivery->status,
                ] : null,
                'assigned_rider' => $transfer->courier?->user ? [
                    'id' => $transfer->courier->id,
                    'name' => trim($transfer->courier->user->first_name.' '.$transfer->courier->user->last_name),
                ] : null,
            ]);

        return response()->json([
            'success' => true,
            'hub' => $hub->only(['id', 'name', 'code']),
            'data' => $rows,
        ]);
    }

    public function receiveTransfer(Request $request, int $id, HubTransferReceivingService $receiving)
    {
        $values = $request->validate([
            'parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
            'hub_id' => ['prohibited'],
        ]);
        $transfer = $receiving->receiveDelivery($request->user(), $id, $values['parcel_code']);

        return response()->json([
            'success' => true,
            'message' => 'Transfer parcel received at your assigned hub.',
            'data' => [
                'transfer_id' => $transfer->id,
                'status' => $transfer->status,
                'arrived_at' => $transfer->arrived_at,
                'parcel_code' => $transfer->delivery?->parcel_code,
                'parcel_status' => $transfer->delivery?->status,
                'hub' => $transfer->toHub?->only(['id', 'name', 'code']),
            ],
        ]);
    }

    public function releaseTransfer(Request $request, int $id, HubTransferHandoffService $handoff)
    {
        $values = $request->validate([
            'parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
            'hub_id' => ['prohibited'],
            'from_hub_id' => ['prohibited'],
            'to_hub_id' => ['prohibited'],
            'courier_profile_id' => ['prohibited'],
        ]);
        $transfer = $handoff->recordHubRelease($id, $values['parcel_code'], $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Parcel release to the assigned Rider was recorded. The transfer is awaiting Rider collection confirmation.',
            'data' => [
                'id' => $transfer->id,
                'status' => $transfer->status,
                'hub_released_at' => $transfer->hub_released_at,
                'hub' => $transfer->hubReleasedHub?->only(['id', 'name', 'code']),
                'rider_collection_confirmed' => $transfer->rider_collected_at !== null,
            ],
        ]);
    }

    public function scan(Request $request, HubStaffHubResolver $resolver)
    {
        $values = $request->validate([
            'parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
            'expected_status' => ['required', Rule::in([Delivery::AT_SORTING_CENTER, Delivery::SORTED])],
            'hub_id' => ['prohibited'],
        ]);
        $result = DB::transaction(function () use ($request, $resolver, $values): array {
            $hub = $resolver->resolveForUpdate($request->user());
            $candidate = Delivery::query()->where('parcel_code', $values['parcel_code'])
                ->where('current_hub_id', $hub->id)->firstOrFail(['id', 'order_id']);
            $order = Order::query()->whereKey($candidate->order_id)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::query()->whereKey($candidate->id)->where('current_hub_id', $hub->id)
                ->lockForUpdate()->firstOrFail();
            abort_unless($delivery->status === $values['expected_status'] && $order->status === $delivery->status, 409, 'Parcel status changed. Refresh the hub queue before scanning.');

            if (!DeliveryEvent::query()->where('delivery_id', $delivery->id)->where('event_type', 'parcel_scanned')->where('hub_id', $hub->id)->exists()) {
                OrderDeliveryProjection::event($delivery, [
                    'actor_id' => $request->user()->id,
                    'hub_id' => $hub->id,
                    'event_type' => 'parcel_scanned',
                    'previous_status' => $delivery->status,
                    'new_status' => $delivery->status,
                    'reason' => 'Parcel scanned at assigned hub.',
                ]);
            }

            return [$delivery->fresh(['deliveryArea:id,name,hub_id']), $hub];
        });

        return response()->json(['success' => true, 'message' => 'Parcel scanned at your assigned hub.', 'data' => $this->parcel($result[0]) + ['hub' => $result[1]->only(['id', 'name', 'code'])]]);
    }

    public function sort(Request $request, string $parcelCode, HubStaffHubResolver $resolver, ParcelSortingService $sorting)
    {
        $values = $request->validate([
            'expected_status' => ['required', Rule::in([Delivery::AT_SORTING_CENTER])],
            'hub_id' => ['prohibited'],
            'delivery_area_id' => ['prohibited'],
            'courier_profile_id' => ['prohibited'],
        ]);

        $result = DB::transaction(function () use ($request, $parcelCode, $resolver, $sorting, $values): array {
            $hub = $resolver->resolveForUpdate($request->user());
            $candidate = Delivery::query()->where('parcel_code', $parcelCode)
                ->where('current_hub_id', $hub->id)->firstOrFail(['id', 'order_id']);
            $order = Order::query()->whereKey($candidate->order_id)->lockForUpdate()->firstOrFail();
            $delivery = Delivery::query()->whereKey($candidate->id)->where('current_hub_id', $hub->id)
                ->lockForUpdate()->firstOrFail();
            abort_unless($delivery->status === $values['expected_status'] && $order->status === $delivery->status, 409, 'Parcel status changed. Refresh the hub queue before sorting.');
            $sorting->transitionToSorted($delivery, $request->user(), requireHubScan: true);

            return [$delivery->fresh(['deliveryArea:id,name,hub_id']), $hub];
        });

        return response()->json(['success' => true, 'message' => 'Parcel sorted at your assigned hub.', 'data' => $this->parcel($result[0]) + ['hub' => $result[1]->only(['id', 'name', 'code'])]]);
    }

    public function history(Request $request, HubStaffHubResolver $resolver)
    {
        $values = $request->validate([
            'event_type' => ['sometimes', 'string', 'max:64'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'hub_id' => ['prohibited'],
        ]);
        $hub = $resolver->resolve($request->user());
        $query = DeliveryEvent::query()->where('hub_id', $hub->id)
            ->with(['delivery:id,parcel_code', 'actor:id,first_name,last_name']);
        if (isset($values['event_type'])) $query->where('event_type', $values['event_type']);
        $events = $query->orderByDesc('created_at')->orderByDesc('id')->paginate($values['per_page'] ?? 25);

        return response()->json([
            'success' => true,
            'hub' => $hub->only(['id', 'name', 'code']),
            'data' => $events->through(fn (DeliveryEvent $event) => [
                'id' => $event->id,
                'event_type' => $event->event_type,
                'previous_status' => $event->previous_status,
                'new_status' => $event->new_status,
                'parcel_code' => $event->delivery?->parcel_code,
                'actor' => $event->actor ? trim($event->actor->first_name.' '.$event->actor->last_name) : null,
                'created_at' => $event->created_at,
            ]),
        ]);
    }

    public function directDeliveries(Request $request, HubStaffHubResolver $resolver)
    {
        $values = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'hub_id' => ['prohibited'],
        ]);
        $hub = $resolver->resolve($request->user());
        
        $rows = DirectDeliveryNotice::query()
            ->with([
                'delivery' => function ($q) {
                    $q->with(['order:id,buyer_id', 'order.buyer:id,first_name,last_name']);
                },
                'rider:id,first_name,last_name',
            ])
            ->whereHas('delivery', function ($q) use ($hub) {
                $q->where('delivery_type', 'direct')
                  ->where('current_hub_id', $hub->id);
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($values['per_page'] ?? 20);

        return response()->json([
            'success' => true,
            'hub' => $hub->only(['id', 'name', 'code']),
            'data' => $rows->through(function (DirectDeliveryNotice $notice) {
                $delivery = $notice->delivery;
                $rider = $notice->rider;
                $order = $delivery->order;
                
                // Find delivery requests for accountability
                $requests = DeliveryRequest::query()
                    ->where('delivery_id', $delivery->id)
                    ->where('rider_id', $rider->id)
                    ->get();
                
                return [
                    'id' => $notice->id,
                    'rider' => [
                        'id' => $rider->id,
                        'name' => trim($rider->first_name . ' ' . $rider->last_name),
                    ],
                    'order_id' => $order->id,
                    'buyer_location' => $order->buyer ? trim($order->buyer->first_name . ' ' . $order->buyer->last_name) : 'Buyer',
                    'direct_choice_timestamp' => $notice->created_at,
                    'commission_amount' => 0, // TODO: Get from commission model when available
                    'confirmation_status' => $delivery->status,
                    'delivery_requests' => $requests->map(fn (DeliveryRequest $req) => [
                        'status' => $req->status,
                        'created_at' => $req->created_at,
                        'expires_at' => $req->expires_at,
                    ])->all(),
                ];
            }),
        ]);
    }

    private function parcel(Delivery $delivery): array
    {
        return [
            'id' => $delivery->id,
            'order_id' => $delivery->order_id,
            'parcel_code' => $delivery->parcel_code,
            'status' => $delivery->status,
            'current_hub' => $delivery->currentHub?->only(['id', 'name', 'code']),
            'delivery_area' => $delivery->deliveryArea?->only(['id', 'name', 'hub_id']),
            'sorted_at' => $delivery->sorted_at,
            'updated_at' => $delivery->updated_at,
        ];
    }
}
