<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logistics_hubs', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 24)->unique();
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        $hubId = DB::table('logistics_hubs')->insertGetId([
            'name' => 'CRYMA Central Hub', 'code' => 'CRYMA-CENTRAL', 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        Schema::table('delivery_areas', function (Blueprint $table) {
            $table->foreignId('hub_id')->nullable()->after('id')->constrained('logistics_hubs')->nullOnDelete();
        });
        DB::table('delivery_areas')->whereNull('hub_id')->update(['hub_id' => $hubId]);
        Schema::table('deliveries', function (Blueprint $table) {
            $table->foreignId('current_hub_id')->nullable()->after('delivery_area_id')->constrained('logistics_hubs')->nullOnDelete();
        });
        DB::table('deliveries')->whereIn('status', ['AT_SORTING_CENTER', 'SORTED'])->update(['current_hub_id' => $hubId]);
        Schema::table('refund_requests', function (Blueprint $table) {
            $table->boolean('return_required')->default(false)->after('approved_amount');
        });
        Schema::create('return_shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('refund_request_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('pickup_courier_profile_id')->nullable()->constrained('courier_profiles')->nullOnDelete();
            $table->foreignId('delivery_courier_profile_id')->nullable()->constrained('courier_profiles')->nullOnDelete();
            $table->foreignId('current_hub_id')->nullable()->constrained('logistics_hubs')->nullOnDelete();
            $table->string('status', 32)->default('awaiting_pickup');
            $table->string('buyer_handover_name', 150)->nullable();
            $table->string('seller_received_name', 150)->nullable();
            $table->string('pickup_photo_path')->nullable();
            $table->string('delivery_photo_path')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
            $table->index(['pickup_courier_profile_id', 'status']);
            $table->index(['delivery_courier_profile_id', 'status']);
        });
        Schema::create('hub_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('return_shipment_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('from_hub_id')->constrained('logistics_hubs')->restrictOnDelete();
            $table->foreignId('to_hub_id')->constrained('logistics_hubs')->restrictOnDelete();
            $table->foreignId('courier_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 24)->default('assigned');
            $table->timestamp('departed_at')->nullable();
            $table->timestamp('arrived_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hub_transfers');
        Schema::dropIfExists('return_shipments');
        Schema::table('refund_requests', fn (Blueprint $table) => $table->dropColumn('return_required'));
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('current_hub_id');
        });
        Schema::table('delivery_areas', fn (Blueprint $table) => $table->dropConstrainedForeignId('hub_id'));
        Schema::dropIfExists('logistics_hubs');
    }
};
