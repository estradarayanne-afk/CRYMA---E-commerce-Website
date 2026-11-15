<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArchiveConfirmedSampleProductsTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirmed_no_image_samples_are_archived_without_deleting_them(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $names = [
            'Luna Everyday Tote',
            'Mira Knit Set',
            'Harbor Ceramic Vase',
            'Harbor Ceramic Vase',
            'Mira Knit Set',
            'Luna Everyday Tote',
            'Amber Desk Lamp',
            'Nori Travel Bottle',
            'Sol Linen Shirt',
            'Cove Woven Basket',
            'Mallow Leather Wallet',
            'Aster Wireless Speaker',
            'Pia Ceramic Mug',
            'T-shirt',
        ];

        foreach ($names as $name) {
            $this->createProduct($seller, $name);
        }
        $unrelated = $this->createProduct($seller, 'New seller listing');

        $migration = require database_path(
            'migrations/2026_11_16_013600_archive_confirmed_no_image_sample_products.php'
        );
        $migration->up();

        $this->assertSame(
            14,
            Product::query()->where('status', 'archived')->count()
        );
        $this->assertDatabaseHas('products', [
            'id' => 1,
            'name' => 'Luna Everyday Tote',
            'status' => 'archived',
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $unrelated->id,
            'status' => 'active',
        ]);

        $migration->down();

        $this->assertSame(
            0,
            Product::query()->where('status', 'archived')->count()
        );
    }

    public function test_a_confirmed_sample_with_an_image_is_left_active(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $product = $this->createProduct($seller, 'Luna Everyday Tote');
        ProductMedia::create([
            'product_id' => $product->id,
            'type' => 'image',
            'path' => 'products/1/front.jpg',
            'position' => 0,
        ]);

        $migration = require database_path(
            'migrations/2026_11_16_013600_archive_confirmed_no_image_sample_products.php'
        );
        $migration->up();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'status' => 'active',
            'archived_at' => null,
        ]);
    }

    private function createProduct(User $seller, string $name): Product
    {
        return Product::create([
            'seller_id' => $seller->id,
            'name' => $name,
            'description' => 'Test product',
            'price' => '25.00',
            'stock' => 5,
            'category' => 'Home & Garden',
            'status' => 'active',
            'review_status' => 'approved',
        ]);
    }
}
