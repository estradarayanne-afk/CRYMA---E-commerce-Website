<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\SellerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SellerProductInventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_create_a_complete_product_with_photos_video_and_discounted_price(): void
    {
        Storage::fake('public');
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);

        $response = $this->actingAs($seller, 'sanctum')->post('/api/seller/products', [
            'name' => 'Linen Summer Dress',
            'sku' => 'DRESS-LINEN-01',
            'category' => 'Women\'s Apparel',
            'description' => 'A lightweight linen dress.',
            'price' => '1200.00',
            'discounted_price' => '999.00',
            'stock' => '8',
            'status' => 'active',
            'images' => [
                $this->fakeImage('front.png'),
                $this->fakeImage('back.png'),
            ],
            'videos' => [
                UploadedFile::fake()->create('details.mp4', 128, 'video/mp4'),
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.sku', 'DRESS-LINEN-01')
            ->assertJsonPath('data.discounted_price', '999.00')
            ->assertJsonCount(3, 'data.media');

        $product = Product::with('media')->firstOrFail();
        $this->assertSame(2, $product->media->where('type', 'image')->count());
        $this->assertSame(1, $product->media->where('type', 'video')->count());
        $this->assertSame(
            '/storage/'.$product->media->first()->path,
            $product->media->first()->url
        );
        foreach ($product->media as $media) {
            Storage::disk('public')->assertExists($media->path);
        }

        $product->update(['review_status' => 'approved']);
        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.price', '999.00')
            ->assertJsonPath('data.original_price', '1200.00')
            ->assertJsonCount(2, 'data.images')
            ->assertJsonCount(1, 'data.videos');
    }

    public function test_seller_cannot_save_a_discount_equal_to_or_above_regular_price(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/products', [
                'name' => 'Invalid sale',
                'sku' => 'SALE-01',
                'category' => 'Pet Supplies',
                'price' => '20.00',
                'discounted_price' => '20.00',
                'stock' => 1,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['discounted_price']);

        $this->assertDatabaseCount('products', 0);
    }

    public function test_seller_can_create_color_size_variants_with_individual_prices_and_stock(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        SellerProfile::create([
            'user_id' => $seller->id,
            'sex' => 'prefer_not_to_say',
            'birthday' => '1990-01-01',
            'business_name' => 'The Variant Shop',
            'line_of_business' => 'Apparel',
        ]);
        $redMediumId = 'c4dece55-a7a5-4c44-a5e5-55504c469067';
        $blueLargeId = '9b82222b-5d8c-412a-851f-02318cb7bde8';

        Storage::fake('public');
        $response = $this->actingAs($seller, 'sanctum')
            ->post('/api/seller/products', [
                'name' => 'Variant shirt',
                'category' => "Men's Apparel",
                'price' => '100.00',
                'stock' => 5,
                'variants' => json_encode([
                    [
                        'id' => $redMediumId,
                        'color' => 'Red',
                        'size' => 'M',
                        'price' => '100.00',
                        'discounted_price' => '90.00',
                        'stock' => 2,
                    ],
                    [
                        'id' => $blueLargeId,
                        'color' => 'Blue',
                        'size' => 'L',
                        'price' => '120.00',
                        'discounted_price' => null,
                        'stock' => 3,
                    ],
                ]),
                'color_photo_colors' => ['Red', 'Blue'],
                'color_photos' => [
                    $this->fakeImage('red.png'),
                    $this->fakeImage('blue.png'),
                ],
            ]);
        $response->assertCreated()
            ->assertJsonPath('data.stock', 5)
            ->assertJsonCount(2, 'data.variants');

        $product = Product::firstOrFail();
        $response->assertJsonPath(
            'data.variants.0.color_image_url',
            '/storage/'.$product->variants[0]['image']
        );
        foreach (collect($product->variants)->pluck('image') as $path) {
            Storage::disk('public')->assertExists($path);
        }
        $product->update(['status' => 'active', 'review_status' => 'approved']);
        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.price', '90.00')
            ->assertJsonPath('data.price_from_variants', true)
            ->assertJsonPath('data.variants.0.id', $redMediumId)
            ->assertJsonPath('data.variants.0.discounted_price', '90.00')
            ->assertJsonPath('data.seller.seller_profile.business_name', 'The Variant Shop')
            ->assertJsonPath(
                'data.variants.0.color_image_url',
                '/storage/'.$product->variants[0]['image']
            );
    }

    public function test_color_variants_require_a_photo_for_every_color(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/products', [
                'name' => 'Variant shirt',
                'category' => "Men's Apparel",
                'price' => '100.00',
                'stock' => 2,
                'variants' => [
                    ['color' => 'Red', 'size' => 'M', 'price' => '100.00', 'stock' => 2],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['color_photos']);

        $this->assertDatabaseCount('products', 0);
    }

    public function test_seller_can_keep_or_replace_color_photos_when_updating_variants(): void
    {
        Storage::fake('public');
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $product = $this->createProduct($seller);
        $redPhoto = $this->fakeImage('red.png')->storePublicly(
            "products/{$product->id}/variants",
            'public'
        );
        $bluePhoto = $this->fakeImage('blue.png')->storePublicly(
            "products/{$product->id}/variants",
            'public'
        );
        $product->update([
            'variants' => [
                ['id' => 'c4dece55-a7a5-4c44-a5e5-55504c469067', 'color' => 'Red', 'size' => 'M', 'price' => '100.00', 'discounted_price' => null, 'stock' => 2, 'image' => $redPhoto],
                ['id' => '9b82222b-5d8c-412a-851f-02318cb7bde8', 'color' => 'Blue', 'size' => 'L', 'price' => '120.00', 'discounted_price' => null, 'stock' => 3, 'image' => $bluePhoto],
            ],
            'stock' => 5,
        ]);

        $response = $this->actingAs($seller, 'sanctum')->post("/api/seller/products/{$product->id}", [
            '_method' => 'PATCH',
            'variants' => json_encode([
                ['id' => 'c4dece55-a7a5-4c44-a5e5-55504c469067', 'color' => 'Red', 'size' => 'M', 'price' => '100.00', 'discounted_price' => '', 'stock' => 2],
                ['id' => '9b82222b-5d8c-412a-851f-02318cb7bde8', 'color' => 'Blue', 'size' => 'L', 'price' => '120.00', 'discounted_price' => '', 'stock' => 3],
            ]),
            'color_photo_colors' => ['Red'],
            'color_photos' => [$this->fakeImage('red-replacement.png')],
        ]);
        $response->assertOk();

        $updatedVariants = $product->fresh()->variants;
        $this->assertNotSame($redPhoto, $updatedVariants[0]['image']);
        $this->assertSame($bluePhoto, $updatedVariants[1]['image']);
        Storage::disk('public')->assertMissing($redPhoto);
        Storage::disk('public')->assertExists($updatedVariants[0]['image']);
        Storage::disk('public')->assertExists($bluePhoto);
    }

    public function test_seller_cannot_create_duplicate_variant_combinations(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $variants = [
            ['color' => 'Navy', 'size' => 'M', 'price' => '20.00', 'stock' => 2],
            ['color' => ' navy ', 'size' => 'm', 'price' => '21.00', 'stock' => 1],
        ];

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/products', [
                'name' => 'Duplicate variants',
                'category' => 'Pet Supplies',
                'price' => '20.00',
                'stock' => 3,
                'variants' => $variants,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variants.1.color']);

        $this->assertDatabaseCount('products', 0);
    }

    public function test_seller_can_replace_selected_media_without_removing_retained_media(): void
    {
        Storage::fake('public');
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $product = $this->createProduct($seller);
        $kept = $product->media()->create([
            'type' => 'image',
            'path' => $this->fakeImage('kept.png')->storePublicly("products/{$product->id}", 'public'),
            'position' => 1,
        ]);
        $removed = $product->media()->create([
            'type' => 'image',
            'path' => $this->fakeImage('removed.png')->storePublicly("products/{$product->id}", 'public'),
            'position' => 2,
        ]);

        $this->actingAs($seller, 'sanctum')->post("/api/seller/products/{$product->id}", [
            '_method' => 'PATCH',
            'name' => $product->name,
            'category' => $product->category,
            'description' => $product->description,
            'price' => $product->price,
            'discounted_price' => '',
            'stock' => $product->stock,
            'status' => 'active',
            'replace_media' => '1',
            'keep_media_ids' => [(string) $kept->id],
            'images' => [$this->fakeImage('new.png')],
        ])->assertOk();

        $this->assertDatabaseHas('product_media', ['id' => $kept->id]);
        $this->assertDatabaseMissing('product_media', ['id' => $removed->id]);
        Storage::disk('public')->assertExists($kept->path);
        Storage::disk('public')->assertMissing($removed->path);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'discounted_price' => null]);
    }

    public function test_media_upload_size_is_limited_to_1536_kilobytes_per_file(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);

        $this->actingAs($seller, 'sanctum')
            ->post('/api/seller/products', [
                'name' => 'Oversized demo video',
                'category' => 'Electronics & Gadgets',
                'price' => '120.00',
                'stock' => 1,
                'videos' => [UploadedFile::fake()->create('demo.mp4', 1537, 'video/mp4')],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['videos.0']);

        $this->assertDatabaseCount('products', 0);
    }

    public function test_edit_cannot_exceed_the_photo_limit_when_adding_more_media(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $product = $this->createProduct($seller);
        $media = collect(range(1, 8))->map(fn ($position) => $product->media()->create([
            'type' => 'image',
            'path' => "products/{$product->id}/photo-{$position}.jpg",
            'position' => $position,
        ]));

        $this->actingAs($seller, 'sanctum')
            ->post("/api/seller/products/{$product->id}", [
                '_method' => 'PATCH',
                'name' => $product->name,
                'category' => $product->category,
                'price' => $product->price,
                'stock' => $product->stock,
                'replace_media' => '1',
                'keep_media_ids' => $media->pluck('id')->map(fn ($id) => (string) $id)->all(),
                'images' => [$this->fakeImage('extra.png')],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['images']);

        $this->assertDatabaseCount('product_media', 8);
    }

    public function test_sku_must_be_unique_within_the_sellers_store(): void
    {
        $firstSeller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $secondSeller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $this->createProduct($firstSeller, ['sku' => 'SHARED-SKU']);

        $this->actingAs($firstSeller, 'sanctum')
            ->postJson('/api/seller/products', [
                'name' => 'Duplicate in same store',
                'sku' => 'SHARED-SKU',
                'category' => 'Pet Supplies',
                'price' => '10.00',
                'stock' => 1,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sku']);

        $this->actingAs($secondSeller, 'sanctum')
            ->postJson('/api/seller/products', [
                'name' => 'Same code in another store',
                'sku' => 'SHARED-SKU',
                'category' => 'Pet Supplies',
                'price' => '10.00',
                'stock' => 1,
            ])
            ->assertCreated();
    }

    public function test_seller_product_list_honors_the_requested_page_size(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        for ($index = 0; $index < 12; $index++) {
            $this->createProduct($seller, ['name' => "Product {$index}"]);
        }

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/products?per_page=100')
            ->assertOk()
            ->assertJsonPath('data.per_page', 100)
            ->assertJsonCount(12, 'data.data');
    }

    private function createProduct(User $seller, array $overrides = []): Product
    {
        return Product::create(array_merge([
            'seller_id' => $seller->id,
            'name' => 'Inventory fixture',
            'sku' => null,
            'description' => 'Fixture',
            'price' => '25.00',
            'discounted_price' => null,
            'stock' => 5,
            'category' => 'Pet Supplies',
            'status' => 'active',
        ], $overrides));
    }

    private function fakeImage(string $name): UploadedFile
    {
        $content = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
            true
        );
        $this->assertNotFalse($content);

        return UploadedFile::fake()->createWithContent($name, $content);
    }
}
