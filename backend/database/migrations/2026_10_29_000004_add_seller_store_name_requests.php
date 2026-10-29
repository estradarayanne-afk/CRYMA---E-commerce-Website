<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_profiles', function (Blueprint $table): void {
            $table->string('requested_business_name', 100)->nullable();
            $table->string('business_name_request_status', 16)->nullable()->index();
            $table->timestamp('business_name_requested_at')->nullable();
            $table->timestamp('business_name_reviewed_at')->nullable();
            $table->foreignId('business_name_reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('business_name_request_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('seller_profiles', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('business_name_reviewed_by');
            $table->dropIndex(['business_name_request_status']);
            $table->dropColumn([
                'requested_business_name', 'business_name_request_status',
                'business_name_requested_at', 'business_name_reviewed_at',
                'business_name_request_reason',
            ]);
        });
    }
};