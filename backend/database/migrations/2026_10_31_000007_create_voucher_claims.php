<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voucher_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voucher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['voucher_id', 'buyer_id']);
            $table->index(['buyer_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_claims');
    }
};
