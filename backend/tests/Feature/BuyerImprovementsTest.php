<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\CodCollection;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductDailyMetric;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BuyerImprovementsTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_exposure_and_detail_views_are_aggregated_without_buyer_identity(): void
    {
        [$seller, $product] = $this->sellerAndProduct();

        $this->postJson('/api/products/impressions', [
            'product_ids' => [$product->id],
        ])->assertOk();
        $this->postJson("/api/products/{$product->id}/view")->assertOk();
        $this->postJson("/api/products/{$product->id}/view")->assertOk();

        $metric = ProductDailyMetric::firstOrFail();
        $this->assertSame(1, $metric->impressions);
        $this->assertSame(2, $metric->detail_views);
        $this->assertSame($seller->id, $metric->seller_id);
        $this->assertFalse(in_array('buyer_id', Schema::getColumnListing('product_daily_metrics'), true));
    }

    public function test_stock_check_returns_current_variant_stock_and_marks_missing_products_unavailable(): void
    {
        [, $product] = $this->sellerAndProduct();
        $variantId = 'c4dece55-a7a5-4c44-a5e5-55504c469067';
        $product->update([
            'variants' => [[
                'id' => $variantId,
                'color' => 'Red',
                'size' => 'M',
                'price' => '100.00',
                'stock' => 3,
            ]],
        ]);

        $this->postJson('/api/products/availability', [
            'items' => [
                ['product_id' => $product->id, 'variant_id' => $variantId],
                ['product_id' => 999999, 'variant_id' => null],
            ],
        ])->assertOk()
            ->assertJsonPath('data.items.0.stock', 3)
            ->assertJsonPath('data.items.0.available', true)
            ->assertJsonPath('data.items.1.stock', 0)
            ->assertJsonPath('data.items.1.product_available', false);
    }

    public function test_buyer_can_submit_an_order_linked_delivery_issue_and_not_access_another_buyers_order(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $otherBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $order = $this->orderFor($buyer);
        $otherOrder = $this->orderFor($otherBuyer);

        $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/orders/{$order->id}/delivery-issues", [
                'issue_type' => 'late_delivery',
                'description' => 'The parcel has not moved for several days.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('complaints', [
            'complainant_id' => $buyer->id,
            'order_id' => $order->id,
            'category' => 'delivery_issue',
            'status' => 'pending',
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/orders/{$otherOrder->id}/delivery-issues", [
                'issue_type' => 'wrong_delivery',
                'description' => 'This is not my parcel.',
            ])
            ->assertNotFound();

        $this->assertSame(1, Complaint::count());
    }

    public function test_order_details_show_cod_payment_status_from_the_collection_record(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $order = $this->orderFor($buyer);

        $this->actingAs($buyer, 'sanctum')
            ->getJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'due_on_delivery')
            ->assertJsonPath('data.payment_status_label', 'Pay on delivery');

        CodCollection::create([
            'order_id' => $order->id,
            'expected_amount' => '100.00',
            'collected_amount' => '100.00',
            'status' => 'collected',
            'collected_at' => now(),
        ]);

        $this->getJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.payment_status_label', 'Paid at delivery')
            ->assertJsonMissingPath('data.cod_collection');
    }

    public function test_buyer_push_token_can_be_registered_and_removed_only_by_its_owner(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $otherBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $token = 'fcm-test-token-123456789';

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/push-tokens', [
                'token' => $token,
                'platform' => 'android',
            ])
            ->assertOk();
        $this->assertDatabaseHas('buyer_push_tokens', [
            'user_id' => $buyer->id,
            'token' => $token,
            'platform' => 'android',
        ]);

        $this->actingAs($otherBuyer, 'sanctum')
            ->deleteJson('/api/buyer/push-tokens', ['token' => $token])
            ->assertOk();
        $this->assertDatabaseHas('buyer_push_tokens', [
            'user_id' => $buyer->id,
            'token' => $token,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->deleteJson('/api/buyer/push-tokens', ['token' => $token])
            ->assertOk();
        $this->assertDatabaseMissing('buyer_push_tokens', ['token' => $token]);
    }

    public function test_product_exposure_report_is_admin_only_and_aggregates_seller_metrics(): void
    {
        [, $product] = $this->sellerAndProduct();
        ProductDailyMetric::create([
            'product_id' => $product->id,
            'seller_id' => $product->seller_id,
            'product_name' => $product->name,
            'seller_name' => 'Test Store',
            'metric_date' => now('Asia/Manila')->toDateString(),
            'impressions' => 4,
            'detail_views' => 2,
            'purchase_count' => 1,
            'units_sold' => 3,
        ]);

        $this->actingAs(User::factory()->create(['role' => 'buyer', 'status' => 'active']), 'sanctum')
            ->getJson('/api/admin/product-exposure')
            ->assertForbidden();

        $this->actingAs(User::factory()->create(['role' => 'admin', 'status' => 'active']), 'sanctum')
            ->getJson('/api/admin/product-exposure')
            ->assertOk()
            ->assertJsonPath('data.products.data.0.impressions', 4)
            ->assertJsonPath('data.products.data.0.detail_views', 2)
            ->assertJsonPath('data.products.data.0.units_sold', 3);
    }

    private function sellerAndProduct(): array
    {
        $seller = User::factory()->create([
            'role' => 'seller',
            'status' => 'active',
            'first_name' => 'Test',
            'last_name' => 'Seller',
        ]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Metric test product',
            'description' => 'Product used by buyer improvement tests.',
            'price' => '100.00',
            'stock' => 5,
            'weight_kg' => '0.500',
            'category' => 'Pet Supplies',
            'status' => 'active',
            'review_status' => 'approved',
        ]);

        return [$seller, $product];
    }

    private function orderFor(User $buyer): Order
    {
        return Order::create([
            'buyer_id' => $buyer->id,
            'delivery_address' => 'Test address',
            'payment_method' => 'cash_on_delivery',
            'subtotal' => '100.00',
            'shipping_fee' => '0.00',
            'total_amount' => '100.00',
            'status' => 'in_transit',
        ]);
    }
}
