<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $this->guardEnvironment();

        $accounts = [
            'buyer' => [
                'email' => 'buyer@example.com',
                'first_name'  => 'Juan',
                'middle_name' => null,
                'last_name'   => 'Dela Cruz',
                'phone'       => '+63 912 345 6789',
                'password'    => 'Buyer12345',
                'status'      => 'active',
            ],
            'seller' => [
                'email' => 'seller@example.com',
                'first_name'  => 'Maria',
                'middle_name' => null,
                'last_name'   => 'Santos',
                'phone'       => '+63 917 654 3210',
                'password'    => 'Seller12345',
                'status'      => 'active',
            ],
        ];

        foreach ($accounts as $role => $account) {
            if (User::where('role', $role)->exists()) {
                $this->command?->info("{$role}: skipped (role account already exists; existing account was not changed).");
                continue;
            }
            if (User::whereRaw('LOWER(email) = ?', [strtolower($account['email'])])->exists()) {
                $this->command?->warn("{$role}: NEEDS ATTENTION — the legacy seed email belongs to another role.");
                continue;
            }

            User::forceCreate([
                ...$account,
                'password' => Hash::make($account['password']),
                'role' => $role,
            ]);
            $this->command?->info("{$role}: created.");
        }
    }

    private function guardEnvironment(): void
    {
        if (! app()->environment(['local', 'development', 'testing'])) {
            throw new RuntimeException('Test accounts may only be seeded in local, development, or testing environments.');
        }
    }
}
