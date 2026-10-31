<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Order;
use App\Models\User;
use App\Models\Product;
use App\Support\ConversationMessageSender;
use App\Notifications\SellerActivityNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Storage;

class BuyerChatController extends Controller
{
    private function buyerOnly(Request $request)
    {
        if ($request->user()->role !== 'buyer') {
            abort(response()->json([
                'success' => false,
                'message' => 'Only buyers can access buyer chat.',
            ], 403));
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Conversation List
    |--------------------------------------------------------------------------
    */

    public function conversations(Request $request)
    {
        $this->buyerOnly($request);

        $buyer = $request->user();

        /*
        |--------------------------------------------------------------------------
        | Automatically create a support conversation
        |--------------------------------------------------------------------------
        |
        | This keeps the buyer experience simple:
        |
        | Messages → conversation
        |
        | The buyer does not need to manually create a
        | support ticket first.
        |
        */

        [$supportAvailable] = DB::transaction(function () use ($buyer) {
            // Serialize support-thread creation per buyer. Locking the buyer row
            // also covers the first request, when no conversation row exists yet.
            User::whereKey($buyer->id)->lockForUpdate()->firstOrFail();

            $admin = User::where('role', 'admin')
                ->where('status', 'active')
                ->first();
            $conversation = Conversation::where('buyer_id', $buyer->id)
                ->whereNull('seller_id')
                ->orderBy('id')
                ->first();

            if (!$conversation) {
                Conversation::create([
                    'buyer_id' => $buyer->id,
                    'admin_id' => $admin?->id,
                ]);
            } elseif (
                $conversation
                && !$conversation->admin()
                    ->where('role', 'admin')
                    ->where('status', 'active')
                    ->exists()
                && $admin
            ) {
                $conversation->update(['admin_id' => $admin->id]);
            }

            return [(bool) $admin];
        });

        $conversations = Conversation::where('buyer_id', $buyer->id)
            ->withCount(['messages as unread_messages_count' => function ($query) use ($buyer) {
                $query->where('sender_id', '!=', $buyer->id)
                    ->where('is_read', false);
            }])
            ->with([
                'admin:id,first_name,last_name',
                'seller:id,first_name,last_name',
                'seller.sellerProfile:user_id,business_name,store_slug',
                'product:id,name,price,discounted_price,stock,status,category',
                'messages' => fn ($query) => $query->latest()->limit(1),
            ])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $conversations,
            'support_available' => $supportAvailable,
        ]);
    }

    public function startSellerConversation(Request $request)
    {
        $this->buyerOnly($request);
        $validated = $request->validate([
            'product_id' => ['nullable', 'integer', 'exists:products,id', 'required_without:seller_id'],
            'seller_id' => ['nullable', 'integer', 'exists:users,id', 'required_without:product_id', 'prohibited_with:product_id'],
        ]);

        $product = !empty($validated['product_id'])
            ? Product::query()
                ->where('status', 'active')
                ->where('review_status', 'approved')
                ->with('seller:id,first_name,last_name,role,status')
                ->findOrFail($validated['product_id'])
            : null;
        $seller = $product?->seller;
        if (!$seller && !$product) {
            $seller = User::query()
                ->where('role', 'seller')
                ->where('status', 'active')
                ->whereHas('sellerProfile')
                ->findOrFail($validated['seller_id']);
        }
        abort_unless(
            $seller && $seller->role === 'seller' && $seller->status === 'active',
            422,
            'This seller is currently unavailable.'
        );

        try {
            $conversation = DB::transaction(function () use ($request, $product, $seller) {
                $conversation = Conversation::query()
                    ->where('buyer_id', $request->user()->id)
                    ->where('seller_id', $seller->id)
                    ->lockForUpdate()
                    ->first();

                $shareProduct = $product && (!$conversation || (int) $conversation->product_id !== (int) $product->id);
                if (!$conversation) {
                    $conversation = Conversation::create([
                        'buyer_id' => $request->user()->id,
                        'seller_id' => $seller->id,
                        'admin_id' => null,
                        'product_id' => $product?->id,
                    ]);
                } elseif ($product && (int) $conversation->product_id !== (int) $product->id) {
                    $conversation->update(['product_id' => $product->id]);
                }

                if ($product && ($shareProduct || !Message::where('conversation_id', $conversation->id)->where('product_id', $product->id)->exists())) {
                    Message::create([
                        'conversation_id' => $conversation->id,
                        'sender_id' => $request->user()->id,
                        'sender_type' => 'user',
                        'product_id' => $product->id,
                        'message' => 'Shared this product for reference.',
                        'is_read' => false,
                    ]);
                    $conversation->touch();
                }

                return $conversation->load(['seller:id,first_name,last_name', 'seller.sellerProfile:user_id,business_name,store_slug', 'product:id,seller_id,name,price,discounted_price,stock,status,category', 'product.media']);
            });
        } catch (QueryException $exception) {
            $conversation = Conversation::where('buyer_id', $request->user()->id)
                ->where('seller_id', $seller->id)
                ->first();
            if (!$conversation) {
                throw $exception;
            }
            $conversation->load(['seller:id,first_name,last_name', 'seller.sellerProfile:user_id,business_name,store_slug', 'product:id,seller_id,name,price,discounted_price,stock,status,category', 'product.media']);
        }

        return response()->json(['success' => true, 'data' => $conversation]);
    }

    /*
    |--------------------------------------------------------------------------
    | View Conversation
    |--------------------------------------------------------------------------
    */

    public function showConversation(
        Request $request,
        int $id
    ) {
        $this->buyerOnly($request);

        $conversation = Conversation::with([
            'admin:id,first_name,last_name',
            'seller:id,first_name,last_name',
            'seller.sellerProfile:user_id,business_name,store_slug',
            'product:id,seller_id,name,price,discounted_price,stock,status,category',
            'product.media',
            'messages' => function ($query) {
                $query
                    ->with('sender:id,first_name,last_name,role')
                    ->with('order:id,status,total_amount,created_at')
                    ->with('order.items.product:id,name')
                    ->with('product:id,name,price,discounted_price,stock,status,category')
                    ->with('product.media')
                    ->oldest();
            },
        ])
            ->where('buyer_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $conversation,
        ]);
    }

    public function shareConversationProduct(Request $request, int $id)
    {
        $this->buyerOnly($request);
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $message = DB::transaction(function () use ($request, $id, $validated) {
            $conversation = Conversation::where('buyer_id', $request->user()->id)
                ->whereNotNull('seller_id')
                ->lockForUpdate()
                ->findOrFail($id);
            $product = Product::whereKey($validated['product_id'])
                ->where('seller_id', $conversation->seller_id)
                ->firstOrFail();

            $message = Message::where('conversation_id', $conversation->id)
                ->where('product_id', $product->id)
                ->oldest('id')
                ->first();
            if (!$message) {
                $message = Message::create([
                    'conversation_id' => $conversation->id,
                    'sender_id' => $request->user()->id,
                    'sender_type' => 'user',
                    'product_id' => $product->id,
                    'message' => 'Shared this product for reference.',
                    'is_read' => false,
                ]);
                $conversation->touch();
            }

            return $message->load('sender:id,first_name,last_name,role', 'product:id,name,price,discounted_price,stock,status,category', 'product.media');
        });

        return response()->json(['success' => true, 'data' => $message], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Send Message
    |--------------------------------------------------------------------------
    */

    public function sendMessage(
        Request $request,
        int $id,
        ConversationMessageSender $messageSender
    ) {
        $this->buyerOnly($request);

        $validated = $request->validate([
            'message' => [
                'required',
                'string',
                'max:2000',
                'not_regex:/^\s*$/u',
            ],
            'client_message_id' => ['sometimes', 'uuid'],
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
        ]);

        $conversation = Conversation::where(
            'buyer_id',
            $request->user()->id
        )->findOrFail($id);
        $orderId = isset($validated['order_id']) ? (int) $validated['order_id'] : null;
        $productId = isset($validated['product_id']) ? (int) $validated['product_id'] : null;
        if ($productId) {
            abort_unless($conversation->seller_id, 422, 'Product cards can only be shared with a seller.');
            Product::where('seller_id', $conversation->seller_id)->findOrFail($productId);
        }
        $order = null;
        if ($orderId) {
            $orderQuery = Order::where('buyer_id', $request->user()->id);
            if ($conversation->seller_id) {
                $orderQuery->whereHas('items', fn ($query) => $query->where('seller_id', $conversation->seller_id));
            }
            $order = $orderQuery->with(['items' => fn ($query) => $query->when($conversation->seller_id, fn ($items) => $items->where('seller_id', $conversation->seller_id))->with('product:id,name')])->findOrFail($orderId);
        }
        $message = $messageSender->send(
            $conversation,
            $request->user(),
            $validated['message'],
            $validated['client_message_id'] ?? null,
            $orderId,
            $productId
        );
        $assistantMessage = null;
        if (!$conversation->seller_id && $message->wasRecentlyCreated) {
            $assistantMessage = Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $request->user()->id,
                'sender_type' => 'assistant',
                'order_id' => $orderId,
                'message' => $this->supportAssistantAnswer($validated['message'], $order),
                'is_read' => true,
            ]);
            $conversation->touch();
            $assistantMessage->load('sender:id,first_name,last_name,role', 'order:id,status,total_amount,created_at', 'order.items.product:id,name');
        }

        if ($conversation->seller_id && $message->wasRecentlyCreated) {
            $conversation->loadMissing(['buyer:id,first_name,last_name', 'product:id,name', 'seller']);
            $buyerName = trim(implode(' ', array_filter([$conversation->buyer?->first_name, $conversation->buyer?->last_name]))) ?: 'A buyer';
            $productContext = $conversation->product?->name ? " about {$conversation->product->name}" : '';
            $conversation->seller?->notify(new SellerActivityNotification(
                'New buyer message',
                "{$buyerName} sent you a message{$productContext}.",
                'new_buyer_message',
                '/seller/chat',
                ['conversation_id' => $conversation->id],
            ));
        }

        $message->load(
            'sender:id,first_name,last_name,role',
            'order:id,status,total_amount,created_at',
            'order.items.product:id,name',
            'product:id,name,price,discounted_price,stock,status,category',
            'product.media'
        );

        return response()->json([
            'success' => true,
            'message' => 'Message sent successfully.',
            'data' => $message,
            'assistant_message' => $assistantMessage,
        ], 201);
    }

    public function sendAttachment(Request $request, int $id)
    {
        $this->buyerOnly($request);
        $validated = $request->validate([
            'message' => ['nullable', 'string', 'max:2000'],
            'attachment' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
        ]);

        $conversation = Conversation::where('buyer_id', $request->user()->id)
            ->whereNull('seller_id')
            ->findOrFail($id);
        $orderId = isset($validated['order_id']) ? (int) $validated['order_id'] : null;
        if ($orderId) {
            abort_unless(Order::where('buyer_id', $request->user()->id)->whereKey($orderId)->exists(), 422, 'Choose one of your own orders.');
        }

        $upload = $request->file('attachment');
        $path = $upload->store("chat-attachments/{$conversation->id}", 'local');
        $originalName = trim((string) preg_replace('/[^A-Za-z0-9._ -]/', '_', basename($upload->getClientOriginalName())));
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'sender_type' => 'user',
            'order_id' => $orderId,
            'message' => trim((string) ($validated['message'] ?? '')) ?: 'Shared an image for support.',
            'is_read' => false,
            'attachment_path' => $path,
            'attachment_name' => $originalName ?: 'support-image',
            'attachment_mime' => $upload->getMimeType() ?: 'application/octet-stream',
        ]);
        $assistantMessage = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'sender_type' => 'assistant',
            'order_id' => $orderId,
            'message' => 'Thanks, I received your image. CRYMA Customer Service can review it in this conversation.',
            'is_read' => true,
        ]);
        $conversation->touch();
        $message->load('sender:id,first_name,last_name,role', 'order:id,status,total_amount,created_at', 'order.items.product:id,name');
        $assistantMessage->load('sender:id,first_name,last_name,role', 'order:id,status,total_amount,created_at', 'order.items.product:id,name');

        return response()->json(['success' => true, 'data' => $message, 'assistant_message' => $assistantMessage], 201);
    }

    public function downloadAttachment(Request $request, int $id, int $message)
    {
        $conversation = Conversation::findOrFail($id);
        $user = $request->user();
        $canView = $user->role === 'buyer'
            ? (int) $conversation->buyer_id === (int) $user->id
            : ($user->role === 'admin' && (int) $conversation->admin_id === (int) $user->id);
        abort_unless($canView, 403);

        $chatMessage = Message::where('conversation_id', $conversation->id)->findOrFail($message);
        abort_unless($chatMessage->attachment_path && Storage::disk('local')->exists($chatMessage->attachment_path), 404);

        return Storage::disk('local')->download(
            $chatMessage->attachment_path,
            $chatMessage->attachment_name ?: 'support-attachment',
            ['Content-Type' => $chatMessage->attachment_mime ?: 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff']
        );
    }

    private function supportAssistantAnswer(string $question, ?Order $order = null): string
    {
        if (preg_match('/\b(order status|track|tracking|where.*order|my order)\b/i', $question)) {
            if ($order) {
                return "Order #{$order->id} is currently marked {$order->status}. Open My Orders for the full order details. If you need more help, Customer Service can follow up in this conversation.";
            }
            return 'You can check the latest status in My Orders. Open an order to see its details. CRYMA does not currently show delivery estimates or tracking guarantees. Select the order above or include its number and Customer Service can follow up here.';
        }
        if (preg_match('/\b(deliver|delivery|shipping|ship|courier)\b/i', $question)) {
            return 'Your delivery address and order status are available in My Orders. CRYMA does not currently publish delivery estimates or coverage details here. Select your order above and Customer Service can follow up in this conversation.';
        }
        if (
            preg_match('/\b(refund|money back)\b/i', $question)
            && preg_match('/\b(i want|i need|please|request|apply|refund my|money back)\b/i', $question)
        ) {
            if ($order) {
                return "To submit a tracked refund request for Order #{$order->id}, open My Orders, choose the order, then select Request a refund. You can enter the amount and reason there. Customer Service will review it; approval is not automatic. If approved, the team will arrange repayment outside the app and record when it is completed.";
            }

            return 'For delivered or completed orders, open My Orders, choose the order, then select Request a refund to submit a tracked request with an amount and reason. Customer Service will review it; approval is not automatic. If approved, the team will arrange repayment outside the app and record when it is completed.';
        }
        if (preg_match('/\b(refund|return|cancel|cancellation)\b/i', $question)) {
            return 'CRYMA does not offer self-service cancellations or returns. For a delivered or completed order, submit a tracked refund request from My Orders → Order details → Request a refund. Customer Service reviews each request. Approved repayments are arranged outside the app; CRYMA does not transfer money automatically.';
        }
        if (preg_match('/\b(payment|gcash|cod|cash on delivery|charged|paid)\b/i', $question)) {
            return 'CRYMA checkout currently supports Cash on Delivery only. Pay when your order arrives. If you have a charge or payment concern, select the order above and describe what happened so Customer Service can review it here.';
        }
        if (preg_match('/\b(account|password|sign.?in|login|profile)\b/i', $question)) {
            return 'For account access or profile questions, share the details here and Customer Service can follow up. Never send your password or full payment details in chat.';
        }

        return 'I do not have a confirmed answer for that yet. Customer Service can follow up in this same conversation. If this is about an order, select it above or include its order number.';
    }

    /*
    |--------------------------------------------------------------------------
    | Mark Messages as Read
    |--------------------------------------------------------------------------
    */

    public function markAsRead(
        Request $request,
        int $id
    ) {
        $this->buyerOnly($request);

        $conversation = Conversation::where(
            'buyer_id',
            $request->user()->id
        )->findOrFail($id);

        Message::where(
            'conversation_id',
            $conversation->id
        )
            ->where(
                'sender_id',
                '!=',
                $request->user()->id
            )
            ->where('is_read', false)
            ->update([
                'is_read' => true,
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Messages marked as read.',
        ]);
    }
}
