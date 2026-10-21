<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'seller', 'buyer', 'rider', 'logistics'])->change();
        });

        Schema::create('logistics_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->enum('sex', ['male', 'female', 'prefer_not_to_say']);
            $table->date('birthday');
            $table->string('business_name', 100);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        if (DB::table('users')->where('role', 'logistics')->exists()
            || DB::table('logistics_profiles')->exists()) {
            throw new RuntimeException('Logistics accounts exist; the logistics role cannot be removed safely.');
        }

        Schema::dropIfExists('logistics_profiles');

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'seller', 'buyer', 'rider'])->change();
        });
    }
};
