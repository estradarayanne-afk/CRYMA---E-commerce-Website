<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
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

    public function showConversation(
        Request $request,
        $id
    ) {
        $conversation = Conversation::with([
            'buyer',
            'admin',
            'messages.sender'
        ])->findOrFail($id);

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
        $id
    ) {
        $validated = $request->validate([
            'message' => 'required|string',
        ]);

        $conversation = Conversation::findOrFail($id);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'message' => $validated['message'],
            'is_read' => true,
        ]);

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

    public function markAsRead(
        Request $request,
        $id
    ) {
        $conversation = Conversation::findOrFail($id);

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