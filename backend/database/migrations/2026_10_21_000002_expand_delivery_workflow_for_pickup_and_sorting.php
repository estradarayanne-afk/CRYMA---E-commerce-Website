<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_areas', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['is_active', 'name']);
        });

        Schema::create('courier_delivery_areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_area_id')->constrained()->restrictOnDelete();
            $table->foreignId('courier_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['delivery_area_id', 'courier_profile_id'], 'courier_delivery_area_unique');
            $table->index(['courier_profile_id', 'delivery_area_id']);
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->foreignId('delivery_area_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamp('sorted_at')->nullable();
            $table->timestamp('delivery_picked_up_at')->nullable();
            $table->timestamp('buyer_confirmed_at')->nullable();
            $table->foreignId('buyer_confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->index(['delivery_area_id', 'status']);
        });

        Schema::create('pickup_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('delivery_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('courier_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 40);
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();
            $table->index(['courier_profile_id', 'status']);
        });
    }

    public function down(): void
    {
        if ((Schema::hasTable('pickup_assignments') && DB::table('pickup_assignments')->exists())
            || (Schema::hasTable('courier_delivery_areas') && DB::table('courier_delivery_areas')->exists())
            || (Schema::hasTable('delivery_areas') && DB::table('delivery_areas')->exists())) {
            throw new RuntimeException('Logistics assignments and area configuration contain data and cannot be rolled back safely.');
        }

        Schema::dropIfExists('pickup_assignments');
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropIndex(['delivery_area_id', 'status']);
            $table->dropConstrainedForeignId('delivery_area_id');
            $table->dropColumn(['sorted_at', 'delivery_picked_up_at', 'buyer_confirmed_at']);
            $table->dropConstrainedForeignId('buyer_confirmed_by');
        });
        Schema::dropIfExists('courier_delivery_areas');
        Schema::dropIfExists('delivery_areas');
    }
};
