<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Order;
use Illuminate\Http\Request;

class BuyerSupportController extends Controller
{
    public function reportDeliveryIssue(Request $request, int $orderId)
    {
        abort_unless($request->user()->role === 'buyer', 403, 'Only buyers can report delivery issues.');

        $validated = $request->validate([
            'issue_type' => ['required', 'in:late_delivery,failed_delivery,wrong_delivery,other'],
            'description' => ['required', 'string', 'min:10', 'max:2000', 'not_regex:/^\\s*$/u'],
        ]);

        $order = Order::query()
            ->where('buyer_id', $request->user()->id)
            ->findOrFail($orderId);

        abort_if(
            in_array(strtoupper((string) $order->status), ['CANCELLED', 'CANCELED'], true),
            422,
            'A cancelled order cannot receive a delivery issue report.'
        );

        $issueLabel = str($validated['issue_type'])->replace('_', ' ')->title()->toString();
        $complaint = Complaint::create([
            'complainant_id' => $request->user()->id,
            'respondent_id' => null,
            'order_id' => $order->id,
            'category' => 'delivery_issue',
            'subject' => "{$issueLabel} · Order #{$order->id}",
            'description' => "Issue type: {$issueLabel}\n\n{$validated['description']}",
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Your delivery issue was sent to Customer Service.',
            'data' => ['id' => $complaint->id, 'status' => $complaint->status],
        ], 201);
    }
}
