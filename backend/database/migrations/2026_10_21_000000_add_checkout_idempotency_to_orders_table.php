<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('checkout_idempotency_key', 36)->nullable();
            $table->char('checkout_request_hash', 64)->nullable();
            $table->unique(
                ['buyer_id', 'checkout_idempotency_key'],
                'orders_buyer_checkout_key_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_buyer_checkout_key_unique');
            $table->dropColumn([
                'checkout_idempotency_key',
                'checkout_request_hash',
            ]);
        });
    }
};
