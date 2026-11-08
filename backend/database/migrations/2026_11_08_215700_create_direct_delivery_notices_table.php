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
        Schema::create('direct_delivery_notices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('delivery_id')
                ->constrained('deliveries')
                ->cascadeOnDelete();
            $table->foreignId('rider_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('recorded_by')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')
                ->useCurrent()
                ->useCurrentOnUpdate();

            // Indexes
            $table->index(['delivery_id', 'rider_id']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('direct_delivery_notices');
    }
};
