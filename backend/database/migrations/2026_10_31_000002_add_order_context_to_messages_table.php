<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->after('sender_type')->constrained()->nullOnDelete();
            $table->string('attachment_path')->nullable()->after('order_id');
            $table->string('attachment_name')->nullable()->after('attachment_path');
            $table->string('attachment_mime', 100)->nullable()->after('attachment_name');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('order_id');
            $table->dropColumn(['attachment_path', 'attachment_name', 'attachment_mime']);
        });
    }
};
