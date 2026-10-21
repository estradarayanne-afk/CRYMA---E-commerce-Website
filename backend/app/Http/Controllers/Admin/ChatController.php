<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Support\ConversationMessageSender;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Conversation List
    |--------------------------------------------------------------------------
    */

    public function conversations(Request $request)
    {
        $admin = $request->user();

        $conversations = Conversation::with([
            'buyer',
            'messages' => function ($query) {
                $query->latest()->limit(1);
            }
        ])
        ->withCount(['messages as unread_messages_count' => function ($query) use ($admin) {
            $query->where('sender_id', '!=', $admin->id)
                ->where('is_read', false);
        }])
        ->where('admin_id', $admin->id)
        ->latest()
        ->get();

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | View Conversation
    |--------------------------------------------------------------------------
    */

    public function showConversation(Request $request, int $id)
    {
        $conversation = Conversation::with([
            'buyer',
            'admin',
            'messages.sender'
        ])->where('admin_id', $request->user()->id)->findOrFail($id);

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

    public function sendMessage(Request $request, int $id, ConversationMessageSender $messageSender)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000', 'not_regex:/^\s*$/u'],
            'client_message_id' => ['sometimes', 'uuid'],
        ]);

        $conversation = Conversation::where('admin_id', $request->user()->id)->findOrFail($id);

        $message = $messageSender->send(
            $conversation,
            $request->user(),
            $validated['message'],
            $validated['client_message_id'] ?? null
        );

        $message->load('sender');

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

    public function markAsRead(Request $request, int $id)
    {
        $conversation = Conversation::where('admin_id', $request->user()->id)->findOrFail($id);

        Message::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $request->user()->id)
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
