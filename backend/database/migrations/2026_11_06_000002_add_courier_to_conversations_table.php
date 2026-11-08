<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extends the conversations table to support buyer↔courier delivery chat.
 *
 * A delivery conversation is keyed on (buyer_id, courier_profile_id, delivery_id).
 * The existing buyer↔seller and buyer↔admin conversation flows are untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table): void {
            // The courier party (nullable so existing conversations are unaffected).
            $table->foreignId('courier_profile_id')
                ->nullable()
                ->after('seller_id')
                ->constrained('courier_profiles')
                ->nullOnDelete();

            // The delivery this conversation is about (nullable for legacy rows).
            $table->foreignId('delivery_id')
                ->nullable()
                ->after('courier_profile_id')
                ->constrained('deliveries')
                ->nullOnDelete();

            // Conversation type discriminator. Existing rows default to 'support'.
            // Values: 'support' | 'seller' | 'courier'
            $table->string('type', 20)->default('support')->after('delivery_id');

            // One active delivery-chat conversation per (buyer + delivery).
            $table->unique(
                ['buyer_id', 'delivery_id'],
                'conversations_buyer_delivery_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table): void {
            $table->dropUnique('conversations_buyer_delivery_unique');
            $table->dropConstrainedForeignId('delivery_id');
            $table->dropConstrainedForeignId('courier_profile_id');
            $table->dropColumn('type');
        });
    }
};
