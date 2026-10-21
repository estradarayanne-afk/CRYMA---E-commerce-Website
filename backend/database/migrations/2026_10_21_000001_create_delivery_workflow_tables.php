<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            // Keep an order with parcel history from being silently deleted.
            $table->foreignId('order_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('courier_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 32);
            $table->boolean('legacy_imported')->default(false);
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamps();
            $table->index(['courier_profile_id', 'status']);
            $table->index(['status', 'legacy_imported']);
        });

        Schema::create('delivery_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event_type', 32);
            $table->string('previous_status', 32)->nullable();
            $table->string('new_status', 32);
            $table->foreignId('previous_courier_profile_id')->nullable()->constrained('courier_profiles')->nullOnDelete();
            $table->foreignId('courier_profile_id')->nullable()->constrained('courier_profiles')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['delivery_id', 'created_at']);
        });

        // Preserve old order statuses and make their lack of assignment/history explicit.
        DB::table('orders')
            ->whereIn('status', [
                'PICKED_UP', 'AT_SORTING_CENTER', 'SORTED', 'ASSIGNED_TO_RIDER',
                'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'DELIVERY_FAILED', 'RETURNED',
            ])
            ->orderBy('id')
            ->chunkById(100, function ($orders): void {
                foreach ($orders as $order) {
                    // Use import time; updated_at is not a delivery-event timestamp.
                    $timestamp = now();
                    $deliveryId = DB::table('deliveries')->insertGetId([
                        'order_id' => $order->id,
                        'courier_profile_id' => null,
                        'assigned_by' => null,
                        'status' => $order->status,
                        'legacy_imported' => true,
                        'assigned_at' => null,
                        'picked_up_at' => null,
                        'delivered_at' => null,
                        'failure_reason' => null,
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);

                    DB::table('delivery_events')->insert([
                        'delivery_id' => $deliveryId,
                        'actor_id' => null,
                        'event_type' => 'legacy_import',
                        'previous_status' => null,
                        'new_status' => $order->status,
                        'previous_courier_profile_id' => null,
                        'courier_profile_id' => null,
                        'reason' => 'Imported legacy order status. No courier assignment or event actor was recorded.',
                        'created_at' => $timestamp,
                    ]);
                }
            });
    }

    public function down(): void
    {
        if (Schema::hasTable('deliveries') && DB::table('deliveries')->exists()) {
            throw new RuntimeException('Delivery assignments and event history are retained; this migration cannot be rolled back after data has been written.');
        }

        Schema::dropIfExists('delivery_events');
        Schema::dropIfExists('deliveries');
    }
};
