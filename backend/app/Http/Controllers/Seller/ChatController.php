<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReturnShipment;
use App\Support\ConversationMessageSender;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function assistant(Request $request)
    {
        $values = $request->validate([
            'message' => ['required', 'string', 'max:500', 'not_regex:/^\s*$/u'],
            'conversation_id' => ['nullable', 'integer'],
        ]);
        $seller = $request->user();
        $conversation = null;
        if (!empty($values['conversation_id'])) {
            $conversation = Conversation::where('seller_id', $seller->id)->findOrFail($values['conversation_id']);
        }

        $question = mb_strtolower($values['message']);
        $product = $conversation?->product_id
            ? Product::where('seller_id', $seller->id)->find($conversation->product_id)
            : null;
        $productContext = $product ? [
            'id' => $product->id,
            'name' => $product->name,
            'price' => (float) ($product->discounted_price ?? $product->price),
            'stock' => (int) $product->stock,
            'category' => $product->category,
            'status' => $product->status,
        ] : null;

        $explicitOrderId = preg_match('/(?:\border\s*(?:#|no\.?\s*)?|#)(\d{1,10})\b/i', $values['message'], $match)
            ? (int) $match[1]
            : null;
        $orderQuery = Order::query()
            ->where('buyer_id', $conversation?->buyer_id)
            ->whereHas('items', fn ($query) => $query->where('seller_id', $seller->id))
            ->with('delivery.pickupAssignment')
            ->with(['items' => fn ($query) => $query->where('seller_id', $seller->id)->with('product:id,name')]);
        if ($explicitOrderId) {
            $orderQuery->whereKey($explicitOrderId);
        } elseif ($product) {
            $orderQuery->whereHas('items', fn ($query) => $query->where('seller_id', $seller->id)->where('product_id', $product->id));
        }
        $order = $conversation ? $orderQuery->latest()->first() : null;
        $return = $order ? ReturnShipment::where('seller_id', $seller->id)->where('buyer_id', $conversation->buyer_id)->where('order_id', $order->id)->latest()->first() : null;

        $needsProductFacts = preg_match('/\b(price|cost|stock|available|availability|product|item|quantity)\b/i', $question);
        $needsOrderFacts = preg_match('/\b(order|tracking|shipment|delivery|deliver|pickup|return|refund|status)\b/i', $question);
        $asksHowTo = preg_match('/\b(how\s+(?:do|can|to)|steps|process|schedule|manage|create)\b/i', $question);

        if ($needsOrderFacts && $order && !$asksHowTo) {
            $itemNames = $order->items->map(fn ($item) => ($item->product?->name ?: 'Product').' × '.$item->quantity)->implode(', ');
            $reply = 'Live order #'.$order->id.': '.str_replace('_', ' ', strtolower((string) $order->status)).'.';
            if ($itemNames !== '') $reply .= ' Items: '.$itemNames.'.';
            if ($return) {
                $reply .= ' Return status: '.str_replace('_', ' ', strtolower((string) $return->status)).'.';
            } elseif ($order->delivery) {
                $reply .= ' Shipment status: '.str_replace('_', ' ', strtolower((string) $order->delivery->status)).'.';
            }
            if (str_contains($question, 'pickup')) {
                $scheduledAt = $order->delivery?->pickupAssignment?->scheduled_at;
                $reply .= $scheduledAt
                    ? ' Pickup is scheduled for '.$scheduledAt->timezone(config('app.timezone'))->format('M j, Y g:i A').'.'
                    : ' No pickup time has been assigned yet. Logistics sets the date and time when assigning a courier.';
            }
            if (in_array(strtoupper((string) $order->status), ['READY_FOR_PICKUP', 'PICKED_UP', 'AT_SORTING_CENTER', 'SORTED', 'ASSIGNED_TO_RIDER', 'OUT_FOR_DELIVERY'], true)) {
                $reply .= ' Open this conversation’s order details for the latest shipment updates.';
            }
        } elseif ($needsOrderFacts && $conversation && $explicitOrderId && !$asksHowTo) {
            $reply = 'I couldn’t find order #'.$explicitOrderId.' among this buyer’s orders from your store. Check the order number or select the matching buyer conversation.';
        } elseif ($needsProductFacts && $productContext) {
            $availability = $productContext['status'] === 'active' && $productContext['stock'] > 0 ? 'available' : ($productContext['stock'] < 1 ? 'out of stock' : str_replace('_', ' ', $productContext['status']));
            $reply = $productContext['name'].' is currently '.$availability.'. Price: ₱'.number_format($productContext['price'], 2).'. Stock: '.$productContext['stock'].'.';
            if ($productContext['category']) $reply .= ' Category: '.$productContext['category'].'.';
            $reply .= ' This is the latest product record in your inventory.';
        } elseif (preg_match('/\b(pickup|courier|shipping|shipment|delivery)\b/i', $question)) {
            $reply = $order
                ? 'Order #'.$order->id.' is currently '.str_replace('_', ' ', strtolower((string) $order->status)).'. '.(strtoupper((string) $order->status) === 'READY_FOR_PICKUP' ? 'Open Logistics and schedule pickup from your default saved seller address. Logistics assigns the courier and sets the date and time.' : 'Finish preparing the parcel and mark the order Ready for Pickup first. Then open Logistics to request pickup.')
                : 'For a ready order, open Logistics and choose Schedule pickup. The request uses your default saved seller address. Logistics assigns a courier and sets the pickup date and time.';
        } elseif (preg_match('/\b(return|refund|repay)\b/i', $question)) {
            $reply = $order && $return
                ? 'Order #'.$order->id.' has a return in “'.str_replace('_', ' ', strtolower((string) $return->status)).'” status. Customer Service approves the refund first; track the parcel in Returns and confirm receipt only after it reaches your store.'
                : 'Customer Service reviews and approves refund requests. If a return is required, follow it in Returns. Confirm the parcel only after it physically reaches your store; Customer Service can then complete the approved repayment.';
        } elseif (preg_match('/\b(order|prepare|status|confirm)\b/i', $question)) {
            $reply = $order
                ? 'The latest order from this buyer that contains your product is #'.$order->id.' and its current status is '.str_replace('_', ' ', strtolower((string) $order->status)).'. Ask about a specific order number for its shipment or return details.'
                : 'Open Orders and select the order to review its details. Move it through Confirm Order, Start Preparing, and Mark Ready for Pickup. Mark it ready only after the parcel is packed.';
        } elseif (preg_match('/\b(stock|inventory|product|price)\b/i', $question)) {
            $reply = 'Open Manage Inventory to add or update products, prices, discounts, vouchers, and stock levels. Select a buyer conversation about a product and ask about its price or stock for the latest product record.';
        } elseif (preg_match('/\b(voucher|coupon|discount)\b/i', $question)) {
            $reply = 'Create and manage seller promotions in Vouchers. Set the eligible product, discount, claim limit, and active dates, then verify the voucher is active before sharing it with a buyer.';
        } elseif (preg_match('/\b(earning|payout|settlement|sales|report)\b/i', $question)) {
            $reply = 'Open Earnings & Reports to review your sales and earnings. Check the selected date range and payout status there.';
        } else {
            $reply = 'I can help with live product price and stock in this buyer conversation, or live order and return status for this buyer’s orders from your store. You can also ask about pickups, inventory, vouchers, and earnings.';
        }

        return response()->json(['success' => true, 'data' => ['reply' => $reply, 'product' => $productContext, 'order' => $order ? ['id' => $order->id, 'status' => $order->status, 'created_at' => $order->created_at] : null]]);
    }

    public function conversations(Request $request)
    {
        $seller = $request->user();
        $conversations = Conversation::query()
            ->where('seller_id', $seller->id)
            ->withCount(['messages as unread_messages_count' => function ($query) use ($seller) {
                $query->where('sender_id', '!=', $seller->id)
                    ->where('is_read', false);
            }])
            ->with([
                'buyer:id,first_name,last_name',
                'product:id,name',
                'messages' => fn ($query) => $query->latest()->limit(1),
            ])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['success' => true, 'data' => $conversations]);
    }

    public function showConversation(Request $request, int $id)
    {
        $conversation = Conversation::query()
            ->where('seller_id', $request->user()->id)
            ->with([
                'buyer:id,first_name,last_name',
                'product:id,name',
                'messages' => fn ($query) => $query
                    ->with('sender:id,first_name,last_name,role', 'order:id,status,total_amount,created_at')
                    ->with('product:id,name,price,discounted_price,stock,status,category')
                    ->with('product.media')
                    ->with(['order.items' => fn ($items) => $items->where('seller_id', $request->user()->id)->with('product:id,name')])
                    ->oldest(),
            ])
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $conversation]);
    }

    public function sendMessage(Request $request, int $id, ConversationMessageSender $messageSender)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000', 'not_regex:/^\s*$/u'],
            'client_message_id' => ['sometimes', 'uuid'],
        ]);

        $conversation = Conversation::query()
            ->where('seller_id', $request->user()->id)
            ->findOrFail($id);

        $message = $messageSender->send(
            $conversation,
            $request->user(),
            $validated['message'],
            $validated['client_message_id'] ?? null
        );
        $message->load('sender:id,first_name,last_name,role', 'order:id,status,total_amount,created_at');
        if ($message->order) {
            $message->order->load(['items' => fn ($items) => $items->where('seller_id', $request->user()->id)->with('product:id,name')]);
        }

        return response()->json(['success' => true, 'data' => $message], 201);
    }

    public function markAsRead(Request $request, int $id)
    {
        $conversation = Conversation::query()
            ->where('seller_id', $request->user()->id)
            ->findOrFail($id);

        Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }
}
