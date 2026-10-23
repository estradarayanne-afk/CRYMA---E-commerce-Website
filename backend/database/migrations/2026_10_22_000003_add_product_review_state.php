<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            // Existing products stay approved; only new submissions enter review.
            $table->enum('review_status', ['pending', 'approved', 'rejected'])->default('approved')->after('status');
            $table->text('review_reason')->nullable()->after('review_status');
            $table->foreignId('reviewed_by')->nullable()->after('review_reason')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
            $table->index(['review_status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->dropIndex(['review_status', 'created_at']);
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['review_status', 'review_reason', 'reviewed_at']);
        });
    }
};
