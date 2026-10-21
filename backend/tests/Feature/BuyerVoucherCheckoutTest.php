<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class BuyerVoucherCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_recalculates_fixed_discount_and_snapshots_redemption_ignoring_client_totals(): void
    {
        [$buyer, $product] = $this->buyerAndProduct('120.00', 4);
        $voucher = $this->voucher([
            'code' => 'SAVE20',
            'discount_type' => 'fixed',
            'discount_value' => '20.00',
            'minimum_spend' => '100.00',
        ]);

        $response = $this->checkout($buyer, $product, [
            'voucher_code' => ' save20 ',
            'subtotal' => 0.01,
            'total_amount' => 0.01,
            'voucher_discount' => 999,
        ])->assertCreated()
            ->assertJsonPath('data.subtotal', '120.00')
            ->assertJsonPath('data.voucher_code', $voucher->code)
            ->assertJsonPath('data.voucher_discount', '20.00')
            ->assertJsonPath('data.total_amount', '100.00');

        $orderId = $response->json('data.id');
        $this->assertDatabaseHas('voucher_redemptions', [
            'voucher_id' => $voucher->id,
            'buyer_id' => $buyer->id,
            'order_id' => $orderId,
            'discount_amount' => '20.00',
        ]);
        $voucher->update(['code' => 'CHANGED', 'discount_value' => '99.00', 'is_active' => false]);
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'voucher_code' => 'SAVE20',
            'voucher_discount' => '20.00',
            'total_amount' => '100.00',
        ]);
    }

    public function test_percentage_discount_honors_maximum_discount_and_minimum_spend(): void
    {
        [$buyer, $product] = $this->buyerAndProduct('250.00', 2);
        $this->voucher([
            'code' => 'PERCENT',
            'discount_type' => 'percentage',
            'discount_value' => '20.00',
            'minimum_spend' => '200.00',
            'maximum_discount' => '30.00',
        ]);

        $this->checkout($buyer, $product, ['voucher_code' => 'PERCENT'])
            ->assertCreated()
            ->assertJsonPath('data.voucher_discount', '30.00')
            ->assertJsonPath('data.total_amount', '220.00');

        [$buyerBelow, $productBelow] = $this->buyerAndProduct('199.99', 2);
        $this->checkout($buyerBelow, $productBelow, ['voucher_code' => 'PERCENT'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['voucher_code']);
        $this->assertSame(1, Order::count());
    }

    public function test_invalid_expired_inactive_and_unknown_codes_are_rejected_without_order_or_stock_change(): void
    {
        [$buyer, $product] = $this->buyerAndProduct('50.00', 3);
        $this->voucher(['code' => 'EXPIRED', 'expires_at' => now()->subMinute()]);
        $this->voucher(['code' => 'INACTIVE', 'is_active' => false]);

        foreach (['missing', 'EXPIRED', 'INACTIVE'] as $code) {
            $this->checkout($buyer, $product, ['voucher_code' => $code])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['voucher_code']);
        }

        $this->assertSame(0, Order::count());
        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_global_and_per_buyer_usage_limits_are_enforced(): void
    {
        [$firstBuyer, $product] = $this->buyerAndProduct('25.00', 5);
        $voucher = $this->voucher([
            'code' => 'LIMITED',
            'usage_limit' => 2,
            'per_buyer_limit' => 1,
        ]);

        $this->checkout($firstBuyer, $product, ['voucher_code' => 'LIMITED'])->assertCreated();
        $this->checkout($firstBuyer, $product, ['voucher_code' => 'LIMITED'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['voucher_code']);

        $secondBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->checkout($secondBuyer, $product, ['voucher_code' => 'LIMITED'])->assertCreated();

        $thirdBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->checkout($thirdBuyer, $product, ['voucher_code' => 'LIMITED'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['voucher_code']);

        $this->assertSame(2, $voucher->redemptions()->count());
        $this->assertSame(2, Order::count());
    }

    public function test_product_restrictions_apply_discount_only_to_eligible_merchandise(): void
    {
        [$buyer, $eligible] = $this->buyerAndProduct('20.00', 2);
        $otherProduct = Product::create([
            'seller_id' => $eligible->seller_id,
            'name' => 'Other item',
            'description' => 'Other category fixture',
            'price' => '30.00',
            'stock' => 2,
            'category' => 'Home',
            'status' => 'active',
        ]);
        $this->voucher([
            'code' => 'PETONLY',
            'discount_type' => 'percentage',
            'discount_value' => '50.00',
            'product_ids' => [$eligible->id],
            'minimum_spend' => '20.00',
        ]);

        $response = $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [
                ...$this->checkoutPayload($eligible, 1),
                'items' => [
                    ['product_id' => $eligible->id, 'quantity' => 1],
                    ['product_id' => $otherProduct->id, 'quantity' => 1],
                ],
                'voucher_code' => 'PETONLY',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.subtotal', '50.00')
            ->assertJsonPath('data.voucher_discount', '10.00')
            ->assertJsonPath('data.total_amount', '40.00');
    }

    public function test_validation_endpoint_requires_buyer_authentication_and_uses_server_product_prices(): void
    {
        [, $product] = $this->buyerAndProduct('45.00', 2);
        $product->update(['discounted_price' => '35.00']);
        $this->voucher(['code' => 'PREVIEW']);

        $this->postJson('/api/buyer/vouchers/validate', [
            'code' => 'PREVIEW',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertUnauthorized();

        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/vouchers/validate', [
                'code' => 'PREVIEW',
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'total_amount' => 0,
            ])
            ->assertOk()
            ->assertJsonPath('data.eligible_subtotal', '35.00')
            ->assertJsonPath('data.discount_amount', '10.00');
    }

    public function test_duplicate_submission_with_same_idempotency_key_creates_one_order_and_redemption(): void
    {
        [$buyer, $product] = $this->buyerAndProduct('20.00', 4);
        $voucher = $this->voucher(['code' => 'ONEUSE', 'per_buyer_limit' => 1]);
        $key = '6ac35fa7-081c-4cd8-9f5b-202610210001';
        $payload = [...$this->checkoutPayload($product, 1), 'voucher_code' => 'ONEUSE'];

        $first = $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/orders', $payload)
            ->assertCreated();
        $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/orders', $payload)
            ->assertOk()
            ->assertJsonPath('data.id', $first->json('data.id'));

        $this->assertSame(1, Order::count());
        $this->assertSame(1, $voucher->redemptions()->count());
        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_non_buyer_cannot_list_vouchers(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $this->actingAs($seller, 'sanctum')->getJson('/api/buyer/vouchers')->assertForbidden();
    }

    public function test_voucher_list_reports_buyer_statuses_without_exposing_inactive_unclaimed_codes(): void
    {
        [$buyer, $product] = $this->buyerAndProduct('25.00', 3);
        $this->voucher(['code' => 'AVAILABLE']);
        $this->voucher(['code' => 'EXPIREDLIST', 'expires_at' => now()->subMinute()]);
        $this->voucher(['code' => 'UPCOMING', 'starts_at' => now()->addDay()]);
        $this->voucher(['code' => 'DRAFT', 'is_active' => false]);
        $this->voucher(['code' => 'USEDLIST']);
        $this->checkout($buyer, $product, ['voucher_code' => 'USEDLIST'])->assertCreated();

        $response = $this->actingAs($buyer, 'sanctum')->getJson('/api/buyer/vouchers')->assertOk();
        $statuses = collect($response->json('data'))->keyBy('code');
        $this->assertSame('available', $statuses['AVAILABLE']['buyer_status']);
        $this->assertSame('expired', $statuses['EXPIREDLIST']['buyer_status']);
        $this->assertSame('ineligible', $statuses['UPCOMING']['buyer_status']);
        $this->assertSame('used', $statuses['USEDLIST']['buyer_status']);
        $this->assertArrayNotHasKey('DRAFT', $statuses->all());
    }

    private function buyerAndProduct(string $price, int $stock): array
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Test product',
            'description' => 'Voucher fixture',
            'price' => $price,
            'stock' => $stock,
            'category' => 'Pet Supplies',
            'status' => 'active',
        ]);

        return [$buyer, $product];
    }

    private function voucher(array $attributes = []): Voucher
    {
        return Voucher::create(array_merge([
            'code' => 'WELCOME',
            'description' => 'Test voucher',
            'discount_type' => 'fixed',
            'discount_value' => '10.00',
            'minimum_spend' => '0.00',
            'maximum_discount' => null,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(7),
            'usage_limit' => null,
            'per_buyer_limit' => 1,
            'product_ids' => null,
            'categories' => null,
            'is_active' => true,
        ], $attributes));
    }

    private function checkout(User $buyer, Product $product, array $extra = [])
    {
        return $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [
                ...$this->checkoutPayload($product, 1),
                ...$extra,
            ]);
    }

    private function checkoutPayload(Product $product, int $quantity): array
    {
        return [
            'delivery_address' => '123 Example Street, Barangay Sample, Manila',
            'payment_method' => 'cash_on_delivery',
            'items' => [['product_id' => $product->id, 'quantity' => $quantity]],
        ];
    }
}
