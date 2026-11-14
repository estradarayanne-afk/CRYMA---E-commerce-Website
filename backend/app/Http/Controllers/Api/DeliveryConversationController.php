<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryConversation;
use App\Models\DeliveryConversationMessage;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryConversationController extends Controller
{
    public function showBuyerRiderChat(Request $request, int $orderId)
    {
        $conversation = $this->buyerRiderConversation($request, $orderId);
        $this->markRead($conversation, $request->user());

        return response()->json([
            'success' => true,
            'data' => $this->conversationPayload($conversation),
        ]);
    }

    public function sendBuyerRiderMessage(Request $request, int $orderId)
    {
        $values = $this->validatedMessage($request);
        $conversation = $this->buyerRiderConversation($request, $orderId);
        $message = $this->sendMessage($conversation, $request->user(), $values);

        return response()->json([
            'success' => true,
            'data' => $message->load('sender:id,first_name,last_name,role'),
        ], 201);
    }

    public function courierConversations(Request $request)
    {
        $profile = $request->user()->courierProfile()->firstOrFail();
        $conversations = DeliveryConversation::query()
            ->where(function ($query) use ($profile) {
                $query->where(function ($buyerRider) use ($profile) {
                    $buyerRider->where('type', DeliveryConversation::BUYER_RIDER)
                        ->where('courier_profile_id', $profile->id)
                        ->whereHas('delivery', fn ($delivery) => $delivery
                            ->where('courier_profile_id', $profile->id)
                            ->whereNotNull('delivery_picked_up_at'));
                })->orWhere(function ($sellerLogistics) use ($profile) {
                    $sellerLogistics->where('type', DeliveryConversation::SELLER_LOGISTICS)
                        ->whereHas('delivery', fn ($delivery) => $delivery
                            ->where('courier_profile_id', $profile->id)
                            ->orWhereHas('pickupAssignment', fn ($pickup) => $pickup->where('courier_profile_id', $profile->id)));
                });
            })
            ->with([
                'delivery.order:id',
                'delivery.pickupAssignment',
                'buyer:id,first_name,last_name,role',
                'seller:id,first_name,last_name,role',
                'courierProfile.user:id,first_name,last_name,role',
                'createdBy:id,first_name,last_name,role',
            ])
            ->withCount(['messages as unread_messages_count' => fn ($query) => $query
                ->where('sender_id', '!=', $request->user()->id)
                ->where('is_read', false)])
            ->with(['messages' => fn ($query) => $query->latest()->limit(1)])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (DeliveryConversation $conversation) => $this->conversationSummary($conversation));

        return response()->json(['success' => true, 'data' => $conversations]);
    }

    public function showCourierConversation(Request $request, int $conversationId)
    {
        $conversation = $this->courierConversation($request, $conversationId);
        $this->markRead($conversation, $request->user());

        return response()->json([
            'success' => true,
            'data' => $this->conversationPayload($conversation),
        ]);
    }

    public function sendCourierMessage(Request $request, int $conversationId)
    {
        $values = $this->validatedMessage($request);
        $conversation = $this->courierConversation($request, $conversationId);
        $message = $this->sendMessage($conversation, $request->user(), $values);

        return response()->json([
            'success' => true,
            'data' => $message->load('sender:id,first_name,last_name,role'),
        ], 201);
    }

    public function startSellerLogisticsConversation(Request $request, int $deliveryId)
    {
        $values = $request->validate([
            'seller_id' => ['sometimes', 'integer'],
        ]);
        $delivery = Delivery::with('order.items')->findOrFail($deliveryId);
        $this->authorizeDeliveryConversationAccess($request->user(), $delivery);
        $sellerIds = isset($values['seller_id'])
            ? [(int) $values['seller_id']]
            : $delivery->order->items->pluck('seller_id')->unique()->values()->all();
        abort_unless($sellerIds !== [], 404);
        abort_unless(collect($sellerIds)->every(
            fn (int $sellerId) => $delivery->order->items->contains('seller_id', $sellerId)
        ), 404);

        $conversations = collect($sellerIds)->map(function (int $sellerId) use ($delivery, $request) {
            return DeliveryConversation::firstOrCreate(
                [
                    'delivery_id' => $delivery->id,
                    'type' => DeliveryConversation::SELLER_LOGISTICS,
                    'seller_id' => $sellerId,
                    'thread_key' => "seller-logistics:{$delivery->id}:{$sellerId}",
                ],
                ['created_by' => $request->user()->id]
            );
        });

        return response()->json([
            'success' => true,
            'data' => $conversations->map(fn (DeliveryConversation $conversation) => $this->conversationPayload($conversation))->values(),
        ]);
    }

    public function logisticsConversations(Request $request)
    {
        $conversations = DeliveryConversation::query()
            ->where('type', DeliveryConversation::SELLER_LOGISTICS)
            ->with(['delivery.order:id', 'delivery.currentHub', 'delivery.pickupAssignment', 'seller:id,first_name,last_name', 'createdBy:id,first_name,last_name,role'])
            ->withCount(['messages as unread_messages_count' => fn ($query) => $query
                ->where('sender_id', '!=', $request->user()->id)
                ->where('is_read', false)])
            ->with(['messages' => fn ($query) => $query->latest()->limit(1)])
            ->orderByDesc('updated_at')
            ->get()
            ->filter(fn (DeliveryConversation $conversation) => $this->canAccessDeliveryConversation($request->user(), $conversation->delivery))
            ->values()
            ->map(fn (DeliveryConversation $conversation) => $this->conversationSummary($conversation));

        return response()->json(['success' => true, 'data' => $conversations]);
    }

    public function showLogisticsConversation(Request $request, int $conversationId)
    {
        $conversation = $this->logisticsConversation($request, $conversationId);
        $this->markRead($conversation, $request->user());

        return response()->json([
            'success' => true,
            'data' => $this->conversationPayload($conversation),
        ]);
    }

    public function sendLogisticsMessage(Request $request, int $conversationId)
    {
        $values = $this->validatedMessage($request);
        $conversation = $this->logisticsConversation($request, $conversationId);
        $message = $this->sendMessage($conversation, $request->user(), $values);

        return response()->json([
            'success' => true,
            'data' => $message->load('sender:id,first_name,last_name,role'),
        ], 201);
    }

    public function sellerConversations(Request $request)
    {
        $seller = $request->user();
        $conversations = DeliveryConversation::query()
            ->where('type', DeliveryConversation::SELLER_LOGISTICS)
            ->where('seller_id', $seller->id)
            ->with(['delivery.order:id', 'createdBy:id,first_name,last_name,role', 'seller:id,first_name,last_name,role'])
            ->withCount(['messages as unread_messages_count' => fn ($query) => $query
                ->where('sender_id', '!=', $seller->id)
                ->where('is_read', false)])
            ->with(['messages' => fn ($query) => $query->latest()->limit(1)])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (DeliveryConversation $conversation) => $this->conversationSummary($conversation));

        return response()->json(['success' => true, 'data' => $conversations]);
    }

    public function showSellerConversation(Request $request, int $conversationId)
    {
        $conversation = DeliveryConversation::query()
            ->where('type', DeliveryConversation::SELLER_LOGISTICS)
            ->where('seller_id', $request->user()->id)
            ->findOrFail($conversationId);
        $this->markRead($conversation, $request->user());

        return response()->json([
            'success' => true,
            'data' => $this->conversationPayload($conversation),
        ]);
    }

    public function sendSellerMessage(Request $request, int $conversationId)
    {
        $values = $this->validatedMessage($request);
        $conversation = DeliveryConversation::query()
            ->where('type', DeliveryConversation::SELLER_LOGISTICS)
            ->where('seller_id', $request->user()->id)
            ->findOrFail($conversationId);
        $message = $this->sendMessage($conversation, $request->user(), $values);

        return response()->json([
            'success' => true,
            'data' => $message->load('sender:id,first_name,last_name,role'),
        ], 201);
    }

    private function buyerRiderConversation(Request $request, int $orderId): DeliveryConversation
    {
        $order = Order::query()
            ->where('buyer_id', $request->user()->id)
            ->with('delivery')
            ->findOrFail($orderId);
        $delivery = $order->delivery;
        abort_unless(
            $delivery
                && $delivery->courier_profile_id
                && $delivery->delivery_picked_up_at,
            409,
            'Rider chat is available after the parcel has been picked up.'
        );

        return DeliveryConversation::firstOrCreate(
            [
                'delivery_id' => $delivery->id,
                'type' => DeliveryConversation::BUYER_RIDER,
                'buyer_id' => $request->user()->id,
                'courier_profile_id' => $delivery->courier_profile_id,
                'thread_key' => "buyer-rider:{$delivery->id}:{$request->user()->id}:{$delivery->courier_profile_id}",
            ],
            ['created_by' => $request->user()->id]
        );
    }

    private function courierConversation(Request $request, int $conversationId): DeliveryConversation
    {
        $profile = $request->user()->courierProfile()->firstOrFail();
        return DeliveryConversation::query()
            ->where(function ($query) use ($profile) {
                $query->where(function ($buyerRider) use ($profile) {
                    $buyerRider->where('type', DeliveryConversation::BUYER_RIDER)
                        ->where('courier_profile_id', $profile->id)
                        ->whereHas('delivery', fn ($delivery) => $delivery
                            ->where('courier_profile_id', $profile->id)
                            ->whereNotNull('delivery_picked_up_at'));
                })->orWhere(function ($sellerLogistics) use ($profile) {
                    $sellerLogistics->where('type', DeliveryConversation::SELLER_LOGISTICS)
                        ->whereHas('delivery', fn ($delivery) => $delivery
                            ->where('courier_profile_id', $profile->id)
                            ->orWhereHas('pickupAssignment', fn ($pickup) => $pickup->where('courier_profile_id', $profile->id)));
                });
            })
            ->with(['delivery.order', 'delivery.pickupAssignment'])
            ->findOrFail($conversationId);
    }

    private function logisticsConversation(Request $request, int $conversationId): DeliveryConversation
    {
        $conversation = DeliveryConversation::query()
            ->where('type', DeliveryConversation::SELLER_LOGISTICS)
            ->with('delivery')
            ->findOrFail($conversationId);
        $this->authorizeDeliveryConversationAccess($request->user(), $conversation->delivery);

        return $conversation;
    }

    private function authorizeDeliveryConversationAccess(User $user, Delivery $delivery): void
    {
        abort_unless($this->canAccessDeliveryConversation($user, $delivery), 403);
    }

    private function canAccessDeliveryConversation(User $user, Delivery $delivery): bool
    {
        if ($user->role === 'logistics') {
            return true;
        }

        if ($user->role === 'hub_staff') {
            $hubId = $user->hubStaffProfile()->value('hub_id');
            return $hubId && (int) $hubId === (int) $delivery->current_hub_id;
        }

        if ($user->role === 'rider') {
            $profileId = $user->courierProfile()->value('id');
            return $profileId !== null && (
                (int) $delivery->courier_profile_id === (int) $profileId
                || (int) $delivery->pickupAssignment?->courier_profile_id === (int) $profileId
            );
        }

        return false;
    }

    private function validatedMessage(Request $request): array
    {
        return $request->validate([
            'message' => ['required', 'string', 'max:2000', 'not_regex:/^\s*$/u'],
            'client_message_id' => ['sometimes', 'uuid'],
        ]);
    }

    private function sendMessage(
        DeliveryConversation $conversation,
        User $sender,
        array $values
    ): DeliveryConversationMessage {
        if (!empty($values['client_message_id'])) {
            $existing = DeliveryConversationMessage::query()
                ->where('sender_id', $sender->id)
                ->where('client_message_id', $values['client_message_id'])
                ->first();
            if ($existing) {
                if ($existing->delivery_conversation_id !== $conversation->id
                    || $existing->message !== $values['message']) {
                    abort(409, 'This message request was already used.');
                }

                return $existing;
            }
        }

        return DB::transaction(function () use ($conversation, $sender, $values) {
            if (!empty($values['client_message_id'])) {
                $message = DeliveryConversationMessage::firstOrCreate(
                    [
                        'sender_id' => $sender->id,
                        'client_message_id' => $values['client_message_id'],
                    ],
                    [
                        'delivery_conversation_id' => $conversation->id,
                        'message' => $values['message'],
                    ]
                );
                abort_unless(
                    (int) $message->delivery_conversation_id === (int) $conversation->id
                        && $message->message === $values['message'],
                    409,
                    'This message request was already used.'
                );
            } else {
                $message = $conversation->messages()->create([
                    'sender_id' => $sender->id,
                    'message' => $values['message'],
                ]);
            }
            $conversation->touch();

            return $message;
        });
    }

    private function markRead(DeliveryConversation $conversation, User $user): void
    {
        $conversation->messages()
            ->where('sender_id', '!=', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);
    }

    private function conversationPayload(DeliveryConversation $conversation): array
    {
        $conversation->loadMissing([
            'delivery.order:id',
            'delivery.pickupAssignment',
            'seller:id,first_name,last_name,role',
            'buyer:id,first_name,last_name,role',
            'courierProfile.user:id,first_name,last_name,role',
            'createdBy:id,first_name,last_name,role',
            'messages.sender:id,first_name,last_name,role',
        ]);

        return [
            'id' => $conversation->id,
            'type' => $conversation->type,
            'delivery_id' => $conversation->delivery_id,
            'order_id' => $conversation->delivery?->order?->id,
            'seller' => $this->personPayload($conversation->seller),
            'buyer' => $this->personPayload($conversation->buyer),
            'rider' => $this->personPayload($conversation->courierProfile?->user),
            'created_by' => $this->personPayload($conversation->createdBy),
            'messages' => $conversation->messages->sortBy('created_at')->values(),
        ];
    }

    private function conversationSummary(DeliveryConversation $conversation): array
    {
        $lastMessage = $conversation->messages->first();

        return [
            'id' => $conversation->id,
            'type' => $conversation->type,
            'delivery_id' => $conversation->delivery_id,
            'order_id' => $conversation->delivery?->order?->id,
            'seller' => $this->personPayload($conversation->seller),
            'buyer' => $this->personPayload($conversation->buyer),
            'rider' => $this->personPayload($conversation->courierProfile?->user),
            'created_by' => $this->personPayload($conversation->createdBy),
            'last_message' => $lastMessage,
            'unread_messages_count' => $conversation->unread_messages_count,
            'updated_at' => $conversation->updated_at,
        ];
    }

    private function personPayload(?User $user): ?array
    {
        if ($user === null) {
            return null;
        }

        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'role' => $user->role,
        ];
    }
}
