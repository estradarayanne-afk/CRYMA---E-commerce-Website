<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('sku', 64)->nullable()->after('name');
            $table->decimal('discounted_price', 12, 2)->nullable()->after('price');
            $table->unique(['seller_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['seller_id', 'sku']);
            $table->dropColumn(['sku', 'discounted_price']);
        });
    }
};
