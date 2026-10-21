<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class TestRegistrationSeeder extends Seeder
{
    /**
     * Seed test pending registrations.
     */
    public function run(): void
    {
        $this->guardEnvironment();

        $registrations = [
            'seller' => [
                'first_name' => 'Maria',
                'middle_name' => 'Lopez',
                'last_name' => 'Santos',
                'email' => 'maria.santos@example.com',
                'phone' => '09171234567',
                'password' => Hash::make('password123'),
                'role' => 'seller',
                'status' => 'pending',
            ],
            'buyer' => [
                'first_name' => 'Juan',
                'middle_name' => null,
                'last_name' => 'Dela Cruz',
                'email' => 'juan.delacruz@example.com',
                'phone' => '09181234567',
                'password' => Hash::make('password123'),
                'role' => 'buyer',
                'status' => 'pending',
            ],
            'rider' => [
                'first_name' => 'Angela',
                'middle_name' => 'Reyes',
                'last_name' => 'Garcia',
                'email' => 'angela.garcia@example.com',
                'phone' => '09191234567',
                'password' => Hash::make('password123'),
                'role' => 'rider',
                'status' => 'pending',
            ],
        ];

        foreach ($registrations as $role => $registration) {
            if (User::where('role', $role)->exists()) {
                $this->command?->info("{$role}: skipped (role account already exists; existing account was not changed).");
                continue;
            }
            if (User::whereRaw('LOWER(email) = ?', [strtolower($registration['email'])])->exists()) {
                $this->command?->warn("{$role}: NEEDS ATTENTION — requested pending-registration email belongs to another role.");
                continue;
            }

            User::forceCreate($registration);
            $this->command?->info("{$role}: created as a pending registration test account.");
        }
    }

    private function guardEnvironment(): void
    {
        if (! app()->environment(['local', 'development', 'testing'])) {
            throw new RuntimeException('Test accounts may only be seeded in local, development, or testing environments.');
        }
    }
}
