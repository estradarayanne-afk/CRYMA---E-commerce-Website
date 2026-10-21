<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Support\ConversationMessageSender;
use Illuminate\Http\Request;

class ChatController extends Controller
{
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
                'messages' => fn ($query) => $query->with('sender:id,first_name,last_name,role')->oldest(),
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
        $message->load('sender:id,first_name,last_name,role');

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
