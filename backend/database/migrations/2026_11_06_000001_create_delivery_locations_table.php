<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * GPS location history captured while a courier performs an active delivery.
 * Also caches the latest reading directly on the deliveries row so buyer
 * tracking lookups require no join.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_locations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('delivery_id')
                ->constrained('deliveries')
                ->cascadeOnDelete();
            $table->foreignId('courier_profile_id')
                ->constrained('courier_profiles')
                ->cascadeOnDelete();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->float('accuracy_meters')->nullable()->comment('Device-reported horizontal accuracy in metres.');
            // captured_at is the device timestamp of the GPS reading; created_at
            // is when the server stored it. Offline-queued readings use the former.
            $table->timestamp('captured_at')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['delivery_id', 'captured_at']);
        });

        // Cache the most recent reading on the delivery row for fast buyer lookup.
        Schema::table('deliveries', function (Blueprint $table): void {
            $table->decimal('last_lat', 10, 7)->nullable()->after('delivery_area_id');
            $table->decimal('last_lng', 10, 7)->nullable()->after('last_lat');
            $table->timestamp('last_location_at')->nullable()->after('last_lng');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table): void {
            $table->dropColumn(['last_lat', 'last_lng', 'last_location_at']);
        });
        Schema::dropIfExists('delivery_locations');
    }
};
