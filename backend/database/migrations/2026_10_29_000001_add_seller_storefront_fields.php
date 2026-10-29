<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_profiles', function (Blueprint $table) {
            $table->string('store_slug')->nullable()->unique();
            $table->string('store_tagline', 100)->nullable();
            $table->text('store_description')->nullable();
            $table->string('store_accent_color', 7)->default('#7E1830');
            $table->string('store_logo_url', 2048)->nullable();
            $table->string('store_banner_url', 2048)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('seller_profiles', function (Blueprint $table) {
            $table->dropUnique(['store_slug']);
            $table->dropColumn([
                'store_slug', 'store_tagline', 'store_description',
                'store_accent_color', 'store_logo_url', 'store_banner_url',
            ]);
        });
    }
};
