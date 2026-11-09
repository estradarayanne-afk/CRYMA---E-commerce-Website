<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('shipping_zones')) {
            Schema::create('shipping_zones', function (Blueprint $table) {
                $table->id();
                $table->string('name', 80)->unique();
                $table->string('slug', 80)->unique();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('shipping_zone_regions')) {
            Schema::create('shipping_zone_regions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('shipping_zone_id')->constrained()->cascadeOnDelete();
                $table->string('region_name', 160)->unique();
                $table->timestamps();
                $table->index(['shipping_zone_id', 'region_name']);
            });
        }

        if (! Schema::hasTable('shipping_zone_rates')) {
            Schema::create('shipping_zone_rates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('origin_zone_id')->constrained('shipping_zones')->cascadeOnDelete();
                $table->foreignId('destination_zone_id')->constrained('shipping_zones')->cascadeOnDelete();
                $table->string('provider', 80)->default('CRYMA Standard');
                $table->decimal('min_weight_kg', 8, 3)->default(0);
                $table->decimal('max_weight_kg', 8, 3);
                $table->decimal('fee', 12, 2);
                $table->decimal('volumetric_divisor_cm3_per_kg', 12, 2)->nullable();
                $table->boolean('is_provisional')->default(true);
                $table->boolean('is_active')->default(false);
                $table->string('verification_note', 500)->nullable();
                $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();
                $table->unique(
                    ['origin_zone_id', 'destination_zone_id', 'provider', 'min_weight_kg'],
                    'shipping_zone_rates_route_weight_unique'
                );
            });
        }
        if (! Schema::hasIndex('shipping_zone_rates', 'shipping_zone_rates_active_route_idx')) {
            Schema::table('shipping_zone_rates', function (Blueprint $table) {
                $table->index(
                    ['is_active', 'origin_zone_id', 'destination_zone_id'],
                    'shipping_zone_rates_active_route_idx'
                );
            });
        }

        if (! Schema::hasTable('seller_pickup_addresses')) {
            Schema::create('seller_pickup_addresses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
                $table->string('recipient_name', 120);
                $table->string('phone', 24);
                $table->string('region', 160);
                $table->string('province', 160);
                $table->string('municipality', 160);
                $table->string('barangay', 160);
                $table->string('street', 255);
                $table->string('house_number', 80);
                $table->string('building_name', 160)->nullable();
                $table->string('unit_number', 80)->nullable();
                $table->string('postal_code', 16);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('checkout_groups')) {
            Schema::create('checkout_groups', function (Blueprint $table) {
                $table->id();
                $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('address_id')->nullable()->constrained('addresses')->nullOnDelete();
                $table->string('delivery_address', 1000);
                $table->string('payment_method', 40);
                $table->decimal('subtotal', 12, 2)->default(0);
                $table->decimal('shipping_fee', 12, 2)->default(0);
                $table->decimal('voucher_discount', 12, 2)->default(0);
                $table->decimal('shipping_voucher_discount', 12, 2)->default(0);
                $table->decimal('total_amount', 12, 2)->default(0);
                $table->string('voucher_code', 64)->nullable();
                $table->string('shipping_voucher_code', 64)->nullable();
                $table->string('idempotency_key', 36);
                $table->char('request_hash', 64);
                $table->timestamps();
                $table->unique(['buyer_id', 'idempotency_key'], 'checkout_groups_buyer_key_unique');
            });
        }

        if (! Schema::hasColumn('orders', 'checkout_group_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->foreignId('checkout_group_id')->nullable()->after('buyer_id')
                    ->constrained('checkout_groups')->nullOnDelete();
                $table->index('checkout_group_id');
            });
        }

        if (! Schema::hasTable('order_shipping_charges')) {
            Schema::create('order_shipping_charges', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
                $table->foreignId('seller_id')->constrained('users')->restrictOnDelete();
                $table->foreignId('rate_id')->nullable()->constrained('shipping_zone_rates')->nullOnDelete();
                $table->string('provider', 80);
                $table->string('origin_zone', 80);
                $table->string('destination_zone', 80);
                $table->decimal('actual_weight_kg', 10, 3);
                $table->decimal('volumetric_weight_kg', 10, 3)->nullable();
                $table->decimal('billable_weight_kg', 10, 3);
                $table->decimal('fee', 12, 2);
                $table->boolean('is_provisional')->default(false);
                $table->timestamps();
            });
        }

        foreach (['length_cm', 'width_cm', 'height_cm'] as $column) {
            if (! Schema::hasColumn('products', $column)) {
                Schema::table('products', function (Blueprint $table) use ($column) {
                    $table->decimal($column, 8, 2)->nullable();
                });
            }
        }

        foreach (['unit_length_cm', 'unit_width_cm', 'unit_height_cm'] as $column) {
            if (! Schema::hasColumn('order_items', $column)) {
                Schema::table('order_items', function (Blueprint $table) use ($column) {
                    $table->decimal($column, 8, 2)->nullable();
                });
            }
        }

        foreach ([
            ['name' => 'Luzon', 'slug' => 'luzon'],
            ['name' => 'Visayas', 'slug' => 'visayas'],
            ['name' => 'Mindanao', 'slug' => 'mindanao'],
        ] as $zone) {
            DB::table('shipping_zones')->updateOrInsert(
                ['slug' => $zone['slug']],
                [
                    ...$zone,
                    'is_active' => true,
                    'updated_at' => now(),
                ],
            );
        }

        $regionsByZone = [
            'luzon' => [
                'National Capital Region',
                'Cordillera Administrative Region',
                'Ilocos Region',
                'Cagayan Valley',
                'Central Luzon',
                'CALABARZON',
                'MIMAROPA Region',
                'Bicol Region',
            ],
            'visayas' => [
                'Western Visayas',
                'Negros Island Region',
                'Central Visayas',
                'Eastern Visayas',
            ],
            'mindanao' => [
                'Zamboanga Peninsula',
                'Northern Mindanao',
                'Davao Region',
                'SOCCSKSARGEN',
                'Caraga',
                'Bangsamoro Autonomous Region in Muslim Mindanao',
            ],
        ];
        foreach ($regionsByZone as $slug => $regions) {
            $zoneId = DB::table('shipping_zones')->where('slug', $slug)->value('id');
            foreach ($regions as $region) {
                DB::table('shipping_zone_regions')->updateOrInsert(
                    ['region_name' => $region],
                    [
                        'shipping_zone_id' => $zoneId,
                        'updated_at' => now(),
                    ],
                );
            }
        }
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['unit_length_cm', 'unit_width_cm', 'unit_height_cm']);
        });
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['length_cm', 'width_cm', 'height_cm']);
        });

        Schema::dropIfExists('order_shipping_charges');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('checkout_group_id');
        });
        Schema::dropIfExists('checkout_groups');
        Schema::dropIfExists('seller_pickup_addresses');
        Schema::dropIfExists('shipping_zone_rates');
        Schema::dropIfExists('shipping_zone_regions');
        Schema::dropIfExists('shipping_zones');
    }
};
