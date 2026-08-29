<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();

            $table->foreignId('courier_profile_id')
                ->constrained('courier_profiles')
                ->cascadeOnDelete();

            $table->enum('vehicle_type', [
                'motorcycle',
                'tricycle',
                'car',
                'van',
                'truck',
            ]);

            $table->string('plate_number')->unique();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};