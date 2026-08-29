<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("
            ALTER TABLE products
            MODIFY status ENUM(
                'active',
                'inactive',
                'out_of_stock',
                'archived'
            ) NOT NULL DEFAULT 'inactive'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("
            ALTER TABLE products
            MODIFY status ENUM(
                'active',
                'inactive',
                'out_of_stock'
            ) NOT NULL DEFAULT 'inactive'
        ");
    }
};