<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PlatformConfig;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PlatformCommissionConfigTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    private function buyerAndProduct(string $price, int $stock): array
    {
        $buyer  = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->checkoutAddressFor($buyer);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $product = Product::create([
            'seller_id'   => $seller->id,
            'name'        => 'Commission test product',
            'description' => 'Test fixture',
            'price'       => $price,
            'stock'       => $stock,
            'category'    => 'Electronics',
            'status'      => 'active',
        ]);

        return [$buyer, $product];
    }

    private function checkout(User $buyer, Product $product, int $quantity = 1): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [
                'delivery_address' => '123 Test Street, Manila',
                'payment_method'   => 'cash_on_delivery',
                'items'            => [['product_id' => $product->id, 'quantity' => $quantity]],
            ]);
    }

    // -------------------------------------------------------------------------
    // GET endpoint
    // -------------------------------------------------------------------------

    public function test_admin_can_retrieve_commission_rate(): void
    {
        $admin = $this->admin();

        PlatformConfig::setValue('commission_rate_percent', '10.00');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/settings/commission-rate')
            ->assertOk()
            ->assertJsonPath('data.rate', 10);
    }

    public function test_commission_rate_defaults_to_ten_when_config_missing(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/settings/commission-rate')
            ->assertOk()
            ->assertJsonPath('data.rate', 10);
    }

    public function test_non_admin_cannot_access_commission_rate_endpoint(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/admin/settings/commission-rate')
            ->assertForbidden();
    }

    // -------------------------------------------------------------------------
    // PATCH endpoint validation
    // -------------------------------------------------------------------------

    public function test_admin_can_update_commission_rate(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/settings/commission-rate', ['rate' => 15.00])
            ->assertOk()
            ->assertJsonPath('data.rate', 15);

        $this->assertSame('15.00', PlatformConfig::getValue('commission_rate_percent'));
    }

    public function test_commission_rate_update_rejects_negative_value(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/settings/commission-rate', ['rate' => -1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['rate']);
    }

    public function test_commission_rate_update_rejects_value_above_100(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/settings/commission-rate', ['rate' => 100.01])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['rate']);
    }

    public function test_commission_rate_update_rejects_non_numeric(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/settings/commission-rate', ['rate' => 'abc'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['rate']);
    }

    // -------------------------------------------------------------------------
    // Checkout uses configured rate
    // -------------------------------------------------------------------------

    public function test_checkout_commission_uses_configured_rate(): void
    {
        $admin  = $this->admin();
        [$buyer, $product] = $this->buyerAndProduct('100.00', 5);

        // Set rate to 15%.
        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/settings/commission-rate', ['rate' => 15.00])
            ->assertOk();

        $response = $this->checkout($buyer, $product)
            ->assertCreated();

        $orderId = $response->json('data.id');
        $this->assertDatabaseHas('commissions', [
            'order_id'        => $orderId,
            'commission_rate' => '15.00',
            'commission_amount' => '15.00',  // 15% of ₱100
            'seller_earnings'   => '85.00',  // ₱100 - ₱15
        ]);
    }

    public function test_checkout_commission_uses_default_ten_percent_when_no_config(): void
    {
        [$buyer, $product] = $this->buyerAndProduct('200.00', 3);

        $response = $this->checkout($buyer, $product)
            ->assertCreated();

        $orderId = $response->json('data.id');
        $this->assertDatabaseHas('commissions', [
            'order_id'          => $orderId,
            'commission_rate'   => '10.00',
            'commission_amount' => '20.00',  // 10% of ₱200
            'seller_earnings'   => '180.00',
        ]);
    }

    public function test_changing_rate_affects_next_checkout_not_previous_orders(): void
    {
        $admin = $this->admin();
        [$buyer, $product] = $this->buyerAndProduct('100.00', 5);

        // First order at default 10%.
        $first = $this->checkout($buyer, $product)->assertCreated();

        // Change rate to 20%.
        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/settings/commission-rate', ['rate' => 20.00]);

        // Second order at new 20%.
        $second = $this->checkout($buyer, $product)->assertCreated();

        $this->assertDatabaseHas('commissions', [
            'order_id'        => $first->json('data.id'),
            'commission_rate' => '10.00',
        ]);
        $this->assertDatabaseHas('commissions', [
            'order_id'        => $second->json('data.id'),
            'commission_rate' => '20.00',
        ]);
    }
}
