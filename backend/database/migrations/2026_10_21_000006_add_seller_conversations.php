<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->foreignId('seller_id')->nullable()->after('admin_id')
                ->constrained('users')->nullOnDelete();
            $table->foreignId('product_id')->nullable()->after('seller_id')
                ->constrained('products')->nullOnDelete();
            $table->unique(['buyer_id', 'seller_id'], 'conversations_buyer_seller_unique');
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropUnique('conversations_buyer_seller_unique');
            $table->dropConstrainedForeignId('product_id');
            $table->dropConstrainedForeignId('seller_id');
        });
    }
};
