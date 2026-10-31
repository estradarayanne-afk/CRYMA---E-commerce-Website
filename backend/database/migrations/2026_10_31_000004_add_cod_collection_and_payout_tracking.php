<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cod_collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('courier_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('remitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('expected_amount', 12, 2);
            $table->decimal('collected_amount', 12, 2)->nullable();
            $table->string('status', 24)->default('awaiting_collection');
            $table->timestamp('collected_at')->nullable();
            $table->timestamp('remitted_at')->nullable();
            $table->string('remittance_reference', 120)->nullable();
            $table->text('remittance_note')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['courier_profile_id', 'status']);
        });

        Schema::table('commissions', function (Blueprint $table) {
            $table->string('payout_method', 32)->nullable()->after('status');
            $table->string('payout_reference', 120)->nullable()->after('payout_method');
            $table->foreignId('paid_by')->nullable()->after('payout_reference')->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable()->after('paid_by');
            $table->decimal('payout_amount', 12, 2)->nullable()->after('paid_at');
            $table->unique('order_id');
        });
    }

    public function down(): void
    {
        Schema::table('commissions', function (Blueprint $table) {
            $table->dropUnique(['order_id']);
            $table->dropConstrainedForeignId('paid_by');
            $table->dropColumn(['payout_method', 'payout_reference', 'paid_at', 'payout_amount']);
        });
        Schema::dropIfExists('cod_collections');
    }
};
