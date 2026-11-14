<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('logistics_hubs', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('proximity_radius_km', 5, 2)->default(2.00);
        });

        Schema::create('courier_presences', function (Blueprint $table) {
            $table->foreignId('courier_profile_id')->primary()->constrained()->cascadeOnDelete();
            $table->boolean('is_available')->default(false);
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('accuracy_meters', 8, 2)->nullable();
            $table->timestamp('location_updated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courier_presences');

        Schema::table('logistics_hubs', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'proximity_radius_km']);
        });
    }
};
