<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_profiles', function (Blueprint $table) {
            // Encrypted values are longer than the clear text; keep this nullable
            // and use TEXT so registration remains optional and future-proof.
            $table->text('tin')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('seller_profiles', function (Blueprint $table) {
            $table->dropColumn('tin');
        });
    }
};
