<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Product;
use App\Support\ConversationMessageSender;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;

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

            if (!$conversation && $admin) {
                Conversation::create([
                    'buyer_id' => $buyer->id,
                    'admin_id' => $admin->id,
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
                'product:id,name',
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
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $product = Product::query()
            ->where('status', 'active')
            ->where('review_status', 'approved')
            ->with('seller:id,first_name,last_name,role,status')
            ->findOrFail($validated['product_id']);
        abort_unless(
            $product->seller && $product->seller->role === 'seller' && $product->seller->status === 'active',
            422,
            'This seller is currently unavailable.'
        );

        try {
            $conversation = DB::transaction(function () use ($request, $product) {
                $conversation = Conversation::query()
                    ->where('buyer_id', $request->user()->id)
                    ->where('seller_id', $product->seller_id)
                    ->lockForUpdate()
                    ->first();

                if (!$conversation) {
                    $conversation = Conversation::create([
                        'buyer_id' => $request->user()->id,
                        'seller_id' => $product->seller_id,
                        'admin_id' => null,
                        'product_id' => $product->id,
                    ]);
                }

                return $conversation->load(['seller:id,first_name,last_name', 'product:id,name']);
            });
        } catch (QueryException $exception) {
            $conversation = Conversation::where('buyer_id', $request->user()->id)
                ->where('seller_id', $product->seller_id)
                ->first();
            if (!$conversation) {
                throw $exception;
            }
            $conversation->load(['seller:id,first_name,last_name', 'product:id,name']);
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
            'product:id,name',
            'messages' => function ($query) {
                $query
                    ->with('sender:id,first_name,last_name,role')
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
        ]);

        $conversation = Conversation::where(
            'buyer_id',
            $request->user()->id
        )->findOrFail($id);
        if (!$conversation->seller_id) {
            abort_unless(
                $conversation->admin_id
                    && User::where('id', $conversation->admin_id)
                        ->where('role', 'admin')
                        ->where('status', 'active')
                        ->exists(),
                422,
                'CRYMA Customer Service is currently unavailable.'
            );
        }

        $message = $messageSender->send(
            $conversation,
            $request->user(),
            $validated['message'],
            $validated['client_message_id'] ?? null
        );

        $message->load(
            'sender:id,first_name,last_name,role'
        );

        return response()->json([
            'success' => true,
            'message' => 'Message sent successfully.',
            'data' => $message,
        ], 201);
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
