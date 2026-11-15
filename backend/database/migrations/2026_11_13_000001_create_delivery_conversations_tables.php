<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32);
            $table->string('thread_key', 160)->unique();
            $table->foreignId('buyer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('seller_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('courier_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['type', 'buyer_id']);
            $table->index(['type', 'seller_id']);
        });

        Schema::create('delivery_conversation_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_conversation_id')
                ->constrained('delivery_conversations')
                ->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('message', 2000);
            $table->uuid('client_message_id')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();
            $table->unique(
                ['sender_id', 'client_message_id'],
                'delivery_conversation_messages_sender_request_unique'
            );
            $table->index(['delivery_conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_conversation_messages');
        Schema::dropIfExists('delivery_conversations');
    }
};
