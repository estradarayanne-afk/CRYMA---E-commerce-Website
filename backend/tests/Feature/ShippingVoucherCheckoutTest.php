<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\CodCollection;
use App\Models\Commission;
use App\Models\Order;
use App\Models\Product;
use App\Models\ShippingZone;
use App\Models\ShippingZoneRate;
use App\Models\ShippingRate;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ShippingVoucherCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_manages_destination_rates_and_non_admins_cannot_access_them(): void
    {
        $this->getJson('/api/admin/shipping-rates')->assertUnauthorized();

        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/admin/shipping-rates')
            ->assertForbidden();

        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $created = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/shipping-rates', [
                'region' => 'Region VI',
                'province' => 'Aklan',
                'fee' => '85.00',
                'is_active' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.fee', '85.00');

        $rateId = $created->json('data.id');
        $this->assertDatabaseHas('shipping_rates', [
            'id' => $rateId,
            'region' => 'Region VI',
            'province' => 'Aklan',
            'fee' => '85.00',
            'is_active' => true,
        ]);

        $this->patchJson("/api/admin/shipping-rates/{$rateId}", [
            'region' => 'Region VI',
            'province' => 'Aklan',
            'fee' => '95.50',
            'is_active' => false,
        ])->assertOk()->assertJsonPath('data.fee', '95.50');

        $this->patchJson("/api/admin/shipping-rates/{$rateId}/status", [
            'is_active' => true,
        ])->assertOk()->assertJsonPath('data.is_active', true);
    }

    public function test_seller_cannot_create_a_platform_shipping_voucher(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/vouchers', [
                'code' => 'SELLERSHIP',
                'scope' => 'shipping',
                'discount_type' => 'fixed',
                'discount_value' => '50.00',
                'minimum_spend' => '0.00',
                'per_buyer_limit' => 1,
                'product_ids' => [],
                'categories' => [],
                'is_active' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.scope', 'product')
            ->assertJsonPath('data.seller_id', $seller->id);
    }

    public function test_checkout_and_shipping_quote_are_blocked_when_a_destination_rate_is_missing(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $address = Address::create([
            'user_id' => $buyer->id,
            'label' => 'home',
            'recipient_name' => 'Test Buyer',
            'phone' => '09171234567',
            'is_default' => true,
            'region' => 'Region VI',
            'province' => 'Aklan',
            'municipality' => 'Kalibo',
            'barangay' => 'Poblacion',
            'street' => 'Main Road',
            'house_number' => '8',
            'postal_code' => '5600',
        ]);
        [, $product] = $this->sellerAndProduct();

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/shipping-quote', [
                'address_id' => $address->id,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['address_id']);

        $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [
                'address_id' => $address->id,
                'delivery_address' => 'Ignored for a saved address',
                'payment_method' => 'cash_on_delivery',
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['address_id']);

        $this->assertSame(0, Order::count());
        $this->assertSame(5, $product->fresh()->stock);
    }

    public function test_production_uses_cryma_rates_and_excludes_unverified_courier_rates(): void
    {
        [$buyer, $address] = $this->createCheckoutBuyer();
        $address->update(['region' => 'National Capital Region (NCR)']);
        [$seller, $product] = $this->sellerAndProduct();
        $seller->sellerPickupAddress()->create([
            'recipient_name' => 'Nora Seller',
            'phone' => '09171234567',
            'region' => 'National Capital Region',
            'province' => 'Metro Manila',
            'municipality' => 'Manila',
            'barangay' => 'Sample',
            'street' => 'Market Street',
            'house_number' => '1',
            'postal_code' => '1000',
        ]);

        $this->assertSame(55, ShippingZoneRate::count());
        $this->assertSame(
            27,
            ShippingZoneRate::query()
                ->where('provider', 'CRYMA Standard')
                ->where('is_active', true)
                ->count(),
        );
        $this->assertSame(
            27,
            ShippingZoneRate::query()
                ->where('provider', 'CRYMA Standard (superseded)')
                ->where('is_active', false)
                ->count(),
        );
        $this->assertSame(
            1,
            ShippingZoneRate::query()
                ->where('provider', 'CRYMA')
                ->where('rate_source', 'courier')
                ->where('is_active', false)
                ->count(),
        );
        $this->app['env'] = 'production';

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/shipping-quote', [
                'address_id' => $address->id,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertOk()
            ->assertJsonPath('data.shipping_fee', '80.00')
            ->assertJsonPath('data.is_provisional', false)
            ->assertJsonPath('data.parcels.0.provider', 'CRYMA Standard');

        $origin = ShippingZone::query()->where('slug', 'luzon')->firstOrFail();
        $destination = ShippingZone::query()->where('slug', 'luzon')->firstOrFail();
        ShippingZoneRate::query()
            ->where('origin_zone_id', $origin->id)
            ->where('destination_zone_id', $destination->id)
            ->where('rate_source', 'cryma')
            ->update(['is_active' => false]);
        ShippingZoneRate::create([
            'origin_zone_id' => $origin->id,
            'destination_zone_id' => $destination->id,
            'provider' => 'Unverified courier',
            'rate_source' => 'courier',
            'min_weight_kg' => '0.000',
            'max_weight_kg' => '1.000',
            'fee' => '45.00',
            'is_provisional' => true,
            'is_active' => true,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/shipping-quote', [
                'address_id' => $address->id,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['address_id']);
    }

    public function test_production_admin_can_activate_cryma_rates_but_not_unverified_courier_rates(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $luzon = ShippingZone::query()->where('slug', 'luzon')->firstOrFail();
        $visayas = ShippingZone::query()->where('slug', 'visayas')->firstOrFail();
        $this->app['env'] = 'production';

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/shipping-zone-rates', [
                'origin_zone_id' => $luzon->id,
                'destination_zone_id' => $visayas->id,
                'provider' => 'CRYMA Test',
                'rate_source' => 'cryma',
                'min_weight_kg' => '0.000',
                'max_weight_kg' => '1.000',
                'fee' => '150.00',
                'min_delivery_days' => 2,
                'max_delivery_days' => 5,
                'is_provisional' => true,
                'is_active' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.rate_source', 'cryma')
            ->assertJsonPath('data.is_provisional', false)
            ->assertJsonPath('data.min_delivery_days', 2)
            ->assertJsonPath('data.max_delivery_days', 5);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/shipping-zone-rates', [
                'origin_zone_id' => $luzon->id,
                'destination_zone_id' => $visayas->id,
                'provider' => 'Unverified courier',
                'rate_source' => 'courier',
                'min_weight_kg' => '0.000',
                'max_weight_kg' => '1.000',
                'fee' => '45.00',
                'is_provisional' => true,
                'is_active' => true,
            ])
            ->assertUnprocessable();
    }

    public function test_checkout_snapshots_route_delivery_days_and_buyer_sees_estimated_dates(): void
    {
        $this->travelTo(now()->setDate(2026, 11, 6)->setTime(9, 0));
        [$buyer, $address] = $this->createCheckoutBuyer();
        [$seller, $product] = $this->sellerAndProduct();
        $seller->sellerPickupAddress()->create([
            'recipient_name' => 'Nora Seller',
            'phone' => '09171234567',
            'region' => 'National Capital Region',
            'province' => 'Metro Manila',
            'municipality' => 'Manila',
            'barangay' => 'Sample',
            'street' => 'Market Street',
            'house_number' => '1',
            'postal_code' => '1000',
        ]);

        $luzon = ShippingZone::query()->where('slug', 'luzon')->firstOrFail();
        $rate = ShippingZoneRate::query()
            ->where('origin_zone_id', $luzon->id)
            ->where('destination_zone_id', $luzon->id)
            ->where('provider', 'CRYMA Standard')
            ->where('is_active', true)
            ->where('min_weight_kg', '<=', 0.500)
            ->where('max_weight_kg', '>=', 0.500)
            ->firstOrFail();
        $rate->update([
            'min_delivery_days' => 2,
            'max_delivery_days' => 5,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/shipping-quote', [
                'address_id' => $address->id,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertOk()
            ->assertJsonPath('data.parcels.0.min_delivery_days', 2)
            ->assertJsonPath('data.parcels.0.max_delivery_days', 5);

        $orderResponse = $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [
                'address_id' => $address->id,
                'delivery_address' => 'Ignored for a saved address',
                'payment_method' => 'cash_on_delivery',
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertCreated();

        $orderId = $orderResponse->json('data.id');
        $this->assertDatabaseHas('order_shipping_charges', [
            'order_id' => $orderId,
            'min_delivery_days' => 2,
            'max_delivery_days' => 5,
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->getJson("/api/orders/{$orderId}")
            ->assertOk()
            ->assertJsonPath('data.delivery_estimate.from', '2026-11-10')
            ->assertJsonPath('data.delivery_estimate.to', '2026-11-13')
            ->assertJsonPath('data.delivery_estimate.min_days', 2)
            ->assertJsonPath('data.delivery_estimate.max_days', 5);
    }

    public function test_product_and_shipping_vouchers_are_recalculated_capped_and_reversed_on_cancellation(): void
    {
        [$buyer, $address] = $this->createCheckoutBuyer();
        [$seller, $product] = $this->sellerAndProduct('200.00');
        $seller->sellerProfile()->create([
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
            'business_name' => 'Nora Home Store',
            'line_of_business' => 'Home goods',
        ]);
        $seller->sellerPickupAddress()->create([
            'recipient_name' => 'Nora Seller',
            'phone' => '09171234567',
            'region' => 'National Capital Region',
            'province' => 'Metro Manila',
            'municipality' => 'Manila',
            'barangay' => 'Sample',
            'street' => 'Market Street',
            'house_number' => '1',
            'postal_code' => '1000',
        ]);
        $luzon = ShippingZone::query()->where('slug', 'luzon')->firstOrFail();
        ShippingZoneRate::query()
            ->where('origin_zone_id', $luzon->id)
            ->where('destination_zone_id', $luzon->id)
            ->where('rate_source', 'cryma')
            ->update(['is_active' => false]);
        ShippingZoneRate::create([
            'origin_zone_id' => $luzon->id,
            'destination_zone_id' => $luzon->id,
            'provider' => 'Test courier',
            'min_weight_kg' => '0.000',
            'max_weight_kg' => '1.000',
            'fee' => '45.00',
            'is_provisional' => true,
            'is_active' => true,
        ]);

        $productVoucher = $this->createVoucher([
            'code' => 'PRODUCT20',
            'discount_value' => '20.00',
        ]);
        $shippingVoucher = $this->createVoucher([
            'code' => 'SHIP100',
            'scope' => 'shipping',
            'discount_value' => '100.00',
            'minimum_spend' => '100.00',
        ]);
        $this->claim($buyer, $productVoucher);
        $this->claim($buyer, $shippingVoucher);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/vouchers/validate', [
                'code' => 'SHIP100',
                'address_id' => $address->id,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertOk()
            ->assertJsonPath('data.scope', 'shipping')
            ->assertJsonPath('data.shipping_fee', '45.00')
            ->assertJsonPath('data.discount_amount', '45.00');

        $orderResponse = $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [
                'address_id' => $address->id,
                'delivery_address' => 'Ignored for a saved address',
                'payment_method' => 'cash_on_delivery',
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'voucher_code' => 'PRODUCT20',
                'shipping_voucher_code' => 'SHIP100',
            ])
            ->assertCreated()
            ->assertJsonPath('data.subtotal', '200.00')
            ->assertJsonPath('data.shipping_fee', '45.00')
            ->assertJsonPath('data.voucher_discount', '20.00')
            ->assertJsonPath('data.shipping_voucher_discount', '45.00')
            ->assertJsonPath('data.total_amount', '180.00')
            ->assertJsonPath('data.seller_storefront_name', 'Nora Home Store')
            ->assertJsonPath('data.checkout_orders.0.seller_storefront_name', 'Nora Home Store');

        $orderId = $orderResponse->json('data.id');
        $this->assertDatabaseHas('voucher_redemptions', [
            'voucher_id' => $productVoucher->id,
            'order_id' => $orderId,
            'discount_amount' => '20.00',
        ]);
        $this->assertDatabaseHas('voucher_redemptions', [
            'voucher_id' => $shippingVoucher->id,
            'order_id' => $orderId,
            'discount_amount' => '45.00',
        ]);
        $this->assertEquals(180, CodCollection::where('order_id', $orderId)->value('expected_amount'));
        $this->assertEquals(180, Commission::where('order_id', $orderId)->value('order_amount'));

        $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/orders/{$orderId}/cancel")
            ->assertOk();
        $this->assertDatabaseMissing('voucher_redemptions', ['order_id' => $orderId]);
        $this->assertSame(0, $productVoucher->fresh()->redemptions()->count());
        $this->assertSame(0, $shippingVoucher->fresh()->redemptions()->count());
    }

    private function createCheckoutBuyer(): array
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $address = $this->checkoutAddressFor($buyer);
        return [$buyer, $address];
    }

    private function sellerAndProduct(string $price = '20.00'): array
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Shipping voucher test item',
            'description' => 'Shipping checkout fixture',
            'price' => $price,
            'stock' => 5,
            'weight_kg' => '0.500',
            'category' => 'Pet Supplies',
            'status' => 'active',
            'review_status' => 'approved',
        ]);

        return [$seller, $product];
    }

    private function createVoucher(array $overrides = []): Voucher
    {
        return Voucher::create(array_merge([
            'code' => 'SHIPPINGTEST',
            'scope' => 'product',
            'description' => 'Voucher test',
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
        ], $overrides));
    }

    private function claim(User $buyer, Voucher $voucher): void
    {
        $this->actingAs($buyer, 'sanctum')
            ->postJson("/api/buyer/vouchers/{$voucher->id}/claim")
            ->assertCreated();
    }
}
