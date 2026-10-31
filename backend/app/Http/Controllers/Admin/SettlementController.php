<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CodCollection;
use App\Models\Commission;
use App\Models\RefundRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettlementController extends Controller
{
    public function codCollections()
    {
        $rows = CodCollection::with(['order:id,buyer_id,status,total_amount', 'order.buyer:id,first_name,last_name', 'courierProfile.user:id,first_name,last_name'])
            ->latest()->paginate(25);
        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function remit(Request $request, int $id)
    {
        $values = $request->validate([
            'reference' => ['required', 'string', 'min:2', 'max:120'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
        $row = DB::transaction(function () use ($request, $id, $values) {
            $cod = CodCollection::with('order')->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($cod->status === 'collected', 409, 'Only cash confirmed as collected can be reconciled.');
            abort_unless((int) round((float) $cod->collected_amount * 100) === (int) round((float) $cod->expected_amount * 100), 409, 'Collected cash does not match the order total. Resolve the discrepancy before remitting.');
            $cod->update(['status' => 'remitted', 'remitted_by' => $request->user()->id, 'remitted_at' => now(), 'remittance_reference' => trim($values['reference']), 'remittance_note' => filled($values['note'] ?? null) ? trim($values['note']) : null]);
            $openRefund = RefundRequest::where('order_id', $cod->order_id)->whereIn('status', ['pending', 'under_review', 'approved'])->exists();
            $commission = Commission::where('order_id', $cod->order_id)->lockForUpdate()->first();
            if (!$commission) {
                $sellerId = $cod->order->items()->value('seller_id');
                if ($sellerId) {
                    $amount = (float) $cod->order->total_amount;
                    $commissionAmount = round($amount * 0.10, 2);
                    $commission = Commission::create([
                        'order_id' => $cod->order_id, 'seller_id' => $sellerId,
                        'order_amount' => $amount, 'commission_rate' => 10.00,
                        'commission_amount' => $commissionAmount,
                        'seller_earnings' => round($amount - $commissionAmount, 2), 'status' => 'pending',
                    ]);
                }
            }
            if (strtoupper((string) $cod->order->status) === 'COMPLETED' && !$openRefund) {
                Commission::where('order_id', $cod->order_id)->where('status', 'pending')->update(['status' => 'available']);
            }
            return $cod->fresh(['order']);
        });
        return response()->json(['success' => true, 'data' => $row]);
    }

    public function payouts()
    {
        $rows = Commission::with(['seller:id,first_name,last_name,email', 'order:id,status,total_amount,payment_method', 'order.codCollection', 'order.refundRequests:id,order_id,status,approved_amount'])
            ->latest()->paginate(25);
        $rows->getCollection()->transform(function (Commission $row) {
            $refunded = (float) $row->order->refundRequests->where('status', 'refunded')->sum('approved_amount');
            $row->setAttribute('refunded_amount', $refunded);
            $row->setAttribute('payout_due', round((float) $row->seller_earnings * max(0, 1 - $refunded / max((float) $row->order_amount, 0.01)), 2));
            return $row;
        });
        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function pay(Request $request, int $id)
    {
        $values = $request->validate([
            'method' => ['required', 'in:bank_transfer,cash,other'],
            'reference' => ['required', 'string', 'min:2', 'max:120'],
        ]);
        $commission = DB::transaction(function () use ($request, $id, $values) {
            $commission = Commission::with('order')->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($commission->status === 'available', 409, 'This seller balance is not available for payout.');
            abort_unless(strtoupper((string) $commission->order->status) === 'COMPLETED', 409, 'The buyer must confirm receipt before payout.');
            if ($commission->order->payment_method === 'cash_on_delivery') {
                $cod = CodCollection::where('order_id', $commission->order_id)->lockForUpdate()->first();
                abort_unless($cod?->status === 'remitted', 409, 'Reconcile courier COD cash before payout.');
            }
            $hasOpenRefund = RefundRequest::where('order_id', $commission->order_id)->whereIn('status', ['pending', 'under_review', 'approved'])->exists();
            abort_if($hasOpenRefund, 409, 'Resolve open refund requests before payout.');
            $refunded = (float) RefundRequest::where('order_id', $commission->order_id)->where('status', 'refunded')->sum('approved_amount');
            abort_if($refunded >= (float) $commission->order_amount, 409, 'The order is fully refunded and has no seller payout balance.');
            $amount = round((float) $commission->seller_earnings * max(0, 1 - $refunded / max((float) $commission->order_amount, 0.01)), 2);
            abort_if($amount <= 0, 409, 'No seller payout balance remains after refunds.');
            $commission->update(['status' => 'paid', 'payout_method' => $values['method'], 'payout_reference' => trim($values['reference']), 'paid_by' => $request->user()->id, 'paid_at' => now(), 'payout_amount' => $amount]);
            return $commission->fresh(['seller', 'order']);
        });
        return response()->json(['success' => true, 'data' => $commission]);
    }
}
