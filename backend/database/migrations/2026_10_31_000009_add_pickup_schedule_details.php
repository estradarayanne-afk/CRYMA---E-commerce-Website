<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pickup_assignments', function (Blueprint $table): void {
            $table->text('pickup_address')->nullable()->after('assigned_by');
            $table->timestamp('scheduled_at')->nullable()->after('requested_at');
        });
    }

    public function down(): void
    {
        Schema::table('pickup_assignments', function (Blueprint $table): void {
            $table->dropColumn(['pickup_address', 'scheduled_at']);
        });
    }
};
