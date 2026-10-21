<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('type', 16);
            $table->string('path');
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
            $table->index(['product_id', 'type', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_media');
    }
};
