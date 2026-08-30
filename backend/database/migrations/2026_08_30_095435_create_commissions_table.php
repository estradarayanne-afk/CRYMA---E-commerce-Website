<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commissions', function (Blueprint $table) {
            $table->id();

            // Related order
            $table->foreignId('order_id')
                ->constrained('orders')
                ->cascadeOnDelete();

            // Seller who generated the commission
            $table->foreignId('seller_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // Commission calculation
            $table->decimal('order_amount', 12, 2);
            $table->decimal('commission_rate', 5, 2)->default(10.00);
            $table->decimal('commission_amount', 12, 2);
            $table->decimal('seller_earnings', 12, 2);

            // Commission status
            $table->string('status')->default('pending');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commissions');
    }
};