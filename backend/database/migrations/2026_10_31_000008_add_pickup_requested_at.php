<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pickup_assignments', function (Blueprint $table): void {
            $table->timestamp('requested_at')->nullable()->after('assigned_by');
        });
    }

    public function down(): void
    {
        Schema::table('pickup_assignments', function (Blueprint $table): void {
            $table->dropColumn('requested_at');
        });
    }
};
