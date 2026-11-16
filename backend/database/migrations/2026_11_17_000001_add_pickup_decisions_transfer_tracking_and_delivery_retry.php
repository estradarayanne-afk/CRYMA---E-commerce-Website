<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pickup_assignment_decisions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('pickup_assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('decided_by')->constrained('users')->restrictOnDelete();
            $table->string('decision', 16);
            $table->text('reason')->nullable();
            $table->timestamp('decided_at');
            $table->timestamps();
            $table->index(['pickup_assignment_id', 'decided_at']);
        });

        Schema::table('deliveries', function (Blueprint $table): void {
            $table->timestamp('next_delivery_attempt_at')->nullable();
        });

        Schema::table('hub_transfers', function (Blueprint $table): void {
            $table->string('transport_mode', 24)->default('rider');
            $table->string('carrier_code', 32)->nullable();
            $table->string('carrier_name', 100)->nullable();
            $table->string('tracking_reference', 120)->nullable();
            $table->string('shipment_reference', 64)->nullable()->index();
        });
    }

    public function down(): void
    {
        if (DB::table('pickup_assignment_decisions')->exists()
            || DB::table('deliveries')->whereNotNull('next_delivery_attempt_at')->exists()
            || DB::table('hub_transfers')->where('transport_mode', '!=', 'rider')->exists()) {
            throw new RuntimeException('Pickup decisions, delivery retry schedules, or third-party transfer records cannot be rolled back safely.');
        }

        Schema::table('hub_transfers', function (Blueprint $table): void {
            $table->dropIndex(['shipment_reference']);
            $table->dropColumn(['transport_mode', 'carrier_code', 'carrier_name', 'tracking_reference', 'shipment_reference']);
        });
        Schema::table('deliveries', function (Blueprint $table): void {
            $table->dropColumn('next_delivery_attempt_at');
        });
        Schema::dropIfExists('pickup_assignment_decisions');
    }
};
