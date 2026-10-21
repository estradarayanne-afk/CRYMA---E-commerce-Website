<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminVoucherManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_voucher_management_requires_an_authenticated_admin(): void
    {
        $this->getJson('/api/admin/vouchers')->assertUnauthorized();

        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/admin/vouchers')
            ->assertForbidden();
        $this->postJson('/api/admin/vouchers', $this->payload())
            ->assertForbidden();

        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $voucher = $this->voucher();
        $this->actingAs($buyer, 'sanctum')
            ->getJson("/api/admin/vouchers/{$voucher->id}")
            ->assertForbidden();
        $this->patchJson("/api/admin/vouchers/{$voucher->id}", $this->payload())
            ->assertForbidden();
        $this->patchJson("/api/admin/vouchers/{$voucher->id}/status", ['is_active' => false])
            ->assertForbidden();
    }

    public function test_admin_can_create_search_filter_and_view_voucher_records(): void
    {
        $admin = $this->admin();
        $this->buyerAndProduct();
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/vouchers', $this->payload([
                'code' => ' spring_20 ',
                'discount_type' => 'percentage',
                'discount_value' => '20.00',
                'maximum_discount' => '50.00',
                'categories' => ['Pet Supplies'],
                'is_active' => true,
            ]))
            ->assertCreated()
            ->assertJsonPath('data.code', 'SPRING_20')
            ->assertJsonPath('data.discount_type', 'percentage');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/vouchers?search=spring&type=percentage&status=active')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.code', 'SPRING_20');
    }

    public function test_admin_voucher_validation_rejects_duplicate_codes_invalid_rules_and_unknown_products(): void
    {
        $admin = $this->admin();
        $this->voucher(['code' => 'EXISTING']);
        [, $product] = $this->buyerAndProduct();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/vouchers', $this->payload(['code' => 'existing']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        $this->postJson('/api/admin/vouchers', $this->payload([
            'discount_type' => 'percentage',
            'discount_value' => '100.01',
            'minimum_spend' => '-1',
            'starts_at' => now()->addDays(2)->toIso8601String(),
            'expires_at' => now()->addDay()->toIso8601String(),
            'usage_limit' => 0,
            'per_buyer_limit' => 0,
            'product_ids' => [999999],
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'discount_value',
                'minimum_spend',
                'usage_limit',
                'per_buyer_limit',
                'product_ids.0',
                'expires_at',
            ]);

        $this->postJson('/api/admin/vouchers', $this->payload([
            'product_ids' => [$product->id, $product->id],
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['product_ids.1']);

        $this->assertSame(1, Voucher::count());
    }

    public function test_admin_can_edit_voucher_and_change_its_enabled_state(): void
    {
        $admin = $this->admin();
        $voucher = $this->voucher(['code' => 'OLD', 'is_active' => false]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/vouchers/{$voucher->id}", $this->payload([
                'code' => 'NEW',
                'discount_value' => '25.50',
                'minimum_spend' => '75.00',
                'is_active' => true,
            ]))
            ->assertOk()
            ->assertJsonPath('data.code', 'NEW')
            ->assertJsonPath('data.discount_value', '25.50');

        $this->patchJson("/api/admin/vouchers/{$voucher->id}/status", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('vouchers', [
            'id' => $voucher->id,
            'code' => 'NEW',
            'minimum_spend' => '75.00',
            'is_active' => false,
        ]);
    }

    public function test_voucher_edit_cannot_lower_limits_below_recorded_redemptions(): void
    {
        $admin = $this->admin();
        [$buyer, $product] = $this->buyerAndProduct();
        $voucher = $this->voucher([
            'code' => 'USED',
            'usage_limit' => 2,
            'per_buyer_limit' => 2,
        ]);
        $this->checkout($buyer, $product, 'USED')->assertCreated();
        $this->checkout($buyer, $product, 'USED')->assertCreated();
        $payload = $this->payload([
            'usage_limit' => 0,
            'per_buyer_limit' => 1,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/vouchers/{$voucher->id}", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['usage_limit']);

        $this->patchJson("/api/admin/vouchers/{$voucher->id}", $this->payload([
            'usage_limit' => 2,
            'per_buyer_limit' => 1,
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_buyer_limit']);
    }

    public function test_admin_created_vouchers_are_visible_to_buyers_and_disabled_codes_fail_checkout(): void
    {
        $admin = $this->admin();
        [$buyer, $product] = $this->buyerAndProduct();
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/vouchers', $this->payload([
                'code' => 'BUYERDEAL',
                'discount_type' => 'fixed',
                'discount_value' => '8.00',
                'is_active' => true,
            ]))
            ->assertCreated();

        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/buyer/vouchers')
            ->assertOk()
            ->assertJsonPath('data.0.code', 'BUYERDEAL')
            ->assertJsonPath('data.0.buyer_status', 'available');

        $voucher = Voucher::where('code', 'BUYERDEAL')->firstOrFail();
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/vouchers/{$voucher->id}/status", ['is_active' => false])
            ->assertOk();

        $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [
                ...$this->checkoutPayload($product),
                'voucher_code' => 'BUYERDEAL',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['voucher_code']);

        $this->assertSame(0, Order::count());
        $this->assertSame(4, $product->fresh()->stock);
    }

    public function test_scheduled_expired_and_exhausted_vouchers_are_filtered_and_rejected_at_checkout(): void
    {
        $admin = $this->admin();
        [$firstBuyer, $product] = $this->buyerAndProduct();
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/vouchers', $this->payload([
                'code' => 'SCHEDULED',
                'starts_at' => now()->addDay()->toIso8601String(),
                'is_active' => true,
            ]))
            ->assertCreated();
        $this->postJson('/api/admin/vouchers', $this->payload([
            'code' => 'PAST',
            'expires_at' => now()->subDay()->toIso8601String(),
            'is_active' => true,
        ]))->assertCreated();
        $this->postJson('/api/admin/vouchers', $this->payload([
            'code' => 'ONEONLY',
            'usage_limit' => 1,
            'is_active' => true,
        ]))->assertCreated();

        $this->actingAs($firstBuyer, 'sanctum')
            ->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [...$this->checkoutPayload($product), 'voucher_code' => 'SCHEDULED'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['voucher_code']);
        $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [...$this->checkoutPayload($product), 'voucher_code' => 'PAST'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['voucher_code']);
        $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [...$this->checkoutPayload($product), 'voucher_code' => 'ONEONLY'])
            ->assertCreated();

        $secondBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->actingAs($secondBuyer, 'sanctum')
            ->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [...$this->checkoutPayload($product), 'voucher_code' => 'ONEONLY'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['voucher_code']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/vouchers?status=upcoming')
            ->assertJsonPath('data.data.0.code', 'SCHEDULED');
        $this->getJson('/api/admin/vouchers?status=expired')
            ->assertJsonPath('data.data.0.code', 'PAST');
        $this->getJson('/api/admin/vouchers?status=exhausted')
            ->assertJsonPath('data.data.0.code', 'ONEONLY');
    }

    public function test_redemption_details_do_not_expose_buyer_profile_and_order_snapshots_survive_voucher_edits(): void
    {
        $admin = $this->admin();
        [$buyer, $product] = $this->buyerAndProduct();
        $voucher = $this->voucher(['code' => 'SNAPSHOT', 'discount_value' => '12.00']);
        $orderResponse = $this->checkout($buyer, $product, 'SNAPSHOT')->assertCreated();
        $orderId = $orderResponse->json('data.id');

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/vouchers/{$voucher->id}")
            ->assertOk()
            ->assertJsonPath('data.voucher.redemptions_count', 1)
            ->assertJsonPath('data.redemptions.data.0.order_id', $orderId)
            ->assertJsonMissingPath('data.redemptions.data.0.buyer')
            ->assertJsonMissingPath('data.redemptions.data.0.email');

        $this->patchJson("/api/admin/vouchers/{$voucher->id}", $this->payload([
            'code' => 'CHANGED',
            'discount_value' => '99.00',
            'is_active' => false,
        ]))->assertOk();

        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'voucher_code' => 'SNAPSHOT',
            'voucher_discount' => '12.00',
            'total_amount' => '13.00',
        ]);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    private function voucher(array $attributes = []): Voucher
    {
        return Voucher::create(array_merge([
            'code' => 'TEST10',
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
        ], $attributes));
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'code' => 'NEWVOUCHER',
            'description' => 'Admin-created voucher',
            'discount_type' => 'fixed',
            'discount_value' => '10.00',
            'minimum_spend' => '0.00',
            'maximum_discount' => null,
            'starts_at' => now()->subDay()->toIso8601String(),
            'expires_at' => now()->addDays(7)->toIso8601String(),
            'usage_limit' => null,
            'per_buyer_limit' => 1,
            'product_ids' => [],
            'categories' => [],
            'is_active' => false,
        ], $overrides);
    }

    private function buyerAndProduct(): array
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Voucher integration product',
            'description' => 'Checkout integration fixture.',
            'price' => '25.00',
            'stock' => 4,
            'category' => 'Pet Supplies',
            'status' => 'active',
        ]);

        return [$buyer, $product];
    }

    private function checkout(User $buyer, Product $product, string $code)
    {
        return $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/orders', [
                ...$this->checkoutPayload($product),
                'voucher_code' => $code,
            ]);
    }

    private function checkoutPayload(Product $product): array
    {
        return [
            'delivery_address' => '123 Voucher Street, Manila',
            'payment_method' => 'cash_on_delivery',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ];
    }
}
