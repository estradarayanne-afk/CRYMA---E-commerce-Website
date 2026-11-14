<?php

namespace Tests\Feature;

use App\Models\CourierProfile;
use App\Models\Delivery;
use App\Models\DeliveryConversationMessage;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryConversationTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_and_assigned_rider_can_chat_only_after_pickup(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        [$rider, $profile] = $this->rider();
        $order = $this->order($buyer);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'courier_profile_id' => $profile->id,
            'status' => Delivery::ASSIGNED,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->getJson("/api/orders/{$order->id}/rider-chat")
            ->assertStatus(409);

        $delivery->update([
            'status' => Delivery::OUT_FOR_DELIVERY,
            'delivery_picked_up_at' => now(),
        ]);

        $chatResponse = $this->getJson("/api/orders/{$order->id}/rider-chat")
            ->assertOk()
            ->assertJsonPath('data.rider.id', $rider->id)
            ->assertJsonMissingPath('data.rider.phone');
        $conversationId = $chatResponse->json('data.id');

        $otherBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->actingAs($otherBuyer, 'sanctum')
            ->getJson("/api/orders/{$order->id}/rider-chat")
            ->assertNotFound();
        $this->actingAs($buyer, 'sanctum');

        $this->getJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath(
                'data.delivery_progress.delivery_rider.name',
                trim($rider->first_name.' '.$rider->last_name)
            );

        $requestId = 'c736da76-f00e-4e8d-a5a2-65eac30086db';
        $this->postJson("/api/orders/{$order->id}/rider-chat/messages", [
            'message' => 'I am on my way.',
            'client_message_id' => $requestId,
        ])->assertCreated();
        $this->postJson("/api/orders/{$order->id}/rider-chat/messages", [
            'message' => 'I am on my way.',
            'client_message_id' => $requestId,
        ])->assertCreated();
        $this->assertSame(1, DeliveryConversationMessage::count());

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/courier/delivery-chats')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.buyer.id', $buyer->id);

        [$otherRider] = $this->rider();
        $this->actingAs($otherRider, 'sanctum')
            ->getJson('/api/courier/delivery-chats')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->getJson("/api/courier/delivery-chats/{$conversationId}")
            ->assertNotFound();
    }

    public function test_seller_logistics_thread_is_private_from_buyer_and_limited_to_assigned_rider(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $logistics = User::factory()->create(['role' => 'logistics', 'status' => 'active']);
        [$rider, $profile] = $this->rider();
        [$otherRider] = $this->rider();
        $order = $this->order($buyer);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Parcel chat item',
            'description' => 'Fixture',
            'price' => 10,
            'stock' => 1,
            'category' => 'Other',
            'status' => 'active',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'seller_id' => $seller->id,
            'quantity' => 1,
            'unit_price' => 10,
            'subtotal' => 10,
        ]);
        $delivery = Delivery::create([
            'order_id' => $order->id,
            'courier_profile_id' => $profile->id,
            'status' => Delivery::OUT_FOR_DELIVERY,
        ]);

        $startResponse = $this->actingAs($logistics, 'sanctum')
            ->postJson("/api/logistics/deliveries/{$delivery->id}/seller-chat")
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $conversationId = $startResponse->json('data.0.id');

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/delivery-chats')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.delivery_id', $delivery->id);

        $this->postJson("/api/seller/delivery-chats/{$conversationId}/messages", [
            'message' => 'The parcel is packed and ready.',
        ])->assertCreated();

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/courier/delivery-chats')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.seller.id', $seller->id);

        $this->actingAs($otherRider, 'sanctum')
            ->getJson('/api/courier/delivery-chats')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/seller/delivery-chats')
            ->assertForbidden();
    }

    private function rider(): array
    {
        $user = User::factory()->create(['role' => 'rider', 'status' => 'active']);
        $profile = CourierProfile::create([
            'user_id' => $user->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
        ]);

        return [$user, $profile];
    }

    private function order(User $buyer): Order
    {
        return Order::create([
            'buyer_id' => $buyer->id,
            'delivery_address' => 'Test delivery address',
            'payment_method' => 'cash_on_delivery',
            'subtotal' => 10,
            'shipping_fee' => 0,
            'total_amount' => 10,
            'status' => 'OUT_FOR_DELIVERY',
        ]);
    }
}
