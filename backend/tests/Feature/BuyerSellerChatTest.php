<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuyerSellerChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_start_one_reusable_conversation_with_an_active_product_seller(): void
    {
        [$buyer, $seller, $product] = $this->buyerSellerAndProduct();

        $first = $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/chat/seller-conversations', ['product_id' => $product->id])
            ->assertOk()
            ->assertJsonPath('data.seller.id', $seller->id)
            ->assertJsonPath('data.product.id', $product->id);

        $second = $this->postJson('/api/buyer/chat/seller-conversations', ['product_id' => $product->id])
            ->assertOk()
            ->assertJsonPath('data.id', $first->json('data.id'));

        $this->assertSame(1, Conversation::where('buyer_id', $buyer->id)->where('seller_id', $seller->id)->count());
        $this->assertSame($first->json('data.id'), $second->json('data.id'));
    }

    public function test_buyer_cannot_open_or_send_to_another_buyers_conversation(): void
    {
        [$owner, $seller] = $this->buyerSellerAndProduct();
        $otherBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $conversation = Conversation::create([
            'buyer_id' => $owner->id,
            'seller_id' => $seller->id,
        ]);

        $this->actingAs($otherBuyer, 'sanctum')
            ->getJson("/api/buyer/chat/conversations/{$conversation->id}")
            ->assertNotFound();

        $this->postJson("/api/buyer/chat/conversations/{$conversation->id}/messages", [
            'message' => 'Can you help?',
        ])->assertNotFound();
    }

    public function test_seller_can_only_open_their_own_conversations(): void
    {
        [$buyer, $seller] = $this->buyerSellerAndProduct();
        $otherSeller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $conversation = Conversation::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
        ]);

        $this->actingAs($otherSeller, 'sanctum')
            ->getJson("/api/seller/chat/conversations/{$conversation->id}")
            ->assertNotFound();

        $this->postJson("/api/seller/chat/conversations/{$conversation->id}/messages", [
            'message' => 'Unauthorized message',
        ])->assertNotFound();
    }

    public function test_chat_rejects_empty_whitespace_and_overlong_messages(): void
    {
        [$buyer, $seller] = $this->buyerSellerAndProduct();
        $conversation = Conversation::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/buyer/chat/conversations/{$conversation->id}/messages", ['message' => " \n\t "])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['message']);

        $this->postJson("/api/buyer/chat/conversations/{$conversation->id}/messages", ['message' => str_repeat('a', 2001)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['message']);

        $this->assertSame(0, Message::count());
    }

    public function test_repeating_a_message_request_id_does_not_create_a_duplicate(): void
    {
        [$buyer, $seller] = $this->buyerSellerAndProduct();
        $conversation = Conversation::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
        ]);
        $payload = [
            'message' => 'Is this item available?',
            'client_message_id' => 'c130bff5-33e4-40d1-b4dd-42e97679a298',
        ];

        $first = $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/buyer/chat/conversations/{$conversation->id}/messages", $payload)
            ->assertCreated();
        $second = $this->postJson("/api/buyer/chat/conversations/{$conversation->id}/messages", $payload)
            ->assertCreated()
            ->assertJsonPath('data.id', $first->json('data.id'));

        $this->postJson("/api/buyer/chat/conversations/{$conversation->id}/messages", [
            ...$payload,
            'message' => 'A different message using the same request id',
        ])->assertStatus(409);

        $this->assertSame(1, Message::count());
    }

    public function test_seller_can_reply_to_the_buyer_in_their_own_conversation(): void
    {
        [$buyer, $seller] = $this->buyerSellerAndProduct();
        $conversation = Conversation::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
        ]);

        $response = $this->actingAs($seller, 'sanctum')
            ->postJson("/api/seller/chat/conversations/{$conversation->id}/messages", [
                'message' => 'Yes, it is available.',
                'client_message_id' => '0c6e35cf-4927-4fd4-a20b-42fae7ea1d58',
            ])
            ->assertCreated()
            ->assertJsonPath('data.sender_id', $seller->id)
            ->assertJsonPath('data.is_read', false);

        $this->assertDatabaseHas('messages', [
            'id' => $response->json('data.id'),
            'conversation_id' => $conversation->id,
            'sender_id' => $seller->id,
            'message' => 'Yes, it is available.',
        ]);
    }

    public function test_buyer_and_seller_inboxes_count_all_unread_messages_and_clear_them_on_read(): void
    {
        [$buyer, $seller] = $this->buyerSellerAndProduct();
        $conversation = Conversation::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
        ]);
        foreach (['First question', 'Follow-up question'] as $text) {
            Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $buyer->id,
                'message' => $text,
                'is_read' => false,
            ]);
        }

        $sellerInbox = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/chat/conversations')
            ->assertOk();
        $sellerThread = collect($sellerInbox->json('data'))->firstWhere('id', $conversation->id);
        $this->assertSame(2, $sellerThread['unread_messages_count']);
        $this->patchJson("/api/seller/chat/conversations/{$conversation->id}/read")
            ->assertOk();
        $sellerThread = collect($this->getJson('/api/seller/chat/conversations')->json('data'))
            ->firstWhere('id', $conversation->id);
        $this->assertSame(0, $sellerThread['unread_messages_count']);

        $reply = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $seller->id,
            'message' => 'I will help.',
            'is_read' => false,
        ]);
        $buyerInbox = $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/buyer/chat/conversations');
        $buyerThread = collect($buyerInbox->json('data'))->firstWhere('id', $conversation->id);
        $this->assertSame(1, $buyerThread['unread_messages_count']);
        $this->patchJson("/api/buyer/chat/conversations/{$conversation->id}/read")
            ->assertOk();
        $buyerThread = collect($this->getJson('/api/buyer/chat/conversations')->json('data'))
            ->firstWhere('id', $conversation->id);
        $this->assertSame(0, $buyerThread['unread_messages_count']);

        $this->assertTrue($reply->fresh()->is_read);
    }

    public function test_support_inbox_is_created_for_an_active_admin(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/buyer/chat/conversations')
            ->assertOk()
            ->assertJsonPath('support_available', true)
            ->assertJsonPath('data.0.admin.id', $admin->id);

        $this->assertDatabaseHas('conversations', [
            'buyer_id' => $buyer->id,
            'admin_id' => $admin->id,
            'seller_id' => null,
        ]);
    }

    public function test_buyer_can_use_support_assistant_without_an_active_admin(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $inactiveAdmin = User::factory()->create(['role' => 'admin', 'status' => 'suspended']);
        $conversation = Conversation::create([
            'buyer_id' => $buyer->id,
            'admin_id' => $inactiveAdmin->id,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/buyer/chat/conversations')
            ->assertOk()
            ->assertJsonPath('support_available', false)
            ->assertJsonPath('data.0.id', $conversation->id);

        $response = $this->postJson("/api/buyer/chat/conversations/{$conversation->id}/messages", [
            'message' => 'Hello',
        ])->assertCreated()
            ->assertJsonPath('data.sender_id', $buyer->id)
            ->assertJsonPath('assistant_message.sender_type', 'assistant');
        $this->assertSame(2, Message::where('conversation_id', $conversation->id)->count());
        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'sender_type' => 'assistant',
            'message' => $response->json('assistant_message.message'),
        ]);
    }

    public function test_seller_conversations_are_returned_without_an_available_admin(): void
    {
        [$buyer, $seller] = $this->buyerSellerAndProduct();
        $sellerConversation = Conversation::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
        ]);

        $response = $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/buyer/chat/conversations')
            ->assertOk()
            ->assertJsonPath('support_available', false)
            ->assertJsonCount(2, 'data');
        $conversations = collect($response->json('data'));
        $sellerRow = $conversations->firstWhere('id', $sellerConversation->id);
        $supportRow = $conversations->first(fn (array $row) => ($row['seller'] ?? null) === null);
        $this->assertSame($seller->id, $sellerRow['seller']['id']);
        $this->assertNotNull($supportRow);
    }

    private function buyerSellerAndProduct(): array
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Messaging test product',
            'description' => 'Product used for conversation tests.',
            'price' => '12.00',
            'stock' => 3,
            'category' => 'Pet Supplies',
            'status' => 'active',
        ]);

        return [$buyer, $seller, $product];
    }
}
