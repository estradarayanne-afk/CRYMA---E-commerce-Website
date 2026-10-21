<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Address;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Product;
use App\Models\Order;
use App\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AccountSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_update_only_their_own_safe_profile_fields(): void
    {
        $seller = User::factory()->create([
            'role' => 'seller',
            'status' => 'active',
            'email' => 'seller-settings@example.com',
        ]);
        $other = User::factory()->create(['email' => 'another-user@example.com']);

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/account/profile', [
                'first_name' => 'María-Joy',
                'last_name' => "D'Santos",
                'phone' => '+639123456789',
                'email' => 'changed@example.com',
                'role' => 'admin',
                'status' => 'suspended',
                'id' => $other->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.first_name', 'María-Joy')
            ->assertJsonPath('data.email', 'seller-settings@example.com')
            ->assertJsonPath('data.role', 'seller')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonMissingPath('data.password');

        $this->assertSame('another-user@example.com', $other->fresh()->email);
    }

    public function test_profile_update_rejects_invalid_name_and_phone_values(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/account/profile', [
                'first_name' => str_repeat('A', 31),
                'phone' => '1234567890',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name', 'phone']);
    }

    public function test_profile_update_rejects_whitespace_names_and_accepts_supported_name_punctuation(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($buyer, 'sanctum')
            ->patchJson('/api/account/profile', [
                'first_name' => " \t ",
                'last_name' => str_repeat('L', 31),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name', 'last_name']);

        $this->patchJson('/api/account/profile', [
            'first_name' => 'Ana María',
            'middle_name' => 'O’Neil',
            'last_name' => 'St. John-Smith',
        ])
            ->assertOk()
            ->assertJsonPath('data.first_name', 'Ana María')
            ->assertJsonPath('data.middle_name', 'O’Neil')
            ->assertJsonPath('data.last_name', 'St. John-Smith');

        $this->assertSame(30, mb_strlen(str_repeat('A', 30)));
        $this->patchJson('/api/account/profile', [
            'first_name' => str_repeat('A', 30),
            'last_name' => str_repeat('B', 30),
            'middle_name' => str_repeat('C', 30),
        ])->assertOk();
    }

    public function test_profile_update_normalizes_only_supported_philippine_mobile_formats(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($buyer, 'sanctum')
            ->patchJson('/api/account/profile', ['phone' => '+63 917-123-4567'])
            ->assertOk()
            ->assertJsonPath('data.phone', '+639171234567');

        $this->patchJson('/api/account/profile', ['phone' => '09171234567'])
            ->assertOk()
            ->assertJsonPath('data.phone', '+639171234567');

        $this->patchJson('/api/account/profile', ['phone' => '08171234567'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_buyer_can_manage_only_their_own_saved_addresses(): void
    {
        $this->fakePhilippineAddressSource();
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $otherBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $otherAddress = Address::create([
            'user_id' => $otherBuyer->id,
            'province' => 'Cebu', 'municipality' => 'Carmen', 'barangay' => 'Poblacion',
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/addresses', $this->validAddressInput())
            ->assertCreated()
            ->assertJsonPath('data.user_id', $buyer->id)
            ->assertJsonPath('data.is_default', true)
            ->assertJsonPath('data.phone', '+639171234567');

        $ownAddress = Address::where('user_id', $buyer->id)->firstOrFail();
        $this->getJson('/api/buyer/addresses')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownAddress->id);
        $this->patchJson("/api/buyer/addresses/{$ownAddress->id}", $this->validAddressInput([
            'barangay' => 'Poblacion',
            'street' => 'Updated Road',
        ]))->assertOk()->assertJsonPath('data.street', 'Updated Road');

        $this->patchJson("/api/buyer/addresses/{$otherAddress->id}", $this->validAddressInput())->assertNotFound();
        $this->patchJson("/api/buyer/addresses/{$otherAddress->id}/default")->assertNotFound();
        $this->deleteJson("/api/buyer/addresses/{$otherAddress->id}")->assertNotFound();

        $this->deleteJson("/api/buyer/addresses/{$ownAddress->id}")->assertOk();
        $this->assertDatabaseMissing('addresses', ['id' => $ownAddress->id]);
        $this->assertDatabaseHas('addresses', ['id' => $otherAddress->id, 'user_id' => $otherBuyer->id]);
    }

    public function test_address_api_requires_complete_valid_locality_fields(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/addresses', [
                'province' => 'Cebu', 'municipality' => '', 'barangay' => 'Poblacion',
                'postal_code' => 'invalid',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['municipality', 'postal_code']);
    }

    public function test_buyer_can_change_default_address_and_deleting_it_promotes_another(): void
    {
        $this->fakePhilippineAddressSource();
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $this->actingAs($buyer, 'sanctum');

        $first = $this->postJson('/api/buyer/addresses', $this->validAddressInput())->assertCreated()->json('data');
        $second = $this->postJson('/api/buyer/addresses', $this->validAddressInput([
            'label' => 'work',
            'street' => 'Office Road',
        ]))->assertCreated()->json('data');

        $this->patchJson("/api/buyer/addresses/{$second['id']}/default")
            ->assertOk()
            ->assertJsonPath('data.is_default', true);
        $this->assertDatabaseHas('addresses', ['id' => $first['id'], 'is_default' => false]);
        $this->assertDatabaseHas('addresses', ['id' => $second['id'], 'is_default' => true]);
        $this->getJson('/api/buyer/checkout-data')
            ->assertOk()
            ->assertJsonPath('data.address.id', $second['id']);

        $this->deleteJson("/api/buyer/addresses/{$second['id']}")->assertOk();
        $this->assertDatabaseHas('addresses', ['id' => $first['id'], 'is_default' => true]);
    }

    public function test_address_api_rejects_invalid_recipient_phone_and_hierarchical_location(): void
    {
        $this->fakePhilippineAddressSource();
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/buyer/addresses', $this->validAddressInput([
                'recipient_name' => " \t ",
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['recipient_name']);

        $this->postJson('/api/buyer/addresses', $this->validAddressInput([
            'phone' => '08171234567',
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone']);

        $this->postJson('/api/buyer/addresses', $this->validAddressInput([
            'province' => 'Bohol',
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['province']);
    }

    public function test_profile_image_is_validated_and_served_only_to_its_owner(): void
    {
        Storage::fake('local');
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $otherBuyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($buyer, 'sanctum')
            ->post('/api/account/profile', [
                '_method' => 'PATCH',
                'first_name' => 'Ciara',
                'profile_image' => UploadedFile::fake()->image('avatar.png', 100, 100),
            ])
            ->assertOk()
            ->assertJsonMissingPath('data.profile_image_path');

        $path = $buyer->fresh()->profile_image_path;
        $this->assertNotEmpty($path);
        Storage::disk('local')->assertExists($path);
        $this->getJson('/api/account/profile-image')->assertOk();

        $this->actingAs($otherBuyer, 'sanctum')
            ->getJson('/api/account/profile-image')
            ->assertNotFound();
    }

    public function test_profile_image_rejects_non_image_uploads(): void
    {
        Storage::fake('local');
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($buyer, 'sanctum')
            ->post('/api/account/profile', [
                '_method' => 'PATCH',
                'profile_image' => UploadedFile::fake()->create('avatar.pdf', 100, 'application/pdf'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['profile_image']);
    }

    public function test_profile_image_rejects_uploads_over_two_megabytes(): void
    {
        Storage::fake('local');
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);

        $this->actingAs($buyer, 'sanctum')
            ->post('/api/account/profile', [
                '_method' => 'PATCH',
                'profile_image' => UploadedFile::fake()->image('avatar.png')->size(2049),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['profile_image']);

        $this->assertNull($buyer->fresh()->profile_image_path);
    }

    public function test_profile_image_rejects_non_image_content_disguised_with_an_image_filename(): void
    {
        Storage::fake('local');
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $tempPath = tempnam(sys_get_temp_dir(), 'cryma-avatar-');
        file_put_contents($tempPath, 'not an image');

        try {
            $this->actingAs($buyer, 'sanctum')
                ->post('/api/account/profile', [
                    '_method' => 'PATCH',
                    'profile_image' => new UploadedFile($tempPath, 'avatar.png', 'image/png', null, true),
                ])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['profile_image']);

            $this->assertNull($buyer->fresh()->profile_image_path);
            Storage::disk('local')->assertDirectoryEmpty('profile-images/'.$buyer->id);
        } finally {
            unlink($tempPath);
        }
    }

    public function test_password_update_rejects_mismatched_confirmation(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
            'password' => Hash::make('old-password'),
        ]);

        $this->actingAs($buyer, 'sanctum')
            ->patchJson('/api/account/password', [
                'current_password' => 'old-password',
                'password' => 'new-password',
                'password_confirmation' => 'different-password',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->assertTrue(Hash::check('old-password', $buyer->fresh()->password));
    }

    public function test_password_update_requires_current_password_and_confirmation(): void
    {
        $seller = User::factory()->create([
            'role' => 'seller',
            'status' => 'active',
            'password' => Hash::make('old-password'),
        ]);

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/account/password', [
                'current_password' => 'incorrect-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertUnprocessable();

        $this->assertTrue(Hash::check('old-password', $seller->fresh()->password));

        $this->patchJson('/api/account/password', [
            'current_password' => 'old-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password', $seller->fresh()->password));
    }

    public function test_password_change_revokes_other_personal_access_tokens(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer', 'status' => 'active', 'password' => Hash::make('old-password'),
        ]);
        $current = $buyer->createToken('current');
        $buyer->createToken('other-session');

        $this->withToken($current->plainTextToken)
            ->patchJson('/api/account/password', [
                'current_password' => 'old-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertOk()
            ->assertJsonMissing(['password' => 'new-password']);

        $this->assertDatabaseHas('personal_access_tokens', ['id' => $current->accessToken->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['name' => 'other-session']);
        $this->assertTrue(Hash::check('new-password', $buyer->fresh()->password));
    }

    public function test_password_reset_revokes_existing_personal_access_tokens(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'status' => 'active',
            'password' => Hash::make('old-password'),
        ]);
        $buyer->createToken('existing-session');
        $resetToken = Password::broker()->createToken($buyer);

        $this->postJson('/api/reset-password', [
            'email' => $buyer->email,
            'token' => $resetToken,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $buyer->id,
        ]);
        $this->assertTrue(Hash::check('new-password', $buyer->fresh()->password));
    }

    public function test_admin_chat_actions_are_limited_to_the_admins_assigned_conversations(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $assignedAdmin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $conversation = Conversation::create([
            'buyer_id' => $buyer->id,
            'admin_id' => $assignedAdmin->id,
        ]);
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $buyer->id,
            'message' => 'Private support request',
            'is_read' => false,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/chat/conversations/{$conversation->id}")
            ->assertNotFound();

        $this->postJson("/api/admin/chat/conversations/{$conversation->id}/messages", [
            'message' => 'Unauthorized reply',
        ])->assertNotFound();

        $this->patchJson("/api/admin/chat/conversations/{$conversation->id}/read")
            ->assertNotFound();

        $this->assertSame(1, Message::where('conversation_id', $conversation->id)->count());
        $this->assertFalse($message->fresh()->is_read);
    }

    public function test_seller_reviews_are_limited_to_products_owned_by_the_authenticated_seller(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $otherSeller = User::factory()->create(['role' => 'seller', 'status' => 'active']);
        $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'active']);
        $order = Order::create(['buyer_id' => $buyer->id, 'status' => 'completed']);
        $ownProduct = Product::create([
            'seller_id' => $seller->id, 'name' => 'Own product', 'price' => 10,
            'stock' => 5, 'category' => 'Home & Garden', 'status' => 'active',
        ]);
        $otherProduct = Product::create([
            'seller_id' => $otherSeller->id, 'name' => 'Other seller product', 'price' => 10,
            'stock' => 5, 'category' => 'Home & Garden', 'status' => 'active',
        ]);
        Review::create([
            'buyer_id' => $buyer->id, 'product_id' => $ownProduct->id,
            'order_id' => $order->id, 'rating' => 5, 'comment' => 'Good product',
        ]);
        Review::create([
            'buyer_id' => $buyer->id, 'product_id' => $otherProduct->id,
            'order_id' => $order->id, 'rating' => 1, 'comment' => 'Private to another seller',
        ]);

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/reviews')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.product.name', 'Own product')
            ->assertJsonPath('summary.review_count', 1)
            ->assertJsonPath('summary.average_rating', 5);

        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/seller/reviews')
            ->assertForbidden();
    }

    private function validAddressInput(array $overrides = []): array
    {
        return array_merge([
            'label' => 'home',
            'recipient_name' => "María-Joy O'Neil",
            'phone' => '0917-123-4567',
            'region' => 'Region VII',
            'province' => 'Cebu',
            'municipality' => 'Carmen',
            'barangay' => 'Luyang',
            'street' => 'Main Road',
            'house_number' => '18-A',
            'building_name' => '',
            'unit_number' => '',
            'postal_code' => '6005',
        ], $overrides);
    }

    private function fakePhilippineAddressSource(): void
    {
        config(['cache.default' => 'array']);
        Cache::store('array')->flush();
        Http::fake([
            'psgc.cloud/api/v2/regions' => Http::response([
                'data' => [['name' => 'Region VII', 'code' => '070000000']],
            ]),
            'psgc.cloud/api/v2/regions/070000000/provinces' => Http::response([
                'data' => [['name' => 'Cebu', 'code' => '072200000']],
            ]),
            'psgc.cloud/api/v2/regions/070000000/provinces/072200000/cities-municipalities' => Http::response([
                'data' => [['name' => 'Carmen', 'code' => '072217000']],
            ]),
            'psgc.cloud/api/v2/regions/070000000/provinces/072200000/cities-municipalities/072217000/barangays' => Http::response([
                'data' => [
                    ['name' => 'Luyang', 'code' => '072217001'],
                    ['name' => 'Poblacion', 'code' => '072217002'],
                ],
            ]),
        ]);
    }
}
