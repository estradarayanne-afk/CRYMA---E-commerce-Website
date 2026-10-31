<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->string('name')->nullable()->change();
            $table->decimal('price', 12, 2)->nullable()->change();
            $table->string('category')->nullable()->change();
            $table->boolean('is_draft')->default(false)->after('review_status');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn('is_draft');
            $table->string('name')->nullable(false)->change();
            $table->decimal('price', 12, 2)->nullable(false)->change();
            $table->string('category')->nullable(false)->change();
        });
    }
};
