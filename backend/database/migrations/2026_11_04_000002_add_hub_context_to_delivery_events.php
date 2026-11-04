<?php

use App\Services\HubDeliveryEventBackfill;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_events', function (Blueprint $table) {
            $table->foreignId('hub_id')->nullable()->after('actor_id')->constrained('logistics_hubs')->nullOnDelete();
            $table->index(['hub_id', 'created_at']);
        });

        $stats = app(HubDeliveryEventBackfill::class)->run();
        Log::info('Hub event history backfill completed.', $stats);
    }

    public function down(): void
    {
        if (DB::table('delivery_events')->whereNotNull('hub_id')->exists()) {
            throw new RuntimeException('Hub activity events exist; this migration cannot be rolled back without losing hub attribution.');
        }

        Schema::table('delivery_events', function (Blueprint $table) {
            $table->dropIndex(['hub_id', 'created_at']);
            $table->dropConstrainedForeignId('hub_id');
        });
    }
};
