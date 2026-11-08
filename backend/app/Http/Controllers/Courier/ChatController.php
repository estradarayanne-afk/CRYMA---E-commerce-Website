<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Delivery;
use App\Models\Message;
use App\Services\CourierEligibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Buyer↔courier chat over the shared conversations/messages tables.
 * The courier only sees conversations belonging to their active deliveries.
 */
class ChatController extends Controller
{
    private function profile(Request $request, CourierEligibility $eligibility)
    {
        $user = $request->user();
        abort_unless(
            $user->role === 'rider' && $user->status === 'active' && $user->email_verified_at,
            403, 'Courier account is not eligible to operate.'
        );
        $profile = $user->courierProfile;
        abort_unless($profile && $eligibility->isEligible($profile), 403, 'Courier account is not approved.');
        return $profile;
    }

    /** List conversations for deliveries assigned to this courier. */
    public function conversations(Request $request, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request, $eligibility);

        $conversations = Conversation::where('courier_profile_id', $profile->id)
            ->where('type', 'courier')
            ->with(['buyer:id,first_name,last_name', 'delivery:id,parcel_code,status'])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->where('is_read', false)
                ->where('sender_id', '!=', $request->user()->id)])
            ->latest('updated_at')
            ->get()
            ->map(fn (Conversation $c) => $this->conversationData($c, $request->user()->id));

        return response()->json(['success' => true, 'data' => $conversations]);
    }

    /** Show a single conversation and its messages. */
    public function show(Request $request, int $id, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request, $eligibility);
        $conversation = Conversation::where('courier_profile_id', $profile->id)
            ->where('type', 'courier')
            ->with(['messages' => fn ($q) => $q->orderBy('created_at'), 'buyer:id,first_name,last_name', 'delivery:id,parcel_code,status'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => [
                'conversation' => $this->conversationData($conversation, $request->user()->id),
                'messages'     => $conversation->messages->map(fn (Message $m) => $this->messageData($m)),
            ],
        ]);
    }

    /** Send a message as the courier. */
    public function sendMessage(Request $request, int $id, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
        ]);
        $profile = $this->profile($request, $eligibility);
        $conversation = Conversation::where('courier_profile_id', $profile->id)
            ->where('type', 'courier')
            ->findOrFail($id);

        $message = DB::transaction(function () use ($request, $conversation, $values): Message {
            $message = Message::create([
                'conversation_id' => $conversation->id,
                'sender_id'       => $request->user()->id,
                'sender_type'     => 'courier',
                'message'         => $values['message'],
                'is_read'         => false,
            ]);
            $conversation->touch();
            return $message;
        });

        // Notify the buyer that the courier replied.
        $conversation->loadMissing(['buyer:id,first_name,last_name', 'delivery:id,parcel_code']);
        $buyerUser = $conversation->buyer;
        if ($buyerUser) {
            $courierName = trim(implode(' ', array_filter([
                $request->user()->first_name,
                $request->user()->last_name,
            ]))) ?: 'Courier';
            $parcelContext = $conversation->delivery?->parcel_code
                ? " (Parcel {$conversation->delivery->parcel_code})"
                : '';
            $buyerUser->notify(new \App\Notifications\CourierEventNotification(
                'Message from your courier',
                "{$courierName} sent you a message{$parcelContext}.",
                ['type' => 'new_courier_message', 'conversation_id' => $conversation->id],
            ));
        }

        return response()->json([
            'success' => true,
            'message' => 'Message sent.',
            'data'    => $this->messageData($message),
        ]);
    }

    /** Mark all unread messages in a conversation as read for this courier. */
    public function markRead(Request $request, int $id, CourierEligibility $eligibility)
    {
        $profile = $this->profile($request, $eligibility);
        $conversation = Conversation::where('courier_profile_id', $profile->id)
            ->where('type', 'courier')
            ->findOrFail($id);

        Message::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['success' => true, 'message' => 'Marked as read.']);
    }

    private function conversationData(Conversation $c, int $myUserId): array
    {
        $last = $c->messages()->latest('created_at')->first();
        return [
            'id'           => $c->id,
            'type'         => $c->type,
            'buyer'        => $c->buyer ? [
                'id'   => $c->buyer->id,
                'name' => trim($c->buyer->first_name.' '.$c->buyer->last_name),
            ] : null,
            'delivery'     => $c->delivery ? [
                'id'          => $c->delivery->id,
                'parcel_code' => $c->delivery->parcel_code,
                'status'      => $c->delivery->status,
            ] : null,
            'last_message' => $last?->message,
            'last_message_at' => $last?->created_at,
            'unread_count' => $c->unread_count ?? 0,
        ];
    }

    private function messageData(Message $m): array
    {
        return [
            'id'          => $m->id,
            'sender_id'   => $m->sender_id,
            'sender_type' => $m->sender_type,
            'message'     => $m->message,
            'is_read'     => $m->is_read,
            'created_at'  => $m->created_at,
        ];
    }
}
