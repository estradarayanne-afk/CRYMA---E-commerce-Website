<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'development', 'testing'])) {
            throw new RuntimeException('Development seed data may only be loaded in local, development, or testing environments.');
        }

        $this->call([
            AdminSeeder::class,
            UserSeeder::class,
            ProductSeeder::class,
        ]);
    }
}
