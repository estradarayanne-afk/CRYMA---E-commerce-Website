<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hub_transfers', function (Blueprint $table) {
            $table->foreignId('hub_released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('hub_released_hub_id')->nullable()->constrained('logistics_hubs')->nullOnDelete();
            $table->timestamp('hub_released_at')->nullable();
            $table->foreignId('rider_collected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rider_collected_at')->nullable();
            $table->index(['from_hub_id', 'hub_released_at']);
        });
    }

    public function down(): void
    {
        if (DB::table('hub_transfers')->where(function ($query) {
            $query->whereNotNull('hub_released_by')
                ->orWhereNotNull('hub_released_hub_id')
                ->orWhereNotNull('hub_released_at')
                ->orWhereNotNull('rider_collected_by')
                ->orWhereNotNull('rider_collected_at');
        })->exists()) {
            throw new RuntimeException('Hub transfer handoff confirmations exist; this migration cannot be rolled back without losing audit data.');
        }

        Schema::table('hub_transfers', function (Blueprint $table) {
            $table->dropIndex(['from_hub_id', 'hub_released_at']);
            $table->dropConstrainedForeignId('hub_released_by');
            $table->dropConstrainedForeignId('hub_released_hub_id');
            $table->dropColumn('hub_released_at');
            $table->dropConstrainedForeignId('rider_collected_by');
            $table->dropColumn('rider_collected_at');
        });
    }
};
