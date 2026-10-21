<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->string('label', 30)->default('other');
            $table->string('recipient_name', 100)->nullable();
            $table->string('phone', 13)->nullable();
            $table->boolean('is_default')->default(false)->index();
        });
    }

    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropIndex(['is_default']);
            $table->dropColumn(['label', 'recipient_name', 'phone', 'is_default']);
        });
    }
};
