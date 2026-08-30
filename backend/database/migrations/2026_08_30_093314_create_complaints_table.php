<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();

            // Person who submitted the complaint
            $table->foreignId('complainant_id')
                ->constrained('users')
                ->cascadeOnDelete();

            // Person being complained about
            $table->foreignId('respondent_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Related order
            $table->foreignId('order_id')
                ->nullable();

            // Complaint information
            $table->string('category');
            $table->string('subject');
            $table->text('description');

            // Supporting evidence
            $table->string('evidence_path')->nullable();

            // Case status
            $table->enum('status', [
                'pending',
                'under_review',
                'resolved',
                'dismissed',
            ])->default('pending');

            // Admin's notes/resolution
            $table->text('admin_notes')->nullable();

            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};