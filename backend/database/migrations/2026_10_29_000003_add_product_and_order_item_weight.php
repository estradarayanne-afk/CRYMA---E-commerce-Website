<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->decimal('weight_kg', 10, 3)->nullable()->after('discounted_price');
        });

        Schema::table('order_items', function (Blueprint $table): void {
            $table->decimal('unit_weight_kg', 10, 3)->nullable()->after('subtotal');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table): void {
            $table->dropColumn('unit_weight_kg');
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn('weight_kg');
        });
    }
};