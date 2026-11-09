<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryArea;
use App\Models\HubTransfer;
use App\Models\LogisticsHub;
use App\Models\ReturnShipment;
use App\Services\CourierEligibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ParcelFlowController extends Controller
{
    public function hubs() { return response()->json(['success' => true, 'data' => LogisticsHub::where('is_active', true)->orderBy('name')->get()]); }

    public function operations(CourierEligibility $eligibility)
    {
        $transfers = HubTransfer::with([
            'fromHub:id,name,code',
            'toHub:id,name,code,is_active',
            'courier.user:id,first_name,last_name',
            'assignedBy:id,first_name,last_name',
            'hubReleasedBy:id,first_name,last_name',
            'riderCollectedBy:id,first_name,last_name',
            'delivery.order:id,status',
            'delivery.currentHub:id,name,code',
            'delivery.events.actor:id,first_name,last_name',
            'returnShipment.order:id,status',
            'returnShipment.currentHub:id,name,code',
        ])->latest()->limit(100)->get();
        $transfers->each(function (HubTransfer $transfer): void {
            $releaseActor = $transfer->hubReleasedBy?->only(['id', 'first_name', 'last_name']);
            $collectionActor = $transfer->riderCollectedBy?->only(['id', 'first_name', 'last_name']);
            $transfer->unsetRelation('hubReleasedBy');
            $transfer->unsetRelation('riderCollectedBy');
            $transfer->setAttribute('hub_release_actor', $releaseActor);
            $transfer->setAttribute('rider_collection_actor', $collectionActor);
        });

        return response()->json(['success' => true, 'data' => [
            'hubs' => LogisticsHub::orderBy('name')->get(),
            'areas' => DeliveryArea::with([
                'hub:id,name,code,is_active',
                'couriers.user:id,first_name,last_name',
                'couriers.vehicles:id,courier_profile_id,vehicle_type',
            ])->orderBy('name')->get(),
            'transfers' => $transfers,
            'returns' => ReturnShipment::with(['refundRequest:id,status,requested_amount,approved_amount','delivery:id,order_id,parcel_code','order.items.product:id,name','buyer:id,first_name,last_name','seller:id,first_name,last_name','pickupCourier.user:id,first_name,last_name','deliveryCourier.user:id,first_name,last_name','currentHub:id,name,code'])->latest()->limit(100)->get(),
            'deliveries' => Delivery::with(['order:id,status,delivery_address','currentHub:id,name,code','deliveryArea:id,name,hub_id','deliveryArea.hub:id,name,code,is_active','events'])->whereIn('status', [Delivery::AT_SORTING_CENTER, Delivery::SORTED])->whereNotNull('current_hub_id')->latest()->limit(100)->get(),
            'couriers' => $eligibility->profiles()->with(['user:id,first_name,last_name'])->orderBy('id')->get(),
        ]]);
    }

    public function createHub(Request $request)
    {
        $this->normalizeHubInput($request);
        $v = $request->validate([
            'name' => ['required', 'string', 'max:100', 'not_regex:/^\s*$/'],
            'code' => ['required', 'string', 'max:24', 'alpha_dash', Rule::unique('logistics_hubs', 'code')],
            'address' => ['nullable', 'string', 'max:1000'],
        ]);
        $hub = LogisticsHub::create([...$v, 'name' => trim($v['name']), 'code' => strtoupper($v['code']), 'address' => isset($v['address']) ? trim($v['address']) : null]);
        return response()->json(['success' => true, 'data' => $hub], 201);
    }

    public function updateHub(Request $request, int $id)
    {
        $hub = LogisticsHub::findOrFail($id);
        $this->normalizeHubInput($request);
        $v = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100', 'not_regex:/^\s*$/'],
            'code' => ['sometimes', 'required', 'string', 'max:24', 'alpha_dash', Rule::unique('logistics_hubs', 'code')->ignore($hub->id)],
            'address' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);
        abort_if($v === [], 422, 'Provide at least one hub field to update.');
        if (array_key_exists('name', $v)) $v['name'] = trim($v['name']);
        if (array_key_exists('code', $v)) $v['code'] = strtoupper($v['code']);
        if (array_key_exists('address', $v) && $v['address'] !== null) $v['address'] = trim($v['address']);

        $hub = DB::transaction(function () use ($id, $v) {
            $hub = LogisticsHub::whereKey($id)->lockForUpdate()->firstOrFail();
            $hub->update($v);
            return $hub->fresh();
        });
        return response()->json(['success' => true, 'data' => $hub]);
    }

    private function normalizeHubInput(Request $request): void
    {
        foreach (['name', 'code', 'address'] as $field) {
            if (is_string($request->input($field))) $request->merge([$field => trim($request->input($field))]);
        }
        if (is_string($request->input('code'))) $request->merge(['code' => strtoupper($request->input('code'))]);
    }

    public function mapArea(Request $request, int $id)
    {
        $v = $request->validate(['hub_id' => ['required', 'integer', 'exists:logistics_hubs,id']]);
        $area = DB::transaction(function () use ($id, $v) {
            $hub = LogisticsHub::whereKey($v['hub_id'])->lockForUpdate()->firstOrFail();
            abort_unless($hub->is_active, 422, 'Select an active hub.');
            $area = DeliveryArea::whereKey($id)->lockForUpdate()->firstOrFail();
            $area->update(['hub_id' => $hub->id]);
            return $area->fresh()->load('hub');
        });
        return response()->json(['success' => true, 'data' => $area->load('hub')]);
    }

    public function assignReturnCourier(Request $request, int $id, CourierEligibility $eligibility)
    {
        $v = $request->validate(['leg' => ['required','in:pickup,delivery'], 'courier_profile_id' => ['required','integer','exists:courier_profiles,id']]);
        $courier = $eligibility->find((int) $v['courier_profile_id']);
        abort_unless($courier, 422, 'Select an eligible courier.');
        $shipment = DB::transaction(function () use ($id, $v, $courier, $eligibility) {
            $shipment = ReturnShipment::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($eligibility->find($courier->id), 422, 'Courier eligibility changed.');
            if ($v['leg'] === 'pickup') {
                abort_unless($shipment->status === 'awaiting_pickup', 409, 'Return pickup is no longer awaiting assignment.');
                $shipment->update(['pickup_courier_profile_id' => $courier->id, 'status' => 'pickup_assigned']);
            } else {
                abort_unless($shipment->status === 'at_hub', 409, 'Return parcel must be at a hub before assigning the seller delivery.');
                $shipment->update(['delivery_courier_profile_id' => $courier->id, 'status' => 'out_for_delivery']);
            }
            return $shipment->fresh();
        });
        return response()->json(['success' => true, 'data' => $shipment]);
    }

    public function receiveReturnAtHub(Request $request, int $id)
    {
        $v = $request->validate(['hub_id' => ['required','integer','exists:logistics_hubs,id'], 'note' => ['nullable','string','max:1000']]);
        $shipment = DB::transaction(function () use ($id, $v) {
            $hub = LogisticsHub::whereKey($v['hub_id'])->lockForUpdate()->firstOrFail();
            abort_unless($hub->is_active, 422, 'Select an active hub.');
            $shipment = ReturnShipment::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($shipment->status === 'picked_up', 409, 'Only a collected return parcel can be received at a hub.');
            $shipment->update(['status' => 'at_hub', 'current_hub_id' => $hub->id, 'note' => $v['note'] ?? null]);
            return $shipment->fresh();
        });
        return response()->json(['success' => true, 'data' => $shipment]);
    }

    public function createTransfer(Request $request, CourierEligibility $eligibility)
    {
        $v = $request->validate([
            'shipment_type' => ['required','in:delivery,return'], 'shipment_id' => ['required','integer'],
            'to_hub_id' => ['required','integer','exists:logistics_hubs,id'], 'courier_profile_id' => ['required','integer','exists:courier_profiles,id'], 'note' => ['nullable','string','max:1000'],
            'delivery_area_id' => [Rule::requiredIf($request->input('shipment_type') === 'delivery'), 'nullable', 'integer', 'exists:delivery_areas,id'],
        ]);
        $courier = $eligibility->find((int) $v['courier_profile_id']);
        abort_unless($courier, 422, 'Select an eligible courier.');
        $transfer = DB::transaction(function () use ($request, $v, $courier, $eligibility) {
            $delivery = $v['shipment_type'] === 'delivery' ? Delivery::whereKey($v['shipment_id'])->lockForUpdate()->first() : null;
            $return = $v['shipment_type'] === 'return' ? ReturnShipment::whereKey($v['shipment_id'])->lockForUpdate()->first() : null;
            $order = $delivery?->order()->lockForUpdate()->first();
            $area = $delivery ? DeliveryArea::whereKey($v['delivery_area_id'])->lockForUpdate()->firstOrFail() : null;
            $currentHubId = $delivery?->current_hub_id ?? $return?->current_hub_id;
            abort_unless(($delivery || $return) && $currentHubId, 404, 'Parcel is not currently recorded at a hub.');
            $destinationHub = LogisticsHub::whereKey($v['to_hub_id'])->lockForUpdate()->firstOrFail();
            abort_unless($destinationHub->is_active, 422, 'Select an active destination hub.');
            abort_unless((int) $currentHubId !== (int) $v['to_hub_id'], 422, 'Choose a different destination hub.');
            if ($delivery) abort_unless($order && $order->status === $delivery->status && in_array($delivery->status, [Delivery::AT_SORTING_CENTER, Delivery::SORTED], true), 409, 'Forward parcel is not ready for a hub transfer.');
            if ($delivery) {
                abort_unless($area->is_active && $area->hub_id, 422, 'Choose an active delivery area mapped to a hub.');
                abort_unless((int) $area->hub_id === (int) $destinationHub->id, 422, 'Destination hub must match the selected delivery area.');
            }
            if ($return) abort_unless($return->status === 'at_hub', 409, 'Return parcel is not at a hub.');
            abort_if(HubTransfer::whereIn('status', ['assigned', 'in_transit'])->where(fn ($q) => $delivery
                ? $q->where('delivery_id', $delivery->id)
                : $q->where('return_shipment_id', $return->id))->exists(), 409, 'This parcel already has an active hub transfer.');
            abort_unless($eligibility->find($courier->id), 422, 'Courier eligibility changed.');
            if ($delivery) $delivery->update(['delivery_area_id' => $area->id]);
            return HubTransfer::create([
                'delivery_id' => $delivery?->id, 'return_shipment_id' => $return?->id,
                'from_hub_id' => $currentHubId, 'to_hub_id' => $v['to_hub_id'],
                'courier_profile_id' => $courier->id, 'assigned_by' => $request->user()->id,
                'status' => 'assigned', 'note' => $v['note'] ?? null,
            ]);
        });
        return response()->json(['success' => true, 'data' => $transfer->load(['fromHub','toHub','courier.user'])], 201);
    }

    public function courierReturns(Request $request, CourierEligibility $eligibility)
    {
        $profile = $eligibility->find($request->user()->courierProfile?->id);
        abort_unless($profile, 403);
        $rows = ReturnShipment::with(['order.items.product:id,name', 'buyer:id,first_name,last_name', 'seller:id,first_name,last_name', 'buyer.addresses', 'seller.addresses', 'currentHub:id,name,code'])
            ->where(fn ($q) => $q->where('pickup_courier_profile_id', $profile->id)->whereIn('status', ['pickup_assigned','picked_up'])
                ->orWhere(fn ($d) => $d->where('delivery_courier_profile_id', $profile->id)->where('status', 'out_for_delivery')))
            ->latest()->get();
        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function updateReturn(Request $request, int $id, CourierEligibility $eligibility)
    {
        $v = $request->validate(['status' => ['required','in:picked_up,delivered'], 'handover_name' => ['required','string','min:2','max:150'], 'photo' => ['required','image','mimes:jpg,jpeg,png,webp','max:5120']]);
        $profile = $eligibility->find($request->user()->courierProfile?->id);
        abort_unless($profile, 403);
        $shipment = DB::transaction(function () use ($request, $id, $v, $profile) {
            $shipment = ReturnShipment::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($v['status'] === 'picked_up') {
                abort_unless((int) $shipment->pickup_courier_profile_id === (int) $profile->id && $shipment->status === 'pickup_assigned', 409, 'This return is not assigned for pickup to you.');
                $photo = $request->file('photo')->store("return-proofs/{$shipment->id}", 'local');
                $shipment->update(['status' => 'picked_up', 'buyer_handover_name' => trim($v['handover_name']), 'pickup_photo_path' => $photo, 'picked_up_at' => now()]);
            } else {
                abort_unless((int) $shipment->delivery_courier_profile_id === (int) $profile->id && $shipment->status === 'out_for_delivery', 409, 'This return is not assigned for delivery to you.');
                $photo = $request->file('photo')->store("return-proofs/{$shipment->id}", 'local');
                $shipment->update(['status' => 'delivered', 'seller_received_name' => trim($v['handover_name']), 'delivery_photo_path' => $photo, 'received_at' => now()]);
            }
            return $shipment->fresh();
        });
        return response()->json(['success' => true, 'data' => $shipment]);
    }

    public function courierTransfers(Request $request, CourierEligibility $eligibility)
    {
        $profile = $eligibility->find($request->user()->courierProfile?->id);
        abort_unless($profile, 403);
        return response()->json(['success' => true, 'data' => HubTransfer::with(['fromHub','toHub','delivery.order','returnShipment.order'])
            ->where('courier_profile_id', $profile->id)->whereIn('status', ['assigned','in_transit'])->latest()->get()]);
    }

    public function updateTransfer(Request $request, int $id, CourierEligibility $eligibility)
    {
        $v = $request->validate(['status' => ['required','in:in_transit']]);
        $profile = $eligibility->find($request->user()->courierProfile?->id);
        abort_unless($profile, 403);
        $transfer = $this->markTransferInTransit($request, $id, (int) $profile->id);
        return response()->json(['success' => true, 'data' => $transfer]);
    }

    public function confirmTransferCollection(Request $request, int $id, CourierEligibility $eligibility, \App\Services\HubTransferHandoffService $handoff)
    {
        $values = $request->validate([
            'parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
            'hub_id' => ['prohibited'],
            'from_hub_id' => ['prohibited'],
            'to_hub_id' => ['prohibited'],
            'courier_profile_id' => ['prohibited'],
        ]);
        $profile = $eligibility->find($request->user()->courierProfile?->id ?? 0);
        abort_unless($profile && (int) $profile->user_id === (int) $request->user()->id, 403, 'Active eligible Rider profile required.');

        $transfer = $handoff->confirmRiderCollection($id, $values['parcel_code'], $request->user(), (int) $profile->id);

        return response()->json([
            'success' => true,
            'message' => 'Rider collection recorded and transfer departed after both handoff confirmations.',
            'data' => [
                'id' => $transfer->id,
                'status' => $transfer->status,
                'rider_collected_at' => $transfer->rider_collected_at,
                'departed_at' => $transfer->departed_at,
                'origin_hub' => $transfer->fromHub?->only(['id', 'name', 'code']),
                'destination_hub' => $transfer->toHub?->only(['id', 'name', 'code']),
            ],
        ]);
    }

    public function dispatchTransfer(Request $request, int $id)
    {
        $transfer = $this->markTransferInTransit($request, $id);
        return response()->json(['success' => true, 'message' => 'Transfer departure recorded.', 'data' => $transfer]);
    }

    private function markTransferInTransit(Request $request, int $id, ?int $courierProfileId = null): HubTransfer
    {
        return app(\App\Services\HubTransferHandoffService::class)
            ->dispatch($id, $request->user(), $courierProfileId);
    }

    public function receiveTransfer(Request $request, int $id)
    {
        $v = $request->validate([
            'hub_id' => ['required', 'integer', 'exists:logistics_hubs,id'],
            'parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
        ]);
        $transferSnapshot = HubTransfer::query()->whereKey($id)->firstOrFail();
        if ($transferSnapshot->delivery_id !== null && $transferSnapshot->return_shipment_id === null) {
            $transfer = app(\App\Services\HubTransferReceivingService::class)
                ->receiveDelivery($request->user(), $id, $v['parcel_code'], (int) $v['hub_id']);
            return response()->json(['success' => true, 'message' => 'Transfer parcel received at the destination hub.', 'data' => $transfer]);
        }

        $transfer = DB::transaction(function () use ($request, $id, $v) {
            $transfer = HubTransfer::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($transfer->status === 'in_transit', 409, 'Only an in-transit transfer can be received.');
            abort_unless((int) $transfer->to_hub_id === (int) $v['hub_id'], 422, 'Select the assigned destination hub for this transfer.');
            $hub = LogisticsHub::whereKey($v['hub_id'])->lockForUpdate()->firstOrFail();
            $hasDelivery = $transfer->delivery_id !== null;
            $hasReturn = $transfer->return_shipment_id !== null;
            abort_unless($hasDelivery xor $hasReturn, 409, 'Transfer must reference exactly one parcel.');

            if ($hasDelivery) {
                $delivery = Delivery::where('parcel_code', $v['parcel_code'])->lockForUpdate()->firstOrFail();
                abort_unless((int) $delivery->id === (int) $transfer->delivery_id, 422, 'The scanned parcel does not match this transfer.');
                abort_unless((int) $delivery->current_hub_id === (int) $transfer->from_hub_id, 409, 'Parcel custody no longer matches the transfer origin.');
                $order = $delivery->order()->lockForUpdate()->firstOrFail();
                abort_unless($order->status === $delivery->status && in_array($delivery->status, [Delivery::AT_SORTING_CENTER, Delivery::SORTED], true), 409, 'Parcel is not in a transferable hub state.');
                $transfer->update(['status' => 'arrived', 'arrived_at' => now()]);
                $delivery->update(['current_hub_id' => $hub->id]);
                \App\Support\OrderDeliveryProjection::event($delivery, [
                    'actor_id' => $request->user()->id, 'hub_id' => $hub->id, 'event_type' => 'hub_transfer_arrived',
                    'previous_status' => $delivery->status, 'new_status' => $delivery->status,
                    'reason' => "QR received at hub {$hub->code} (#{$hub->id}); transfer #{$transfer->id}.",
                ]);
            } else {
                $return = ReturnShipment::whereKey($transfer->return_shipment_id)->lockForUpdate()->firstOrFail();
                $delivery = Delivery::where('parcel_code', $v['parcel_code'])->lockForUpdate()->firstOrFail();
                abort_unless((int) $delivery->order_id === (int) $return->order_id, 422, 'The scanned parcel does not match this transfer.');
                abort_unless((int) $return->current_hub_id === (int) $transfer->from_hub_id && $return->status === 'in_transit_to_hub', 409, 'Return parcel custody no longer matches the transfer origin.');
                $transfer->update(['status' => 'arrived', 'arrived_at' => now()]);
                $return->update(['current_hub_id' => $hub->id, 'status' => 'at_hub']);
            }
            return $transfer->fresh(['fromHub', 'toHub', 'delivery', 'returnShipment']);
        });
        return response()->json(['success' => true, 'message' => 'Transfer parcel received at the destination hub.', 'data' => $transfer]);
    }

    public function sellerReceiveReturn(Request $request, int $id)
    {
        $shipment = DB::transaction(function () use ($request, $id) {
            $shipment = ReturnShipment::where('seller_id', $request->user()->id)->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($shipment->status === 'delivered', 409, 'The return parcel must be delivered before receipt can be confirmed.');
            $shipment->update(['status' => 'seller_received']);
            return $shipment->fresh();
        });
        return response()->json(['success' => true, 'data' => $shipment]);
    }

    public function sellerReturns(Request $request)
    {
        $rows = ReturnShipment::with([
            'refundRequest:id,status,requested_amount,approved_amount',
            'delivery:id,order_id,parcel_code',
            'order:id,status,total_amount,created_at',
            'order.items' => fn ($query) => $query->where('seller_id', $request->user()->id)->with('product:id,name,image'),
            'buyer:id,first_name,middle_name,last_name',
            'currentHub:id,name,code',
        ])
            ->where('seller_id', $request->user()->id)->latest()->get();
        return response()->json(['success' => true, 'data' => $rows]);
    }
}
