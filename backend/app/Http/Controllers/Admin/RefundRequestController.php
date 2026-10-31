<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\RefundRequest;
use App\Models\Commission;
use App\Models\CodCollection;
use App\Models\ReturnShipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RefundRequestController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:all,pending,under_review,approved,rejected,refunded'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = RefundRequest::with([
            'buyer:id,first_name,last_name,email',
            'order:id,status,total_amount,payment_method,created_at',
            'order.items.product:id,name',
            'returnShipment.currentHub:id,name,code',
        ])->latest();

        if (($validated['status'] ?? 'all') !== 'all') {
            $query->where('status', $validated['status']);
        }

        return response()->json(['success' => true, 'data' => $query->paginate(20)]);
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:under_review,approved,rejected,refunded'],
            'review_note' => ['required', 'string', 'min:3', 'max:1500', 'not_regex:/^\\s*$/u'],
            'approved_amount' => ['required_if:status,approved', 'nullable', 'numeric', 'decimal:0,2', 'gt:0'],
            'return_required' => ['sometimes', 'boolean'],
            'refund_method' => ['required_if:status,refunded', 'nullable', 'in:cash,bank_transfer,other'],
            'refund_reference' => ['nullable', 'string', 'max:120'],
        ]);

        $refundRequest = DB::transaction(function () use ($request, $id, $validated) {
            $refundRequest = RefundRequest::with('order')
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();
            $current = $refundRequest->status;
            $target = $validated['status'];
            $allowed = match ($target) {
                'under_review' => $current === 'pending',
                'approved', 'rejected' => in_array($current, ['pending', 'under_review'], true),
                'refunded' => $current === 'approved',
                default => false,
            };
            abort_unless($allowed, 409, "A refund request cannot move from {$current} to {$target}.");
            if ($target === 'refunded' && $refundRequest->return_required) {
                $returnShipment = ReturnShipment::where('refund_request_id', $refundRequest->id)->lockForUpdate()->first();
                abort_unless($returnShipment?->status === 'seller_received', 409, 'Confirm the returned parcel was received by the seller before recording the refund repayment.');
            }

            if ($target === 'approved') {
                abort_if((float) $validated['approved_amount'] > (float) $refundRequest->requested_amount, 422, 'The approved amount cannot exceed the requested amount.');
                $refundRequest->approved_amount = $validated['approved_amount'];
                $refundRequest->return_required = (bool) ($validated['return_required'] ?? false);
            }

            $refundRequest->status = $target;
            $refundRequest->review_note = trim($validated['review_note']);
            $refundRequest->reviewed_by = $request->user()->id;
            if ($target === 'refunded') {
                $refundRequest->refund_method = $validated['refund_method'];
                $refundRequest->refund_reference = filled($validated['refund_reference'] ?? null)
                    ? trim($validated['refund_reference'])
                    : null;
                $refundRequest->refunded_at = now();
            }
            $refundRequest->save();
            if ($target === 'approved' && $refundRequest->return_required) {
                $sellerId = $refundRequest->order->items()->value('seller_id');
                abort_unless($sellerId, 409, 'The seller for this order could not be determined.');
                ReturnShipment::firstOrCreate(['refund_request_id' => $refundRequest->id], [
                    'order_id' => $refundRequest->order_id,
                    'buyer_id' => $refundRequest->buyer_id,
                    'seller_id' => $sellerId,
                    'status' => 'awaiting_pickup',
                ]);
            }

            if ($target === 'refunded') {
                $commission = Commission::where('order_id', $refundRequest->order_id)->lockForUpdate()->first();
                if ($commission?->status === 'paid') {
                    $refundRequest->review_note .= ' Seller payout was already completed; record the refund as a CRYMA-funded repayment and reconcile seller recovery separately.';
                    $refundRequest->save();
                }
            }
            $hasOpenRefund = RefundRequest::where('order_id', $refundRequest->order_id)->whereIn('status', ['pending', 'under_review', 'approved'])->exists();
            $cod = CodCollection::where('order_id', $refundRequest->order_id)->first();
            if (!$hasOpenRefund && $cod?->status === 'remitted' && strtoupper((string) $refundRequest->order?->status) === 'COMPLETED') {
                Commission::where('order_id', $refundRequest->order_id)->where('status', 'pending')->update(['status' => 'available']);
            }

            if ($refundRequest->conversation_id) {
                $conversation = Conversation::whereKey($refundRequest->conversation_id)->lockForUpdate()->first();
                if ($conversation && $conversation->admin_id !== $request->user()->id) {
                    $conversation->admin_id = $request->user()->id;
                    $conversation->save();
                }
                Message::create([
                    'conversation_id' => $refundRequest->conversation_id,
                    'sender_id' => $request->user()->id,
                    'sender_type' => 'user',
                    'order_id' => $refundRequest->order_id,
                    'message' => "Refund request #{$refundRequest->id} status: ".str_replace('_', ' ', ucfirst($target)).". {$refundRequest->review_note}",
                    'is_read' => false,
                ]);
                $conversation?->touch();
            }

            return $refundRequest->fresh()->load([
                'buyer:id,first_name,last_name,email',
                'order:id,status,total_amount,payment_method,created_at',
                'order.items.product:id,name',
                'returnShipment.pickupCourier.user:id,first_name,last_name',
                'returnShipment.deliveryCourier.user:id,first_name,last_name',
                'returnShipment.currentHub:id,name,code',
            ]);
        });

        return response()->json(['success' => true, 'data' => $refundRequest]);
    }
}
