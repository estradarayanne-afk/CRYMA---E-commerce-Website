<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Address;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderCheckoutIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_uses_server_prices_and_stock_and_ignores_client_totals(): void
    {
        [$buyer, $product] = $this->buyerAndProduct(price: '49.95', stock: 5);

        $response = $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', '06b3a2eb-7ccd-4e56-a10b-cce497a011ac')
            ->postJson('/api/orders', array_merge($this->checkoutPayload($product, 2), [
                'subtotal' => 0.01,
                'shipping_fee' => 999,
                'total_amount' => 0.01,
            ]));

        $response->assertCreated()
            ->assertJsonPath('data.subtotal', '99.90')
            ->assertJsonPath('data.shipping_fee', 0)
            ->assertJsonPath('data.total_amount', '99.90')
            ->assertJsonPath('data.payment_method', 'cash_on_delivery')
            ->assertJsonMissingPath('data.checkout_idempotency_key')
            ->assertJsonMissingPath('data.checkout_request_hash');

        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('data.id'),
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => '49.95',
            'subtotal' => '99.90',
        ]);
        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_checkout_uses_the_seller_discounted_price(): void
    {
        [$buyer, $product] = $this->buyerAndProduct(price: '49.95', stock: 5);
        $product->update(['discounted_price' => '39.95']);

        $response = $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', 'cd2f4fe5-4bb4-40fd-97a3-b16b2141b492')
            ->postJson('/api/orders', $this->checkoutPayload($product, 2));

        $response->assertCreated()
            ->assertJsonPath('data.subtotal', '79.90')
            ->assertJsonPath('data.total_amount', '79.90');

        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('data.id'),
            'product_id' => $product->id,
            'unit_price' => '39.95',
            'subtotal' => '79.90',
        ]);
    }

    public function test_repeated_checkout_key_returns_the_same_order_without_decrementing_stock_twice(): void
    {
        [$buyer, $product] = $this->buyerAndProduct(price: '25.00', stock: 4);
        $key = '9d2fc365-f9b6-4146-b10c-187c291c4e7e';
        $payload = $this->checkoutPayload($product, 2);

        $first = $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/orders', $payload)
            ->assertCreated();

        $second = $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/orders', $payload)
            ->assertOk()
            ->assertJsonPath('data.id', $first->json('data.id'));

        $this->assertSame(1, Order::count());
        $this->assertSame(2, $product->fresh()->stock);
    }

    public function test_same_idempotency_key_is_scoped_to_each_buyer(): void
    {
        [$firstBuyer, $product] = $this->buyerAndProduct(price: '25.00', stock: 3);
        $secondBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $key = '0546b0c4-b3be-4f67-b445-57907223ea88';
        $payload = $this->checkoutPayload($product, 1);

        $firstOrder = $this->actingAs($firstBuyer, 'sanctum')
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/orders', $payload)
            ->assertCreated();

        $secondOrder = $this->actingAs($secondBuyer, 'sanctum')
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/orders', $payload)
            ->assertCreated();

        $this->assertNotSame($firstOrder->json('data.id'), $secondOrder->json('data.id'));
        $this->assertSame(2, Order::count());
        $this->assertSame(1, $product->fresh()->stock);
    }

    public function test_existing_orders_with_null_idempotency_keys_can_coexist(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $orderFields = [
            'buyer_id' => $buyer->id,
            'delivery_address' => 'Existing order address',
            'payment_method' => 'cash_on_delivery',
            'subtotal' => 10,
            'shipping_fee' => 0,
            'total_amount' => 10,
            'status' => 'pending',
        ];

        Order::create($orderFields);
        Order::create($orderFields);

        $this->assertSame(2, Order::count());
        $this->assertSame(2, Order::whereNull('checkout_idempotency_key')->count());
    }

    public function test_checkout_requires_an_idempotency_key(): void
    {
        [$buyer, $product] = $this->buyerAndProduct(price: '25.00', stock: 3);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/orders', $this->checkoutPayload($product, 1))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['idempotency_key']);

        $this->assertSame(0, Order::count());
        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_idempotency_key_cannot_be_reused_for_different_checkout_details(): void
    {
        [$buyer, $product] = $this->buyerAndProduct(price: '25.00', stock: 5);
        $key = '98d3904c-4980-421e-abef-e3fccb349b9e';

        $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/orders', $this->checkoutPayload($product, 1))
            ->assertCreated();

        $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/orders', $this->checkoutPayload($product, 2))
            ->assertStatus(409)
            ->assertJsonPath('code', 'checkout_key_conflict');

        $this->assertSame(1, Order::count());
        $this->assertSame(4, $product->fresh()->stock);
    }

    public function test_checkout_rejects_inactive_products_and_insufficient_stock_without_partial_orders(): void
    {
        [$buyer, $product] = $this->buyerAndProduct(price: '25.00', stock: 1);
        $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', 'a0501fd4-0a6f-45cb-9965-115f954e2da4')
            ->postJson('/api/orders', $this->checkoutPayload($product, 2))
            ->assertUnprocessable();

        $product->update(['status' => 'inactive']);
        $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', '3359657a-5103-4c20-b0c6-1d7e65a67772')
            ->postJson('/api/orders', $this->checkoutPayload($product, 1))
            ->assertUnprocessable();

        $this->assertSame(0, Order::count());
        $this->assertSame(1, $product->fresh()->stock);
    }

    public function test_gcash_remains_a_payment_selection_and_does_not_mark_order_paid(): void
    {
        [$buyer, $product] = $this->buyerAndProduct(price: '10.00', stock: 2);

        $response = $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', 'c7654176-c253-4a6e-92d9-69a1c490a67f')
            ->postJson('/api/orders', array_merge($this->checkoutPayload($product, 1), [
                'payment_method' => 'gcash',
            ]))
            ->assertCreated()
            ->assertJsonPath('data.payment_method', 'gcash')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonMissingPath('data.payment_status');

        $this->assertDatabaseHas('orders', [
            'id' => $response->json('data.id'),
            'payment_method' => 'gcash',
            'status' => 'pending',
        ]);
    }

    public function test_checkout_rejects_totals_that_exceed_the_orders_decimal_capacity(): void
    {
        [$buyer, $product] = $this->buyerAndProduct(price: '9999999999.99', stock: 2);

        $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', 'fbe5089b-fdd9-46ad-9e28-e6e80c432a4c')
            ->postJson('/api/orders', $this->checkoutPayload($product, 2))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'A product price is invalid or the order total exceeds the supported amount.');

        $this->assertSame(0, Order::count());
        $this->assertSame(2, $product->fresh()->stock);

        $product->update(['price' => '-0.01']);
        $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', 'c55790a1-d5ac-41ca-af5b-165ddab47b14')
            ->postJson('/api/orders', $this->checkoutPayload($product, 1))
            ->assertUnprocessable();

        $this->assertSame(0, Order::count());
        $this->assertSame(2, $product->fresh()->stock);
    }

    public function test_admin_order_status_cannot_be_set_to_paid(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'delivery_address' => 'Test address',
            'payment_method' => 'gcash',
            'subtotal' => 100,
            'shipping_fee' => 0,
            'total_amount' => 100,
            'status' => 'pending',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'PAID'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_admin_cancellation_restores_stock_once_and_cannot_be_reopened(): void
    {
        [$buyer, $product] = $this->buyerAndProduct(price: '25.00', stock: 3);
        $order = Order::create([
            'buyer_id' => $buyer->id,
            'delivery_address' => 'Test address',
            'payment_method' => 'cash_on_delivery',
            'subtotal' => 50,
            'shipping_fee' => 0,
            'total_amount' => 50,
            'status' => 'pending',
        ]);
        $order->items()->create([
            'product_id' => $product->id,
            'seller_id' => $product->seller_id,
            'quantity' => 2,
            'unit_price' => '25.00',
            'subtotal' => '50.00',
        ]);
        $product->decrement('stock', 2);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'CANCELLED'])
            ->assertOk();

        $this->assertSame(3, $product->fresh()->stock);

        $this->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'CANCELLED'])
            ->assertOk();
        $this->assertSame(3, $product->fresh()->stock);

        $this->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'PENDING'])
            ->assertStatus(409);
        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_checkout_uses_an_owned_saved_address_snapshot(): void
    {
        [$buyer, $product] = $this->buyerAndProduct('12.00', 4);
        $address = Address::create([
            'label' => 'home',
            'recipient_name' => 'Ana Maria Dela Cruz',
            'phone' => '+639171234567',
            'is_default' => true,
            'user_id' => $buyer->id, 'region' => 'Region VII', 'province' => 'Cebu',
            'municipality' => 'Carmen', 'barangay' => 'Luyang', 'street' => 'Market Road',
            'house_number' => '18', 'postal_code' => '6005',
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', '70f9d981-2b65-42bb-ae15-7a426f67f5a4')
            ->postJson('/api/orders', [
                ...$this->checkoutPayload($product, 1),
                'address_id' => $address->id,
                'delivery_address' => 'Client supplied address is ignored for saved selection',
            ])
            ->assertCreated();

        $order = Order::firstOrFail();
        $snapshot = 'Home, Recipient: Ana Maria Dela Cruz, Contact: +639171234567, 18, Market Road, Luyang, Carmen, Cebu, Region VII, 6005';
        $this->assertSame($snapshot, $order->delivery_address);

        $address->update([
            'recipient_name' => 'Changed Name',
            'phone' => '+639181234567',
            'street' => 'New Street',
        ]);
        $address->delete();
        $this->assertSame($snapshot, $order->fresh()->delivery_address);

        $otherBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $foreignAddress = Address::create([
            'user_id' => $otherBuyer->id, 'province' => 'Cebu', 'municipality' => 'Carmen', 'barangay' => 'Poblacion',
        ]);
        $this->withHeader('Idempotency-Key', '605f3a0d-0fa4-465c-a5b7-8e3c64b84dbc')
            ->postJson('/api/orders', [
                ...$this->checkoutPayload($product, 1),
                'address_id' => $foreignAddress->id,
            ])
            ->assertNotFound();
        $this->assertSame(1, Order::count());
    }

    private function buyerAndProduct(string $price, int $stock): array
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Test product',
            'description' => 'Checkout fixture',
            'price' => $price,
            'stock' => $stock,
            'category' => 'Pet Supplies',
            'status' => 'active',
        ]);

        return [$buyer, $product];
    }

    private function checkoutPayload(Product $product, int $quantity): array
    {
        return [
            'delivery_address' => '123 Example Street, Barangay Sample, Manila',
            'payment_method' => 'cash_on_delivery',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => $quantity,
            ]],
        ];
    }
}
