<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'buyer@example.com'],
            [
                'first_name'  => 'Juan',
                'middle_name' => null,
                'last_name'   => 'Dela Cruz',
                'phone'       => '+63 912 345 6789',
                'password'    => 'Buyer12345',
                'role'        => 'buyer',
                'status'      => 'active',
            ]
        );

        User::updateOrCreate(
            ['email' => 'seller@example.com'],
            [
                'first_name'  => 'Maria',
                'middle_name' => null,
                'last_name'   => 'Santos',
                'phone'       => '+63 917 654 3210',
                'password'    => 'Seller12345',
                'role'        => 'seller',
                'status'      => 'active',
            ]
        );
    }
}
