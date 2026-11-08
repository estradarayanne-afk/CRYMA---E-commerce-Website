<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('vouchers', 'scope')) {
            Schema::table('vouchers', function (Blueprint $table) {
                $table->string('scope', 16)->default('product')->after('seller_id')->index();
            });
        }

        if (! Schema::hasColumn('orders', 'shipping_voucher_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->foreignId('shipping_voucher_id')->nullable()->after('voucher_discount')->constrained('vouchers')->nullOnDelete();
            });
        }
        if (! Schema::hasColumn('orders', 'shipping_voucher_code')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('shipping_voucher_code', 64)->nullable()->after('shipping_voucher_id');
            });
        }
        if (! Schema::hasColumn('orders', 'shipping_voucher_discount')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->decimal('shipping_voucher_discount', 12, 2)->default(0)->after('shipping_voucher_code');
            });
        }

        if (! Schema::hasIndex('voucher_redemptions', 'voucher_redemptions_order_voucher_unique')) {
            Schema::table('voucher_redemptions', function (Blueprint $table) {
                $table->unique(['order_id', 'voucher_id'], 'voucher_redemptions_order_voucher_unique');
            });
        }
        if (Schema::hasIndex('voucher_redemptions', 'voucher_redemptions_order_id_unique')) {
            Schema::table('voucher_redemptions', function (Blueprint $table) {
                $table->dropUnique('voucher_redemptions_order_id_unique');
            });
        }

        if (! Schema::hasTable('shipping_rates')) {
            Schema::create('shipping_rates', function (Blueprint $table) {
                $table->id();
                $table->string('region', 120);
                $table->string('province', 120);
                $table->decimal('fee', 12, 2);
                $table->boolean('is_active')->default(false);
                $table->timestamps();
                $table->unique(['region', 'province'], 'shipping_rates_destination_unique');
                $table->index(['is_active', 'region', 'province']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_rates');

        Schema::table('voucher_redemptions', function (Blueprint $table) {
            $table->dropUnique('voucher_redemptions_order_voucher_unique');
            $table->unique('order_id', 'voucher_redemptions_order_id_unique');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('shipping_voucher_id');
            $table->dropColumn(['shipping_voucher_code', 'shipping_voucher_discount']);
        });

        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropIndex(['scope']);
            $table->dropColumn('scope');
        });
    }
};
