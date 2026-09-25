<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $seller = User::where('email', 'seller@example.com')
            ->where('role', 'seller')
            ->first();

        if (!$seller) {
            return;
        }

        $products = [
            [
                'name' => 'Wireless Bluetooth Headphones',
                'description' => 'Comfortable wireless headphones for music, calls, and everyday use.',
                'price' => 899,
                'stock' => 25,
                'category' => 'Electronics & Gadgets',
            ],
            [
                'name' => 'Minimalist Canvas Tote Bag',
                'description' => 'Simple and spacious everyday tote bag with a clean minimalist design.',
                'price' => 349,
                'stock' => 40,
                'category' => "Women's Apparel",
            ],
            [
                'name' => 'Classic Oversized T-Shirt',
                'description' => 'Comfortable everyday oversized shirt made for casual styling.',
                'price' => 399,
                'stock' => 35,
                'category' => "Men's Apparel",
            ],
            [
                'name' => 'Portable Mini Desk Fan',
                'description' => 'Compact rechargeable fan that is perfect for your desk or study area.',
                'price' => 599,
                'stock' => 20,
                'category' => 'Home & Garden',
            ],
            [
                'name' => 'Skincare Organizer Box',
                'description' => 'Clear organizer for keeping cosmetics and skincare products neat.',
                'price' => 279,
                'stock' => 30,
                'category' => 'Health & Beauty',
            ],
            [
                'name' => 'Cute Pet Feeding Bowl',
                'description' => 'Durable feeding bowl for cats and small dogs.',
                'price' => 249,
                'stock' => 28,
                'category' => 'Pet Supplies',
            ],
            [
                'name' => 'A5 Study Notebook',
                'description' => 'Clean and practical notebook for school notes, planning, and journaling.',
                'price' => 129,
                'stock' => 60,
                'category' => 'Office & School Supplies',
            ],
            [
                'name' => 'Everyday Stainless Tumbler',
                'description' => 'Reusable insulated tumbler for school, work, and everyday trips.',
                'price' => 449,
                'stock' => 32,
                'category' => 'Home & Garden',
            ],
        ];

        foreach ($products as $product) {
            Product::updateOrCreate(
                [
                    'seller_id' => $seller->id,
                    'name' => $product['name'],
                ],
                [
                    ...$product,
                    'seller_id' => $seller->id,
                    'status' => 'active',
                ]
            );
        }
    }
}