<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\SellerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerVacationModeTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_toggle_vacation_mode_without_losing_storefront_settings(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $profile = SellerProfile::create([
            'user_id' => $seller->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
            'business_name' => 'Vacation Test Store',
            'line_of_business' => 'Test goods',
            'storefront_settings' => ['hero_title' => 'Welcome', 'categories' => ['Pet Supplies']],
        ]);

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/seller/storefront/vacation-mode', ['on_vacation' => true])
            ->assertOk()
            ->assertJsonPath('data.on_vacation', true)
            ->assertJsonPath('data.settings.hero_title', 'Welcome')
            ->assertJsonPath('data.settings.categories.0', 'Pet Supplies');

        $this->assertTrue((bool) $profile->fresh()->storefront_settings['on_vacation']);

        $this->patchJson('/api/seller/storefront/vacation-mode', ['on_vacation' => false])
            ->assertOk()
            ->assertJsonPath('data.on_vacation', false);
        $this->assertFalse((bool) $profile->fresh()->storefront_settings['on_vacation']);
    }

    public function test_checkout_is_rejected_without_creating_order_when_seller_is_on_vacation(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        SellerProfile::create([
            'user_id' => $seller->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
            'business_name' => 'Away Store',
            'line_of_business' => 'Test goods',
            'storefront_settings' => ['on_vacation' => true],
        ]);
        $product = Product::create([
            'seller_id' => $seller->id,
            'name' => 'Visible vacation product',
            'price' => '25.00',
            'stock' => 5,
            'category' => 'Pet Supplies',
            'status' => 'active',
            'review_status' => 'approved',
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->withHeader('Idempotency-Key', '4eb0b7a5-4433-4a21-aad7-14ff3acd1214')
            ->postJson('/api/orders', [
                'delivery_address' => '123 Example Street, Barangay Sample, Manila',
                'payment_method' => 'cash_on_delivery',
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Away Store is on vacation and is not accepting orders. Please remove this item and try again when the seller returns.');

        $this->assertSame(0, Order::count());
        $this->assertSame(5, $product->fresh()->stock);
    }
}
