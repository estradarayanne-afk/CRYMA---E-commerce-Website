<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('account_archived_at')->nullable();
        });

        Schema::create('account_email_releases', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->restrictOnDelete();
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('original_email', 254);
            $table->char('email_fingerprint', 64);
            $table->string('reason_code', 40);
            $table->timestamp('released_at');
            $table->timestamps();
            $table->index('released_at');
        });
    }

    public function down(): void
    {
        throw new \RuntimeException('Account email release audit data is retained; this migration is intentionally irreversible.');
    }
};
