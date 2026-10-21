<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AdminSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->guardEnvironment();

        if (User::where('role', 'admin')->exists()) {
            $this->command?->info('admin: skipped (role account already exists; existing account was not changed).');
            return;
        }
        if (User::whereRaw('LOWER(email) = ?', ['admin@example.com'])->exists()) {
            $this->command?->warn('admin: NEEDS ATTENTION — the legacy seed email belongs to another role.');
            return;
        }

        User::forceCreate([
            'first_name' => 'System',
            'middle_name' => null,
            'last_name' => 'Administrator',
            'email' => 'admin@example.com',
            'phone' => null,
            'password' => Hash::make('Admin12345'),
            'role' => 'admin',
            'status' => 'active',
        ]);
        $this->command?->info('admin: created.');
    }

    private function guardEnvironment(): void
    {
        if (! app()->environment(['local', 'development', 'testing'])) {
            throw new RuntimeException('Test accounts may only be seeded in local, development, or testing environments.');
        }
    }
}
