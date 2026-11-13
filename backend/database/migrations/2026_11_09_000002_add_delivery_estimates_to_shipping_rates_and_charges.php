<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_zone_rates', function (Blueprint $table) {
            $table->unsignedTinyInteger('min_delivery_days')->default(3)->after('fee');
            $table->unsignedTinyInteger('max_delivery_days')->default(7)->after('min_delivery_days');
        });

        Schema::table('order_shipping_charges', function (Blueprint $table) {
            $table->unsignedTinyInteger('min_delivery_days')->nullable()->after('fee');
            $table->unsignedTinyInteger('max_delivery_days')->nullable()->after('min_delivery_days');
        });
    }

    public function down(): void
    {
        Schema::table('order_shipping_charges', function (Blueprint $table) {
            $table->dropColumn(['min_delivery_days', 'max_delivery_days']);
        });

        Schema::table('shipping_zone_rates', function (Blueprint $table) {
            $table->dropColumn(['min_delivery_days', 'max_delivery_days']);
        });
    }
};
