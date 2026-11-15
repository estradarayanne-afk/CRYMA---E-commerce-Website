<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pickup_batches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->restrictOnDelete();
            $table->text('pickup_address');
            $table->string('status', 40)->default('PICKUP_REQUESTED');
            $table->foreignId('courier_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('requested_at');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();
            $table->index(['seller_id', 'status']);
            $table->index(['courier_profile_id', 'status']);
        });

        Schema::table('pickup_assignments', function (Blueprint $table): void {
            $table->foreignId('pickup_batch_id')
                ->nullable()
                ->after('id')
                ->constrained('pickup_batches')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        if (DB::table('pickup_assignments')->whereNotNull('pickup_batch_id')->exists()
            || DB::table('pickup_batches')->exists()) {
            throw new RuntimeException('Pickup batches contain data and cannot be rolled back safely.');
        }

        Schema::table('pickup_assignments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('pickup_batch_id');
        });
        Schema::dropIfExists('pickup_batches');
    }
};
