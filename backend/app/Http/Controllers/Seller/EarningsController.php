<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\RefundRequest;
use Illuminate\Http\Request;

class EarningsController extends Controller
{
    public function index(Request $request)
    {
        $rows = Commission::with(['order:id,status,total_amount,payment_method,created_at', 'order.codCollection', 'order.refundRequests:id,order_id,status,approved_amount'])
            ->where('seller_id', $request->user()->id)->latest()->paginate(30);
        $rows->getCollection()->transform(function (Commission $row) {
            $refunded = (float) $row->order->refundRequests->where('status', 'refunded')->sum('approved_amount');
            $row->setAttribute('refunded_amount', $refunded);
            $row->setAttribute('payout_due', round((float) $row->seller_earnings * max(0, 1 - $refunded / max((float) $row->order_amount, 0.01)), 2));
            return $row;
        });
        return response()->json(['success' => true, 'data' => $rows]);
    }
}
