<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_documents', function (Blueprint $table): void {
            $table->string('correction_token_hash', 64)->nullable()->index();
            $table->timestamp('correction_token_expires_at')->nullable();
            $table->foreignId('replaces_document_id')->nullable()->constrained('user_documents')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('user_documents', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('replaces_document_id');
            $table->dropIndex(['correction_token_hash']);
            $table->dropColumn(['correction_token_hash', 'correction_token_expires_at']);
        });
    }
};
