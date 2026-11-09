<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('return_shipments', function (Blueprint $table): void {
            $table->foreignId('delivery_id')->nullable()->unique()->after('refund_request_id')->constrained()->cascadeOnDelete();
            $table->string('return_type', 32)->default('refund')->after('delivery_id');
            $table->text('return_reason')->nullable()->after('return_type');
            $table->foreignId('refund_request_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('return_shipments')->whereNull('refund_request_id')->delete();
        Schema::table('return_shipments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('delivery_id');
            $table->dropColumn(['return_type', 'return_reason']);
            $table->foreignId('refund_request_id')->nullable(false)->change();
        });
    }
};
