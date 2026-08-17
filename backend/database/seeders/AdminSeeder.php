<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            [
                'email' => 'admin@example.com',
            ],
            [
                'first_name' => 'System',
                'middle_name' => null,
                'last_name' => 'Administrator',
                'phone' => null,
                'password' => 'Admin12345',
                'role' => 'admin',
                'status' => 'active',
            ]
        );
    }
}