<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->foreignId('seller_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->index(['seller_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropIndex(['seller_id', 'is_active']);
            $table->dropConstrainedForeignId('seller_id');
        });
    }
};
