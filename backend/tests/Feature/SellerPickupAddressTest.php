<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerPickupAddressTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_load_regions_available_for_pickup_addresses(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);

        $response = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/pickup-address')
            ->assertOk()
            ->assertJsonCount(18, 'data.regions');

        $this->assertContains('National Capital Region', $response->json('data.regions'));
    }

    public function test_seller_can_save_a_pickup_address_for_a_region_without_provinces(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'status' => 'active']);

        $this->actingAs($seller, 'sanctum')
            ->putJson('/api/seller/pickup-address', [
                'recipient_name' => 'Seller Contact',
                'phone' => '09171234567',
                'region' => 'National Capital Region',
                'province' => null,
                'municipality' => 'Manila',
                'barangay' => 'Barangay 1',
                'street' => 'Rizal Street',
                'house_number' => '12',
                'building_name' => null,
                'unit_number' => null,
                'postal_code' => '1000',
            ])
            ->assertOk()
            ->assertJsonPath('data.province', null);

        $this->assertDatabaseHas('seller_pickup_addresses', [
            'user_id' => $seller->id,
            'province' => null,
        ]);
    }
}
