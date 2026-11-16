<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_conversation_messages', function (Blueprint $table) {
            $table->foreignId('delivery_proof_id')
                ->nullable()
                ->constrained('delivery_proofs')
                ->nullOnDelete();
            $table->unique(
                ['delivery_conversation_id', 'delivery_proof_id'],
                'delivery_conversation_messages_proof_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::table('delivery_conversation_messages', function (Blueprint $table) {
            $table->dropUnique('delivery_conversation_messages_proof_unique');
            $table->dropConstrainedForeignId('delivery_proof_id');
        });
    }
};
