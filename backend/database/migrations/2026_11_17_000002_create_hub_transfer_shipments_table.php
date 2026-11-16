<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hub_transfer_shipments', function (Blueprint $table): void {
            $table->id();
            $table->string('shipment_reference', 64)->unique();
            $table->string('carrier_code', 32)->nullable();
            $table->string('carrier_name', 100)->nullable();
            $table->string('tracking_reference', 120)->nullable();
            $table->foreignId('from_hub_id')->nullable()->constrained('logistics_hubs')->restrictOnDelete();
            $table->foreignId('to_hub_id')->nullable()->constrained('logistics_hubs')->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        $references = DB::table('hub_transfers')
            ->whereNotNull('shipment_reference')
            ->select('shipment_reference')
            ->distinct()
            ->orderBy('shipment_reference')
            ->get();

        foreach ($references as $reference) {
            $transfer = DB::table('hub_transfers')
                ->where('shipment_reference', $reference->shipment_reference)
                ->orderBy('id')
                ->first();

            DB::table('hub_transfer_shipments')->insert([
                'shipment_reference' => $reference->shipment_reference,
                'carrier_code' => $transfer->carrier_code,
                'carrier_name' => $transfer->carrier_name,
                'tracking_reference' => $transfer->tracking_reference,
                'from_hub_id' => $transfer->from_hub_id,
                'to_hub_id' => $transfer->to_hub_id,
                'created_by' => $transfer->assigned_by,
                'created_at' => $transfer->created_at ?? now(),
                'updated_at' => $transfer->updated_at ?? now(),
            ]);
        }
    }

    public function down(): void
    {
        if (DB::table('hub_transfer_shipments')->exists()
            || DB::table('hub_transfers')->whereNotNull('shipment_reference')->exists()) {
            throw new RuntimeException('Hub transfer shipment references cannot be rolled back without removing shipment tracking.');
        }

        Schema::dropIfExists('hub_transfer_shipments');
    }
};
