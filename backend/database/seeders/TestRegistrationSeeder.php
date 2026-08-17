<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestRegistrationSeeder extends Seeder
{
    /**
     * Seed test pending registrations.
     */
    public function run(): void
    {
        $registrations = [
            [
                'first_name' => 'Maria',
                'middle_name' => 'Lopez',
                'last_name' => 'Santos',
                'email' => 'maria.santos@example.com',
                'phone' => '09171234567',
                'password' => Hash::make('password123'),
                'role' => 'seller',
                'status' => 'pending',
            ],
            [
                'first_name' => 'Juan',
                'middle_name' => null,
                'last_name' => 'Dela Cruz',
                'email' => 'juan.delacruz@example.com',
                'phone' => '09181234567',
                'password' => Hash::make('password123'),
                'role' => 'buyer',
                'status' => 'pending',
            ],
            [
                'first_name' => 'Angela',
                'middle_name' => 'Reyes',
                'last_name' => 'Garcia',
                'email' => 'angela.garcia@example.com',
                'phone' => '09191234567',
                'password' => Hash::make('password123'),
                'role' => 'rider',
                'status' => 'pending',
            ],
            [
                'first_name' => 'Sofia',
                'middle_name' => 'Anne',
                'last_name' => 'Rivera',
                'email' => 'sofia.rivera@example.com',
                'phone' => '09201234567',
                'password' => Hash::make('password123'),
                'role' => 'seller',
                'status' => 'pending',
            ],
        ];

        foreach ($registrations as $registration) {
            User::updateOrCreate(
                [
                    'email' => $registration['email'],
                ],
                $registration
            );
        }

        $this->command->info(
            'Test pending registrations created successfully.'
        );
    }
}