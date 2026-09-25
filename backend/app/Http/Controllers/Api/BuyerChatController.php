<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;

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

        $conversation = Conversation::where(
            'buyer_id',
            $buyer->id
        )->first();

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

        if (!$conversation) {
            $admin = User::where('role', 'admin')
                ->where('status', 'active')
                ->first();

            if (!$admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'No support representative is currently available.',
                ], 422);
            }

            $conversation = Conversation::create([
                'buyer_id' => $buyer->id,
                'admin_id' => $admin->id,
            ]);
        }

        $conversation->load([
            'admin:id,first_name,last_name,email',
            'messages' => function ($query) {
                $query->latest()->limit(1);
            },
        ]);

        return response()->json([
            'success' => true,
            'data' => [$conversation],
        ]);
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
            'admin:id,first_name,last_name,email',
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
        int $id
    ) {
        $this->buyerOnly($request);

        $validated = $request->validate([
            'message' => [
                'required',
                'string',
                'max:2000',
            ],
        ]);

        $conversation = Conversation::where(
            'buyer_id',
            $request->user()->id
        )->findOrFail($id);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'message' => trim($validated['message']),
            'is_read' => true,
        ]);

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