<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stores mobile push notification tokens (FCM / APNs).
 * One user may have multiple devices/tokens; stale tokens are upserted on each
 * app launch and pruned when the device logs out.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_tokens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('token')->unique();
            $table->string('platform', 10)->default('android'); // android | ios
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_tokens');
    }
};
