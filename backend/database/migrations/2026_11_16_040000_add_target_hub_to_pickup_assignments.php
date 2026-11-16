<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pickup_assignments', function (Blueprint $table): void {
            $table->foreignId('target_hub_id')
                ->nullable()
                ->after('pickup_batch_id')
                ->constrained('logistics_hubs')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pickup_assignments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('target_hub_id');
        });
    }
};
