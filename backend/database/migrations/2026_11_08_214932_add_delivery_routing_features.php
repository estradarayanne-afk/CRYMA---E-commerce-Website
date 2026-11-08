<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add delivery_type column to deliveries table
        Schema::table('deliveries', function (Blueprint $table): void {
            $table->enum('delivery_type', ['direct', 'via_sorting_center'])
                ->default('via_sorting_center')
                ->after('status');
        });

        // Add is_online and last_activity_at columns to users table
        Schema::table('users', function (Blueprint $table): void {
            $table->tinyInteger('is_online', false, true)
                ->default(0)
                ->after('remember_token');
            $table->timestamp('last_activity_at')
                ->nullable()
                ->after('is_online');
        });

        // Create delivery_requests table
        Schema::create('delivery_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('delivery_id')
                ->constrained('deliveries')
                ->cascadeOnDelete();
            $table->foreignId('rider_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->enum('status', ['pending', 'accepted', 'rejected', 'expired'])
                ->default('pending');
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')
                ->useCurrent()
                ->useCurrentOnUpdate();

            // Add indexes
            $table->index(['rider_id', 'status']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_requests');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['is_online', 'last_activity_at']);
        });

        Schema::table('deliveries', function (Blueprint $table): void {
            $table->dropColumn('delivery_type');
        });
    }
};
