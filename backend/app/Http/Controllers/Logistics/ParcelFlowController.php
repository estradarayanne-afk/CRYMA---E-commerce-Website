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

class ParcelFlowController extends Controller
{
    public function hubs() { return response()->json(['success' => true, 'data' => LogisticsHub::where('is_active', true)->orderBy('name')->get()]); }

    public function operations(CourierEligibility $eligibility)
    {
        return response()->json(['success' => true, 'data' => [
            'hubs' => LogisticsHub::where('is_active', true)->orderBy('name')->get(),
            'areas' => DeliveryArea::with('hub:id,name,code')->orderBy('name')->get(),
            'transfers' => HubTransfer::with(['fromHub:id,name,code','toHub:id,name,code','courier.user:id,first_name,last_name','delivery.order:id,status','returnShipment.order:id,status'])->latest()->limit(100)->get(),
            'returns' => ReturnShipment::with(['refundRequest:id,status,requested_amount,approved_amount','order.items.product:id,name','buyer:id,first_name,last_name','seller:id,first_name,last_name','pickupCourier.user:id,first_name,last_name','deliveryCourier.user:id,first_name,last_name','currentHub:id,name,code'])->latest()->limit(100)->get(),
            'deliveries' => Delivery::with(['order:id,status,delivery_address','currentHub:id,name,code','deliveryArea:id,name,hub_id', 'events'])->whereIn('status', [Delivery::AT_SORTING_CENTER, Delivery::SORTED])->whereNotNull('current_hub_id')->latest()->limit(100)->get(),
            'couriers' => $eligibility->profiles()->with(['user:id,first_name,last_name'])->orderBy('id')->get(),
        ]]);
    }

    public function createHub(Request $request)
    {
        if (is_string($request->input('code'))) $request->merge(['code' => strtoupper(trim($request->input('code')))]);
        $v = $request->validate(['name' => ['required','string','max:100'], 'code' => ['required','string','max:24','alpha_dash','unique:logistics_hubs,code'], 'address' => ['nullable','string','max:1000']]);
        $hub = LogisticsHub::create([...$v, 'code' => strtoupper($v['code'])]);
        return response()->json(['success' => true, 'data' => $hub], 201);
    }

    public function mapArea(Request $request, int $id)
    {
        $v = $request->validate(['hub_id' => ['required','integer','exists:logistics_hubs,id']]);
        abort_unless(LogisticsHub::whereKey($v['hub_id'])->where('is_active', true)->exists(), 422, 'Select an active hub.');
        $area = DeliveryArea::findOrFail($id);
        $area->update(['hub_id' => $v['hub_id']]);
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
            $shipment = ReturnShipment::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($shipment->status === 'picked_up', 409, 'Only a collected return parcel can be received at a hub.');
            $shipment->update(['status' => 'at_hub', 'current_hub_id' => $v['hub_id'], 'note' => $v['note'] ?? null]);
            return $shipment->fresh();
        });
        return response()->json(['success' => true, 'data' => $shipment]);
    }

    public function createTransfer(Request $request, CourierEligibility $eligibility)
    {
        $v = $request->validate([
            'shipment_type' => ['required','in:delivery,return'], 'shipment_id' => ['required','integer'],
            'to_hub_id' => ['required','integer','exists:logistics_hubs,id'], 'courier_profile_id' => ['required','integer','exists:courier_profiles,id'], 'note' => ['nullable','string','max:1000'],
        ]);
        $courier = $eligibility->find((int) $v['courier_profile_id']);
        abort_unless($courier, 422, 'Select an eligible courier.');
        $transfer = DB::transaction(function () use ($request, $v, $courier, $eligibility) {
            $delivery = $v['shipment_type'] === 'delivery' ? Delivery::whereKey($v['shipment_id'])->lockForUpdate()->first() : null;
            $return = $v['shipment_type'] === 'return' ? ReturnShipment::whereKey($v['shipment_id'])->lockForUpdate()->first() : null;
            $currentHubId = $delivery?->current_hub_id ?? $return?->current_hub_id;
            abort_unless(($delivery || $return) && $currentHubId, 404, 'Parcel is not currently recorded at a hub.');
            abort_unless((int) $currentHubId !== (int) $v['to_hub_id'], 422, 'Choose a different destination hub.');
            if ($delivery) abort_unless(in_array($delivery->status, [Delivery::AT_SORTING_CENTER, Delivery::SORTED], true), 409, 'Forward parcel is not ready for a hub transfer.');
            if ($return) abort_unless($return->status === 'at_hub', 409, 'Return parcel is not at a hub.');
            abort_if(HubTransfer::whereIn('status', ['assigned', 'in_transit'])->where(fn ($q) => $delivery
                ? $q->where('delivery_id', $delivery->id)
                : $q->where('return_shipment_id', $return->id))->exists(), 409, 'This parcel already has an active hub transfer.');
            abort_unless($eligibility->find($courier->id), 422, 'Courier eligibility changed.');
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
        $v = $request->validate(['status' => ['required','in:in_transit,arrived']]);
        $profile = $eligibility->find($request->user()->courierProfile?->id);
        abort_unless($profile, 403);
        $transfer = DB::transaction(function () use ($request, $id, $v, $profile) {
            $transfer = HubTransfer::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless((int) $transfer->courier_profile_id === (int) $profile->id, 403);
            if ($v['status'] === 'in_transit') {
                abort_unless($transfer->status === 'assigned', 409, 'Transfer is no longer waiting for departure.');
                $transfer->update(['status' => 'in_transit', 'departed_at' => now()]);
                if ($transfer->return_shipment_id) ReturnShipment::whereKey($transfer->return_shipment_id)->update(['status' => 'in_transit_to_hub']);
                if ($transfer->delivery_id) {
                    $delivery = Delivery::whereKey($transfer->delivery_id)->firstOrFail();
                    \App\Support\OrderDeliveryProjection::event($delivery, ['actor_id' => $request->user()->id, 'event_type' => 'hub_transfer_departed', 'previous_status' => $delivery->status, 'new_status' => $delivery->status, 'reason' => "Departed {$transfer->fromHub()->value('name')} for hub #{$transfer->to_hub_id}."]);
                }
            } else {
                abort_unless($transfer->status === 'in_transit', 409, 'Depart the hub before recording arrival.');
                $transfer->update(['status' => 'arrived', 'arrived_at' => now()]);
                if ($transfer->delivery_id) {
                    $delivery = Delivery::whereKey($transfer->delivery_id)->firstOrFail();
                    $delivery->update(['current_hub_id' => $transfer->to_hub_id]);
                    \App\Support\OrderDeliveryProjection::event($delivery, ['actor_id' => $request->user()->id, 'event_type' => 'hub_transfer_arrived', 'previous_status' => $delivery->status, 'new_status' => $delivery->status, 'reason' => "Received at hub #{$transfer->to_hub_id}."]);
                }
                if ($transfer->return_shipment_id) ReturnShipment::whereKey($transfer->return_shipment_id)->update(['current_hub_id' => $transfer->to_hub_id, 'status' => 'at_hub']);
            }
            return $transfer->fresh(['fromHub','toHub']);
        });
        return response()->json(['success' => true, 'data' => $transfer]);
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
            'order:id,status,total_amount,created_at',
            'order.items' => fn ($query) => $query->where('seller_id', $request->user()->id)->with('product:id,name,image'),
            'buyer:id,first_name,middle_name,last_name',
            'currentHub:id,name,code',
        ])
            ->where('seller_id', $request->user()->id)->latest()->get();
        return response()->json(['success' => true, 'data' => $rows]);
    }
}
