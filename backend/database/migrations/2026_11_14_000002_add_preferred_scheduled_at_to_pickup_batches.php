<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pickup_batches', function (Blueprint $table): void {
            $table->timestamp('preferred_scheduled_at')->nullable()->after('requested_at');
        });
    }

    public function down(): void
    {
        Schema::table('pickup_batches', function (Blueprint $table): void {
            $table->dropColumn('preferred_scheduled_at');
        });
    }
};
