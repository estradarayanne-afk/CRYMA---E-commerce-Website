<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use Illuminate\Http\Request;
use App\Services\ParcelReceivingService;
use App\Services\HubStaffHubResolver;
use Illuminate\Support\Facades\DB;

class ParcelOperationsController extends Controller
{
    public function confirmSortingReceipt(Request $request, int $orderId, ParcelReceivingService $receiving)
    {
        $values = $request->validate([
            'expected_status' => ['required', 'in:PICKED_UP'],
            'hub_id' => ['required', 'integer', 'exists:logistics_hubs,id'],
            'parcel_code' => ['required', 'string', 'regex:/^CRYMA-PCL-[A-Z0-9]{20}$/'],
        ]);

        $assignment = $receiving->receivePickup($orderId, $values['parcel_code'], $request->user(), (int) $values['hub_id']);

        return response()->json([
            'success' => true,
            'message' => 'Sorting-center receipt confirmed.',
            'data' => $assignment,
        ]);
    }

    public function directDeliveryNotice(Request $request, int $parcelId, HubStaffHubResolver $hubResolver)
    {
        $validated = $request->validate([
            'rider_id' => ['required', 'integer', 'exists:users,id,role,rider', 'exists:users,id,status,active'],
        ]);

        // Verify hub authorization
        $hub = $hubResolver->resolve($request->user());

        $delivery = Delivery::findOrFail($parcelId);

        // Verify this is a same-municipality delivery that can be directly delivered
        $order = $delivery->order;
        abort_unless($order, 404, 'Order not found.');
        
        // Verify delivery belongs to this hub
        abort_unless($delivery->current_hub_id === $hub->id, 403, 'This delivery is not assigned to your hub.');
        
        // Verify delivery area exists and is in the same municipality as the hub
        abort_unless($delivery->deliveryArea, 422, 'Delivery area not assigned. Cannot verify municipality match.');
        
        // Get the delivery area's hub and verify it matches the current hub
        // This ensures the delivery is in the same municipality
        $deliveryAreaHub = $delivery->deliveryArea->hub;
        abort_unless($deliveryAreaHub && $deliveryAreaHub->id === $hub->id, 422, 'Delivery is not in the same municipality. It must be processed through the sorting center.');
        
        // Update delivery type to direct
        $delivery->update(['delivery_type' => 'direct']);

        // Log this for hub staff visibility - create a delivery event
        \App\Support\OrderDeliveryProjection::event($delivery, [
            'actor_id' => $request->user()->id,
            'event_type' => 'direct_delivery_chosen',
            'previous_status' => $delivery->status,
            'new_status' => $delivery->status,
            'courier_profile_id' => $delivery->courier_profile_id,
        ]);

        // Send notification to sorting center via database notification (hub staff can see it in dashboard)
        $notificationData = [
            'delivery_id' => $delivery->id,
            'parcel_code' => $delivery->parcel_code,
            'rider_id' => $validated['rider_id'],
            'hub_id' => $hub->id,
            'type' => 'direct_delivery_chosen',
            'message' => "Direct delivery chosen for parcel {$delivery->parcel_code} by rider {$validated['rider_id']} instead of processing through sorting center. Commission tracking required.",
        ];
        
        // Store notification in direct_delivery_notices table for sorting center audit
        $noticeId = DB::table('direct_delivery_notices')->insertGetId([
            'delivery_id' => $delivery->id,
            'rider_id' => $validated['rider_id'],
            'recorded_by' => $request->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'notice_id' => $noticeId,
            'message' => 'Direct delivery notice recorded. Sorting center has been notified.',
        ]);
    }
}
