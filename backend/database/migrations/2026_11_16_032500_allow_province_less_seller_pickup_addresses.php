<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_pickup_addresses', function (Blueprint $table): void {
            $table->string('province', 160)->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('seller_pickup_addresses')
            ->whereNull('province')
            ->update(['province' => '']);

        Schema::table('seller_pickup_addresses', function (Blueprint $table): void {
            $table->string('province', 160)->nullable(false)->change();
        });
    }
};
