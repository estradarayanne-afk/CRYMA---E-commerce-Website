<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\ParcelReceivingService;

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
}
